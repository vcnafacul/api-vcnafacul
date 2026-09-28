import { PERMISSION_FIELD_MAP } from 'src/modules/role/permissions/permission-field-map';
import {
  PERMISSION_HIERARCHY,
  PermissionType,
} from 'src/modules/role/permissions/permission-hierarchy';
import { Permissions } from 'src/modules/role/permissions/permissions';

/**
 * O que um cursinho pode pôr num papel dele (tickets/023, card 00).
 *
 * ⚠️ As rotas de papel do cursinho gravavam **qualquer** permissão: marcando
 * `criarQuestao`/`validarQuestao`, o cursinho virava "admin" do banco de
 * questões e compunha as provas oficiais. O `type` da hierarquia só organizava
 * a tela.
 *
 * Permissão de projeto num papel de cursinho só vale **herdada do perfil
 * base** (`roleBase`), que é a plataforma quem define. É o mesmo modelo da
 * propagação do `RoleService.update`: mudar o base muda os filhos.
 */

/** Só as declaradas `prepCourse` na hierarquia. */
export const PERMISSOES_DO_CURSINHO: ReadonlySet<Permissions> = new Set(
  PERMISSION_HIERARCHY.flatMap((g) => g.permissions)
    .filter((p) => p.type === PermissionType.prepCourse)
    .map((p) => p.key),
);

/**
 * ⚠️ Falha fechada: permissão que não está na hierarquia conta como de
 * projeto. Uma permissão nova nasce protegida até alguém declará-la
 * `prepCourse`.
 */
export const CAMPOS_DE_PROJETO: readonly string[] = Object.values(Permissions)
  .filter((p) => !PERMISSOES_DO_CURSINHO.has(p))
  .map((p) => PERMISSION_FIELD_MAP[p]);

type Flags = object;

/** Campos de projeto ligados no pedido que o perfil base não dá. */
export function camposDeProjetoAcimaDaBase(
  pedido: Flags,
  base: Flags | null | undefined,
): string[] {
  return CAMPOS_DE_PROJETO.filter(
    (c) => pedido[c] === true && base?.[c] !== true,
  );
}

/** O pedido com os campos de projeto iguais aos do perfil base. */
export function comCamposDeProjetoDaBase<T extends Flags>(
  pedido: T,
  base: Flags | null | undefined,
): T {
  const out = { ...pedido };
  for (const c of CAMPOS_DE_PROJETO) out[c] = base?.[c] === true;
  return out;
}

const ROTULO_DO_CAMPO: Record<string, string> = Object.fromEntries(
  PERMISSION_HIERARCHY.flatMap((g) => g.permissions).map((p) => [
    PERMISSION_FIELD_MAP[p.key],
    p.label,
  ]),
);

export function textoDePermissaoDeProjeto(campos: string[]): string {
  const nomes = campos.map((c) => ROTULO_DO_CAMPO[c] ?? c).join(', ');
  return `Estas permissões são da plataforma e não podem ser dadas por um cursinho: ${nomes}.`;
}

/** Perfil base válido para um cursinho: da plataforma e marcado como base. */
export function ehPerfilBaseDaPlataforma(
  role: { base?: boolean; partnerPrepCourse?: unknown } | null,
): boolean {
  return !!role && role.base === true && !role.partnerPrepCourse;
}
