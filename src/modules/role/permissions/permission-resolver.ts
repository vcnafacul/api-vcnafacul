import { Permissions } from './permissions';
import { PERMISSION_HIERARCHY } from './permission-hierarchy';

type PermissionMap = Record<Permissions, boolean>;

export function resolveImpliedPermissions(
  input: Partial<PermissionMap>,
): Partial<PermissionMap> {
  const resolved = { ...input };

  for (const group of PERMISSION_HIERARCHY) {
    for (const node of group.permissions) {
      if (resolved[node.key] && node.implies) {
        for (const implied of node.implies) {
          resolved[implied] = true;
        }
      }
    }
  }

  return resolved;
}
