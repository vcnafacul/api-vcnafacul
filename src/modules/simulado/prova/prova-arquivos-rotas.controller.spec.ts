import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { ProvaController } from './prova.controller';

describe('download do PDF da prova (tickets-documentacao, 31)', () => {
  it('⚠️ GET :id/file exige login e a leitura de prova', () => {
    const handler = ProvaController.prototype.getFile;
    expect(Reflect.getMetadata('__guards__', handler)).toContain(
      PermissionsGuard,
    );
    expect(Reflect.getMetadata(PermissionsGuard.name, handler)).toEqual(
      expect.arrayContaining([
        Permissions.visualizarProvas,
        Permissions.visualizarProvasCursinho,
      ]),
    );
  });
});
