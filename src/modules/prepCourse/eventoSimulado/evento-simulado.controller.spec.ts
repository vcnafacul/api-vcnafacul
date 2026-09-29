import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { EventoSimuladoController } from './evento-simulado.controller';

/** tickets/026, card 02 — permissão por rota (o guard só lê o handler). */
describe('EventoSimuladoController — permissões', () => {
  const p = EventoSimuladoController.prototype;
  const meta = (h: unknown) => Reflect.getMetadata(PermissionsGuard.name, h);

  it('listar e engajamento: ver OU cadastrar provas do cursinho', () => {
    expect(meta(p.engajamentoDoEvento)).toEqual([
      Permissions.visualizarProvasCursinho,
      Permissions.cadastrarProvasCursinho,
    ]);
    expect(meta(p.listar)).toEqual([
      Permissions.visualizarProvasCursinho,
      Permissions.cadastrarProvasCursinho,
    ]);
  });

  it('criar, editar e excluir: cadastrar provas do cursinho', () => {
    for (const h of [p.criar, p.editar, p.excluir]) {
      expect(meta(h)).toBe(Permissions.cadastrarProvasCursinho);
    }
  });
});
