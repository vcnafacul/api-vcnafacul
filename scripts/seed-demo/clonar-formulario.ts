import { MongoClient, ObjectId } from 'mongodb';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Lê o formulário GLOBAL ativo (e, se pedido, o de um cursinho) de outro Mongo e escreve um JSON
 * sem ids (por padrão `fixtures/formulario.json`). Só leitura: nenhum insert/update/delete/índice.
 *
 *   yarn seed-demo:clonar-formulario --origem '<uri>' [--parceiro <ownerId>] [--saida <arquivo>]
 *
 * As `conditions` das perguntas trocam `questionId` pelo texto da pergunta-alvo (`questionText`),
 * porque os ids não sobrevivem ao seed; a etapa 04 resolve de volta para o novo ObjectId.
 */
function arg(args: string[], nome: string): string | undefined {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
}

type Doc = Record<string, any>;

async function main() {
  const args = process.argv.slice(2);
  const origem = arg(args, '--origem');
  if (!origem) throw new Error('--origem <uri> é obrigatório');
  const parceiroId = arg(args, '--parceiro');
  const saida =
    arg(args, '--saida') ?? join(__dirname, 'fixtures', 'formulario.json');

  const cliente = await new MongoClient(origem, {
    readPreference: 'secondaryPreferred',
  }).connect();
  try {
    const db = cliente.db();
    console.log('Banco:', db.databaseName);
    const colecoes = (await db.listCollections().toArray())
      .map((c) => c.name)
      .sort();
    console.log('Coleções na origem:', colecoes.join(', '));

    // Como ownerType/active/deleted estão gravados (só diagnóstico)
    const resumo = await db
      .collection('forms')
      .aggregate([
        {
          $group: {
            _id: {
              ownerType: '$ownerType',
              active: '$active',
              deleted: '$deleted',
            },
            n: { $sum: 1 },
          },
        },
        { $sort: { n: -1 } },
      ])
      .toArray();
    console.log(
      'forms por ownerType/active/deleted:',
      JSON.stringify(resumo.map((r) => ({ ...r._id, n: r.n }))),
    );

    const textoPorId = new Map<string, string>();
    const textoDe = async (id: string): Promise<string | null> => {
      if (textoPorId.has(id)) return textoPorId.get(id)!;
      if (!ObjectId.isValid(id)) return null;
      const q = await db
        .collection('questions')
        .findOne({ _id: new ObjectId(id) }, { projection: { text: 1 } });
      if (q) textoPorId.set(id, q.text);
      return q?.text ?? null;
    };
    const converterCondicoes = async (c: Doc | null | undefined) => {
      if (!c || !Array.isArray(c.conditions)) return null;
      return {
        logic: c.logic,
        conditions: await Promise.all(
          c.conditions.map(async ({ questionId, ...resto }: Doc) => ({
            questionText:
              (await textoDe(String(questionId))) ?? `?? ${questionId}`,
            ...resto,
          })),
        ),
      };
    };

    const ler = async (filtro: object) => {
      const form = await db
        .collection('forms')
        .findOne(
          { ...filtro, active: true, deleted: { $ne: true } },
          { sort: { updatedAt: -1 } },
        );
      if (!form) return null;
      const idsSecoes: unknown[] = form.sections ?? [];
      const secoes = await db
        .collection('sections')
        .find({ _id: { $in: idsSecoes as ObjectId[] }, deleted: { $ne: true } })
        .toArray();
      const ordem = (id: unknown) =>
        idsSecoes.findIndex((s) => String(s) === String(id));
      secoes.sort((a, b) => ordem(a._id) - ordem(b._id));

      const perguntasPorSecao = await Promise.all(
        secoes.map(async (s) => {
          const ids: unknown[] = s.questions ?? [];
          const qs = await db
            .collection('questions')
            .find({ _id: { $in: ids as ObjectId[] }, deleted: { $ne: true } })
            .toArray();
          const pos = (id: unknown) =>
            ids.findIndex((q) => String(q) === String(id));
          qs.sort((a, b) => pos(a._id) - pos(b._id));
          for (const q of qs) textoPorId.set(String(q._id), q.text);
          return qs;
        }),
      );

      return {
        name: form.name,
        sections: await Promise.all(
          secoes.map(async (s, i) => ({
            name: s.name,
            description: s.description ?? '',
            active: s.active !== false,
            questions: await Promise.all(
              perguntasPorSecao[i]
                .filter((q) => q.active !== false)
                .map(async (q) => ({
                  text: q.text,
                  helpText: q.helpText ?? '',
                  answerType: q.answerType,
                  collection: q.collection ?? 'single',
                  options: q.options ?? [],
                  conditions: await converterCondicoes(q.conditions),
                })),
            ),
          })),
        ),
      };
    };

    const global = await ler({ ownerType: 'GLOBAL' });
    const parceiro = parceiroId
      ? await ler({ ownerType: 'PARTNER', ownerId: parceiroId })
      : null;
    mkdirSync(dirname(saida), { recursive: true });
    writeFileSync(
      saida,
      JSON.stringify(
        { global, parceiro, regras: [], respostaBase: {}, variacoes: {} },
        null,
        2,
      ) + '\n',
    );
    const n = (f: typeof global) =>
      f?.sections.reduce((t, s) => t + s.questions.length, 0) ?? 0;
    console.log(
      `✔ ${saida} escrito (global: ${n(global)} perguntas, parceiro: ${n(parceiro)}). Revise à mão.`,
    );
  } finally {
    await cliente.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
