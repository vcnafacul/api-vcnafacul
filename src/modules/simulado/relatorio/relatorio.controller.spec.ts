import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RelatorioController } from './relatorio.controller';

const montar = () => {
  const service = {
    consultar: jest.fn().mockResolvedValue({ linhas: [], resumo: {} }),
    consultarQuestoes: jest.fn().mockResolvedValue({ questoes: [] }),
  };
  return { ctrl: new RelatorioController(service as any), service };
};

const req = { user: { id: 'colab-1' } } as any;

describe('RelatorioController', () => {
  it('geral do cursinho: passa quem pediu, sem turma', async () => {
    const { ctrl, service } = montar();

    await ctrl.geral('sim-1', req);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1');
  });

  it('por turma: passa a turma', async () => {
    const { ctrl, service } = montar();

    await ctrl.porTurma('sim-1', 't-1', req);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1', 't-1');
  });

  it('questões do cursinho', async () => {
    const { ctrl, service } = montar();

    await ctrl.questoesGeral('sim-1', req);

    expect(service.consultarQuestoes).toHaveBeenCalledWith('colab-1', 'sim-1');
  });

  it('questões da turma', async () => {
    const { ctrl, service } = montar();

    await ctrl.questoesPorTurma('sim-1', 't-1', req);

    expect(service.consultarQuestoes).toHaveBeenCalledWith(
      'colab-1',
      'sim-1',
      't-1',
    );
  });

  it('o cursinho NUNCA vem da URL — só o id de quem pediu é repassado', async () => {
    const { ctrl, service } = montar();

    await ctrl.geral('sim-1', req);

    const args = service.consultar.mock.calls[0];
    expect(args[0]).toBe('colab-1');
    expect(JSON.stringify(args)).not.toContain('cursinho');
  });
});

describe('RelatorioController — a permissão está em CADA rota', () => {
  // ⚠️ O PermissionsGuard lê `reflector.get(key, context.getHandler())`, e só.
  // Um @SetMetadata no nível da CLASSE não é visto por ele: `requiredPermissions`
  // sai undefined, o guard devolve true, e as quatro rotas ficam abertas para
  // qualquer usuário autenticado — sem nada ficar vermelho.
  it.each([['geral'], ['porTurma'], ['questoesGeral'], ['questoesPorTurma']])(
    '%s exige gerenciarEstudantes',
    (metodo) => {
      const meta = Reflect.getMetadata(
        PermissionsGuard.name,
        (RelatorioController.prototype as any)[metodo],
      );
      expect(meta).toBe(Permissions.gerenciarEstudantes);
    },
  );
});
