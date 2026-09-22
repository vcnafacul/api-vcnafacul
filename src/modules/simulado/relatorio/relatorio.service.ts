import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { StudentCourse } from 'src/modules/prepCourse/studentCourse/student-course.entity';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { DetalheDoEstudanteDtoOutput } from './dtos/detalhe-do-estudante.dto.output';
import { QuestoesDoRelatorioDtoOutput } from './dtos/questoes-do-relatorio.dto.output';
import {
  LinhaDoRelatorioDtoOutput,
  MateriaDoEstudanteDtoOutput,
  MediaPorMateriaDtoOutput,
  RelatorioDtoOutput,
} from './dtos/relatorio.dto.output';
import { SimuladosComCartaoDtoOutput } from './dtos/simulados-com-cartao.dto.output';
import { RelatorioHttpService } from './relatorio-http.service';

interface LinhaDoMs {
  usuario: string;
  historicoId?: string;
  status?: string;
  cartaoCode?: string;
  questoesRespondidas?: number;
  aproveitamentoGeral?: number;
  acertos?: number;
  aproveitamentoPorMateria?: MateriaDoEstudanteDtoOutput[];
  falha?: Record<string, unknown>;
}

/**
 * A nota da turma em cada matéria, com a base de cada uma.
 *
 * ⚠️ **O denominador é por matéria, e não `comLeituraConcluida`.** Quem não
 * teve questão de Química lida no cartão não tem Química no `materias[]`:
 * somar tudo e dividir pelo total de estudantes faria a turma parecer pior em
 * QUALQUER área que alguém não respondeu — e o coordenador mandaria reforçar a
 * matéria errada.
 *
 * ⚠️ **A `base` sai junto, sempre.** "42% em Química" sobre 3 alunos é
 * verdadeiro e inútil sem o "de 3". Mesmo princípio do `indiceDeDificuldade`
 * da aba de questões, que já faz o certo.
 *
 * ⚠️ Ordena por nome, e não pela ordem de chegada: duas turmas com as mesmas
 * matérias precisam desenhar o gráfico na mesma ordem, senão comparar duas
 * telas lado a lado vira quebra-cabeça.
 *
 * ⚠️ Devolve `undefined`, nunca `[]` — ver o docblock do campo no DTO.
 */
function mediaPorMateria(
  linhas: LinhaDoRelatorioDtoOutput[],
): MediaPorMateriaDtoOutput[] | undefined {
  const acc = new Map<string, { nome: string; soma: number; base: number }>();

  for (const linha of linhas) {
    for (const materia of linha.aproveitamentoPorMateria ?? []) {
      const atual = acc.get(materia.id) ?? {
        nome: materia.nome,
        soma: 0,
        base: 0,
      };
      atual.soma += materia.aproveitamento;
      atual.base += 1;
      acc.set(materia.id, atual);
    }
  }

  if (acc.size === 0) return undefined;

  return Array.from(acc, ([id, m]) => ({
    id,
    nome: m.nome,
    media: m.soma / m.base,
    base: m.base,
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

@Injectable()
export class RelatorioService {
  constructor(
    private readonly http: RelatorioHttpService,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly classRepository: ClassRepository,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

  async consultar(
    colaboradorUserId: string,
    simuladoId: string,
    turmaId?: string,
  ): Promise<RelatorioDtoOutput> {
    const { cursinhoId, turmaNome } = await this.resolverEscopoComNome(
      colaboradorUserId,
      turmaId,
    );

    /*
      ⚠️ **Os estudantes vêm PRIMEIRO, e o ms é consultado com a lista deles.**

      Antes as duas consultas iam em paralelo e cada lado tinha uma noção
      diferente de turma: o MySQL sabia a ATUAL, e o ms filtrava por um
      `turmaId` gravado na junção no momento do upload, que nunca é atualizado.
      Quem entrou na turma depois de enviar o cartão vinha do MySQL (aparecia na
      lista) mas era filtrado fora no ms — e a linha saía com
      `enviouCartao: false`. A tela AFIRMAVA que a pessoa não enviou. Card 18.

      O custo é uma consulta em série em vez de paralela; o ganho é as duas
      metades falarem da mesma turma.
    */
    const estudantes =
      await this.studentCourseRepository.findEnrolledForRelatorio(
        cursinhoId,
        turmaId,
      );

    /*
      ⚠️ `undefined` sem recorte de turma, e NÃO a lista completa: o relatório
      do cursinho inteiro pede tudo, e mandar centenas de ids só para dizer
      "todos" faria o corpo crescer sem necessidade. Com turma, a lista é o
      recorte — e se ela estiver vazia, não há o que perguntar ao ms.
    */
    const usuariosDoRecorte =
      turmaId === undefined ? undefined : estudantes.map((e) => e.userId);

    const doMs =
      usuariosDoRecorte !== undefined && usuariosDoRecorte.length === 0
        ? {
            linhas: [],
            totalEstudantesComCartaoNoCursinho: 0,
            totalDeQuestoes: 0,
            /*
              ⚠️ Turma sem ninguém matriculado não chega a perguntar ao ms — é
              a guarda que evita mandar `[]` e receber 400 —, então não há nome
              para trazer.

              ⚠️ **`null` aqui NÃO significa "simulado removido"**, e a tela tem
              de distinguir os dois: com `totalNoRecorte === 0` ela mostra o
              vazio, sem cabeçalho de identificação nenhum. Tratar este `null`
              como remoção faria a tela afirmar que o simulado sumiu quando o
              que está vazio é a turma.
            */
            simuladoNome: null,
            ultimoCartaoEm: null,
          }
        : ((await this.http.buscarLinhas(
            simuladoId,
            cursinhoId,
            usuariosDoRecorte,
          )) as {
            linhas: LinhaDoMs[];
            totalEstudantesComCartaoNoCursinho: number;
            totalDeQuestoes: number;
            simuladoNome: string | null;
            ultimoCartaoEm: string | null;
          });

    const porUsuario = new Map(doMs.linhas.map((l) => [l.usuario, l]));
    const usuariosAtivos = new Set(estudantes.map((e) => e.userId));

    // A lista parte dos ESTUDANTES: quem não enviou some se partir das linhas,
    // e saber quem falta é metade do valor do relatório para quem coordena.
    const linhas = estudantes.map((e) =>
      this.montarLinha(e, porUsuario.get(e.userId)),
    );

    // ⚠️ Gate no STATUS, não só na presença da nota. O `marcarFalha` do ms não
    // limpa `aproveitamento`, então um cartão que leu bem e depois falhou no
    // reprocessamento continua carregando a nota velha. A aba de questões
    // filtra por `status: completed` no ms — inferir pela nota aqui faria as
    // duas metades da mesma tela discordarem.
    //
    // Literal, não enum: `HistoricoStatus` vive só no repo do ms-simulado,
    // que não é importável daqui (repositório separado).
    const comLeitura = linhas.filter(
      (l) =>
        l.status === 'completed' && typeof l.aproveitamentoGeral === 'number',
    );

    return {
      linhas,
      resumo: {
        totalNoRecorte: linhas.length,
        comLeituraConcluida: comLeitura.length,
        // null, não zero: zero é uma nota, ausência de leitura não é
        aproveitamentoGeral: comLeitura.length
          ? comLeitura.reduce((s, l) => s + l.aproveitamentoGeral!, 0) /
            comLeitura.length
          : null,
        aproveitamentoPorMateria: mediaPorMateria(comLeitura),
        totalEstudantesComCartaoNoCursinho:
          doMs.totalEstudantesComCartaoNoCursinho,
        /*
          ⚠️ **Fica no resumo, e não em cada linha**: é propriedade do
          SIMULADO, não do estudante — repeti-lo em 500 linhas seria dizer 500
          vezes a mesma coisa e abriria a porta para duas discordarem.

          ⚠️ `?? 0` para o ms antigo: sem o card 08 do outro lado o campo chega
          `undefined`, e a tela mostra só o percentual em vez de "61/undefined".
        */
        totalDeQuestoes: doMs.totalDeQuestoes ?? 0,
        // ⚠️ Repassados do ms — `null` quando o simulado foi apagado.
        simuladoNome: doMs.simuladoNome ?? null,
        ultimoCartaoEm: doMs.ultimoCartaoEm ?? null,
        /*
          ⚠️ **O nome da TURMA só a api sabe** — o ms guarda o `turmaId` na
          junção mas não conhece o MySQL. Vem do mesmo objeto que o 403 já
          busca, sem consulta nova.

          ⚠️ `null` no relatório do cursinho inteiro, e a tela usa isso para
          não escrever um recorte que não existe.
        */
        turmaNome,
        // quem saiu do cursinho depois de enviar: contado, nunca listado
        linhasSemEstudanteAtivo: doMs.linhas.filter(
          (l) => !usuariosAtivos.has(l.usuario),
        ).length,
      },
    };
  }

  /**
   * O agregado por questão não tem dado de estudante — mas o RECORTE tem.
   *
   * ⚠️ **Deixou de ser proxy puro** (card 18): o ms não pode mais resolver a
   * turma sozinho, porque o `turmaId` da junção é foto do upload. Quem sabe
   * quem está na turma hoje é o MySQL, aqui.
   */
  async consultarQuestoes(
    colaboradorUserId: string,
    simuladoId: string,
    turmaId?: string,
  ): Promise<QuestoesDoRelatorioDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);
    const usuarios = await this.usuariosDoRecorte(cursinhoId, turmaId);

    // turma sem ninguém: não há o que agregar, e mandar `[]` ao ms é recusado
    if (usuarios !== undefined && usuarios.length === 0) {
      return { questoes: [] } as QuestoesDoRelatorioDtoOutput;
    }

    return this.http.buscarQuestoes(
      simuladoId,
      cursinhoId,
      usuarios,
    ) as Promise<QuestoesDoRelatorioDtoOutput>;
  }

  /**
   * Os `userId` do recorte, ou `undefined` para o cursinho inteiro.
   *
   * ⚠️ A lista é a turma **ATUAL**, lida do MySQL a cada consulta. É esta
   * releitura que corrige o card 18 — nenhum valor é guardado em lugar nenhum
   * para envelhecer.
   */
  private async usuariosDoRecorte(
    cursinhoId: string,
    turmaId?: string,
  ): Promise<string[] | undefined> {
    if (turmaId === undefined) return undefined;
    const estudantes =
      await this.studentCourseRepository.findEnrolledForRelatorio(
        cursinhoId,
        turmaId,
      );
    return estudantes.map((e) => e.userId);
  }

  /**
   * Proxy puro: nenhuma hidratação. Esta rota devolve simulados, não pessoas,
   * então o MySQL não entra. O `resolverEscopo` é o MESMO do relatório — é
   * ele que resolve o cursinho pelo JWT e recusa turma de outro cursinho.
   */
  async listarSimulados(
    colaboradorUserId: string,
    turmaId?: string,
  ): Promise<SimuladosComCartaoDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);
    const usuarios = await this.usuariosDoRecorte(cursinhoId, turmaId);

    // turma sem ninguém matriculado: nenhum simulado tem cartão dela
    if (usuarios !== undefined && usuarios.length === 0) {
      return { simulados: [] } as SimuladosComCartaoDtoOutput;
    }

    return this.http.buscarSimulados(
      cursinhoId,
      usuarios,
    ) as Promise<SimuladosComCartaoDtoOutput>;
  }

  /**
   * Proxy puro. O `resolverEscopo` é o MESMO do relatório — sem turma, porque
   * o estudante já é identificado e o `cursinhoId` do JWT é o gate.
   *
   * O nome do estudante não é buscado aqui: a tela que abre o detalhe já o tem
   * na linha que foi clicada, e o MySQL repetiria o que está em mãos.
   */
  async consultarDetalhe(
    colaboradorUserId: string,
    simuladoId: string,
    userId: string,
  ): Promise<DetalheDoEstudanteDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId);
    return this.http.buscarDetalheDoEstudante(
      simuladoId,
      userId,
      cursinhoId,
    ) as Promise<DetalheDoEstudanteDtoOutput>;
  }

  /**
   * O cursinho vem SEMPRE do JWT, nunca da URL.
   *
   * ⚠️ O 403 da turma não é contra vazamento — a consulta de estudantes já é
   * escopada no cursinho, então aluno de fora nunca volta. É honestidade: sem
   * ele, pedir uma turma que não é sua devolve lista **vazia**, indistinguível
   * de "turma sua, ninguém matriculado".
   */
  private async resolverEscopo(
    colaboradorUserId: string,
    turmaId?: string,
  ): Promise<string> {
    const { cursinhoId } = await this.resolverEscopoComNome(
      colaboradorUserId,
      turmaId,
    );
    return cursinhoId;
  }

  /**
   * Igual ao `resolverEscopo`, e devolve também o NOME da turma.
   *
   * ⚠️ **Sem consulta nova**: a turma já é buscada aqui para o 403, e o nome
   * vem no mesmo objeto. O card 18 precisa dele para o cabeçalho dizer qual é o
   * recorte — hoje a única pista de que `?turma=` está ativo é a coluna `Turma`
   * **desaparecer**, um sinal por ausência que ninguém lê.
   */
  private async resolverEscopoComNome(
    colaboradorUserId: string,
    turmaId?: string,
  ): Promise<{ cursinhoId: string; turmaNome: string | null }> {
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    if (turmaId === undefined) return { cursinhoId, turmaNome: null };

    const turma = await this.classRepository.findOneByIdWithPartner(turmaId);
    if (!turma || turma.partnerPrepCourse?.id !== cursinhoId) {
      throw new ForbiddenException('turma não pertence ao seu cursinho');
    }

    return { cursinhoId, turmaNome: turma.name ?? null };
  }

  private montarLinha(
    e: StudentCourse,
    doMs?: LinhaDoMs,
  ): LinhaDoRelatorioDtoOutput {
    const u = e.user;
    const nome =
      u?.useSocialName && u?.socialName
        ? u.socialName
        : `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();

    return {
      usuario: e.userId,
      nome,
      matricula: e.cod_enrolled,
      turmaId: e.class?.id ?? null,
      turmaNome: e.class?.name ?? null,
      enviouCartao: doMs !== undefined,
      historicoId: doMs?.historicoId,
      status: doMs?.status,
      cartaoCode: doMs?.cartaoCode,
      questoesRespondidas: doMs?.questoesRespondidas,
      aproveitamentoGeral: doMs?.aproveitamentoGeral,
      // ⚠️ Repassado, nunca recalculado — o ms conta; a api não refaz nota.
      acertos: doMs?.acertos,
      // ⚠️ Repassado cru, nunca recalculado: o ms é a fonte da nota — ver o
      // docblock do campo no DTO.
      aproveitamentoPorMateria: doMs?.aproveitamentoPorMateria,
      falha: doMs?.falha,
    };
  }
}
