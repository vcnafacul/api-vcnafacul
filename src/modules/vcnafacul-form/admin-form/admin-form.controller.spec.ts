import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { AdminFormController } from './admin-form.controller';

/** `MÉTODO rota` → permissões do `@SetMetadata` (lista = OU). */
function permissoesPorRota(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const proto = AdminFormController.prototype;
  for (const nome of Object.getOwnPropertyNames(proto)) {
    if (nome === 'constructor') continue;
    const handler = proto[nome];
    const path = Reflect.getMetadata(PATH_METADATA, handler);
    if (path === undefined) continue;
    const metodo = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)];
    const meta = Reflect.getMetadata(PermissionsGuard.name, handler);
    out[`${metodo} ${path}`] =
      meta === undefined ? [] : Array.isArray(meta) ? meta : [meta];
  }
  return out;
}

const rotas = permissoesPorRota();

describe('admin-form — formulário global (tickets-documentacao, 16)', () => {
  it('⚠️ toda escrita exige só Gerenciar Formulário Global', () => {
    const escritas = Object.entries(rotas).filter(
      ([r]) => !r.startsWith('GET'),
    );
    expect(escritas.length).toBe(12);
    for (const [rota, perms] of escritas) {
      expect({ rota, perms }).toEqual({
        rota,
        perms: [Permissions.gerenciarFormularioGlobal],
      });
    }
  });

  it('leitura segue aberta ao cursinho (a tela mostra as seções globais)', () => {
    const leituras = Object.entries(rotas).filter(([r]) => r.startsWith('GET'));
    expect(leituras.length).toBe(4);
    for (const [, perms] of leituras) {
      expect(perms).toEqual(
        expect.arrayContaining([
          Permissions.gerenciarFormularioGlobal,
          Permissions.gerenciarFormulario,
        ]),
      );
    }
  });
});
