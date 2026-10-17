import { DataSource } from 'typeorm';
import dataSource from '../../../db/data-source-cli';
import { PushResultadoCartao } from '../resultado-cartao/push-resultado-cartao.entity';
import { PushRecalculoAnulacao } from './push-recalculo-anulacao.entity';
import { PushRecalculoAnulacaoRepository } from './push-recalculo-anulacao.repository';

/**
 * tickets/042, card 17 — o `registrar` contra um MySQL de verdade (o banco
 * descartável da regra de migration). Opt-in: `RODAR_COM_MYSQL=1` com o
 * `test/.env.test` carregado (`npx dotenv -e ./test/.env.test -- …`).
 */
const descrever =
  process.env.RODAR_COM_MYSQL === '1' ? describe : describe.skip;

descrever('registrar push do recálculo — MySQL real', () => {
  let ds: DataSource;
  let repo: PushRecalculoAnulacaoRepository;
  const H = (i: number) =>
    `65ecc850a528b39d273e${String(7000 + i).padStart(4, '0')}`;
  const pedido = (jobId: string, n: number, simuladoIds = ['s1']) => ({
    jobId,
    provaNome: 'Simulado 3',
    simuladoIds,
    numerosAnulados: [45],
    afetados: Array.from({ length: n }, (_, i) => ({
      usuario: `aluno-${i}`,
      historicoId: H(i),
    })),
  });

  beforeAll(async () => {
    dataSource.setOptions({ synchronize: false });
    ds = await dataSource.initialize();
    repo = new PushRecalculoAnulacaoRepository(ds.manager);
  }, 60000);
  afterAll(async () => {
    await ds.query('DELETE FROM push_recalculo_anulacao');
    await ds.query('DELETE FROM push_resultado_cartao');
    await ds.destroy();
  });
  beforeEach(() => ds.query('DELETE FROM push_recalculo_anulacao'));

  const total = () => ds.getRepository(PushRecalculoAnulacao).count();

  it('132 regravados → 132 pushes; o retry do mesmo job não duplica', async () => {
    expect(
      await ds.transaction((m) =>
        repo.registrar(m, pedido('65ecc850a528b39d273e0001', 132)),
      ),
    ).toBe(132);
    await ds.transaction((m) =>
      repo.registrar(m, pedido('65ecc850a528b39d273e0001', 132)),
    );
    expect(await total()).toBe(132);
  });

  it('⚠️ dois recálculos da mesma prova no mesmo dia → um push por aluno; outra prova → outro', async () => {
    await ds.transaction((m) =>
      repo.registrar(m, pedido('65ecc850a528b39d273e0002', 3)),
    );
    expect(
      await ds.transaction((m) =>
        repo.registrar(m, pedido('65ecc850a528b39d273e0003', 3)),
      ),
    ).toBe(0);
    expect(
      await ds.transaction((m) =>
        repo.registrar(m, pedido('65ecc850a528b39d273e0004', 3, ['s2'])),
      ),
    ).toBe(3);
    // Passado o dia, volta a avisar.
    const amanha = new Date(Date.now() + 25 * 3600_000);
    expect(
      await ds.transaction((m) =>
        repo.registrar(m, pedido('65ecc850a528b39d273e0005', 3), amanha),
      ),
    ).toBe(3);
  });

  it('⚠️ quem já recebeu o push do RESULTADO deste histórico (028) recebe o de nota atualizada', async () => {
    await ds.getRepository(PushResultadoCartao).insert({
      historicoId: H(0),
      userId: 'aluno-0',
      simulado: 'Simulado 3',
      total: 90,
      acertos: 50,
      erros: 40,
      emBranco: 0,
      aproveitamento: 56,
      proximaTentativaEm: new Date(),
    } as never);
    expect(
      await ds.transaction((m) =>
        repo.registrar(m, pedido('65ecc850a528b39d273e0006', 1)),
      ),
    ).toBe(1);
  });

  it('o envio calmo enxerga a fila nova (vencidos, reserva única)', async () => {
    await ds.transaction((m) =>
      repo.registrar(m, pedido('65ecc850a528b39d273e0007', 2)),
    );
    const lote = await repo.pendentesVencidos(20, new Date(Date.now() + 1000));
    expect(lote).toHaveLength(2);
    expect(await repo.reservar(lote[0].id)).toBe(true);
    expect(await repo.reservar(lote[0].id)).toBe(false);
    await repo.marcarEnviado(lote[0].id);
    expect(
      (await ds
        .getRepository(PushRecalculoAnulacao)
        .findOneBy({ id: lote[0].id }))!.status,
    ).toBe('enviado');
  });
});
