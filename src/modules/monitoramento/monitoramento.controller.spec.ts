import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import { MonitoramentoController } from './monitoramento.controller';

/**
 * tickets/044, D5 — toda rota do monitoramento tem guard **no handler**. O
 * `PermissionsGuard` lê só o handler: metadado na classe liberaria tudo. O teste
 * varre os métodos, então rota nova sem guard quebra aqui.
 */
describe('MonitoramentoController — guard em cada rota (044)', () => {
  const proto = MonitoramentoController.prototype as unknown as Record<
    string,
    unknown
  >;
  const rotas = Object.getOwnPropertyNames(proto).filter(
    (n) => n !== 'constructor' && typeof proto[n] === 'function',
  );

  const permissaoEsperada: Record<string, Permissions> = {
    resumo: Permissions.criarQuestao,
    estudantes: Permissions.visualizarEstudantes,
  };

  it('a classe não carrega guard nem permissão', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MonitoramentoController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(PermissionsGuard.name, MonitoramentoController),
    ).toBeUndefined();
  });

  it.each(rotas)(
    '%s tem JwtAuthGuard + PermissionsGuard e permissão',
    (rota) => {
      const handler = proto[rota] as object;
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
        JwtAuthGuard,
        PermissionsGuard,
      ]);
      const permissao = Reflect.getMetadata(PermissionsGuard.name, handler);
      expect(permissao).toBeDefined();
      if (permissaoEsperada[rota])
        expect(permissao).toBe(permissaoEsperada[rota]);
    },
  );
});
