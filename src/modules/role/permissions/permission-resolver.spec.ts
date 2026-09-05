import { Permissions } from './permissions';
import { PERMISSION_FIELD_MAP } from './permission-field-map';
import { resolveImpliedPermissions } from './permission-resolver';

describe('resolveImpliedPermissions — provas cursinho', () => {
  it('cadastrarProvasCursinho implica visualizarProvasCursinho', () => {
    const resolved = resolveImpliedPermissions({
      [Permissions.cadastrarProvasCursinho]: true,
    });
    expect(resolved[Permissions.visualizarProvasCursinho]).toBe(true);
  });

  it('visualizarProvasCursinho sozinho não liga cadastrar', () => {
    const resolved = resolveImpliedPermissions({
      [Permissions.visualizarProvasCursinho]: true,
    });
    expect(resolved[Permissions.cadastrarProvasCursinho]).toBeUndefined();
  });
});

describe('PERMISSION_FIELD_MAP — completude', () => {
  it('todo valor do enum Permissions tem entrada no field map', () => {
    for (const key of Object.values(Permissions)) {
      expect(PERMISSION_FIELD_MAP[key]).toBeDefined();
    }
  });
});
