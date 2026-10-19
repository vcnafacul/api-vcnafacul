import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { IndicadoresDoAdminController } from './indicadores-do-admin.controller';

/**
 * tickets/045 — toda rota do admin com `alterarPermissao` no HANDLER. O
 * `PermissionsGuard` lê só o handler: metadado na classe liberaria tudo. O teste
 * varre os métodos, então rota nova sem guard quebra aqui.
 */
describe('IndicadoresDoAdminController — guard em cada rota (045)', () => {
  const proto = IndicadoresDoAdminController.prototype as unknown as Record<
    string,
    unknown
  >;
  const rotas = Object.getOwnPropertyNames(proto).filter(
    (n) =>
      n !== 'constructor' &&
      n !== 'garantirCursinho' &&
      typeof proto[n] === 'function',
  );

  it('cobre as cinco rotas', () => {
    expect(rotas.sort()).toEqual(
      ['obter', 'obterDesempenho', 'periodos', 'resumo', 'sumindo'].sort(),
    );
  });

  it.each(rotas)('%s: PermissionsGuard + alterarPermissao', (rota) => {
    const handler = proto[rota] as object;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      PermissionsGuard,
    ]);
    expect(Reflect.getMetadata(PermissionsGuard.name, handler)).toBe(
      Permissions.alterarPermissao,
    );
  });
});
