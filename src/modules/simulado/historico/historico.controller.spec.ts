import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { HistoricoController } from './historico.controller';

const montar = () => {
  const service = {
    getById: jest.fn(),
    getAllByUser: jest.fn(),
    getPerformance: jest.fn(),
  };
  return { ctrl: new HistoricoController(service as any), service };
};

const req = (id: string) => ({ user: { id } }) as never;

describe('HistoricoController.getById', () => {
  it('⚠️ o dono vem do JWT, nunca de parâmetro', async () => {
    // Antes deste card o `req.user` nem era injetado: qualquer usuário
    // autenticado lia o histórico de qualquer outro pelo id.
    const { ctrl, service } = montar();

    await ctrl.getById('h1', req('u-dono'));

    expect(service.getById).toHaveBeenCalledWith('h1', 'u-dono');
  });

  it('⚠️ nada do caminho consegue trocar o dono', async () => {
    // um id que tenta se passar por outra coisa não muda o segundo argumento
    const { ctrl, service } = montar();

    await ctrl.getById('h1?usuario=alheio', req('u-dono'));

    expect(service.getById).toHaveBeenCalledWith('h1?usuario=alheio', 'u-dono');
  });
});

describe('HistoricoController — o JwtAuthGuard está em CADA rota', () => {
  // ⚠️ Este bloco existe porque tirar `@UseGuards(JwtAuthGuard)` de `summary`
  // reverte a §5 deste card em silêncio: os três agregados voltam a ser
  // públicos e a suíte continua verde. O mesmo vale para o `getById`, cujo
  // gate de dono só vale alguma coisa se houver JWT de onde tirar o dono.
  //
  // A metadata de `@UseGuards` é gravada por HANDLER (chave `__guards__`), do
  // mesmo jeito que o `relatorio.controller.spec.ts` afere a permissão — e,
  // como lá, um guard no nível da CLASSE não apareceria aqui.
  it.each([
    ['getAllByUser'],
    ['getPerformance'],
    ['getSummary'],
    ['getAggregateByPeriod'],
    ['getAggregateByPeriodAndType'],
    ['getById'],
  ])('%s exige autenticação', (metodo) => {
    const guards =
      Reflect.getMetadata(
        GUARDS_METADATA,
        (HistoricoController.prototype as any)[metodo],
      ) ?? [];

    expect(guards).toContain(JwtAuthGuard);
  });
});
