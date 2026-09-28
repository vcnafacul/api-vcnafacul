import { PERMISSION_FIELD_MAP } from 'src/modules/role/permissions/permission-field-map';
import {
  PERMISSION_HIERARCHY,
  PermissionType,
} from 'src/modules/role/permissions/permission-hierarchy';
import { Permissions } from 'src/modules/role/permissions/permissions';
import {
  CAMPOS_DE_PROJETO,
  camposDeProjetoAcimaDaBase,
  comCamposDeProjetoDaBase,
  ehPerfilBaseDaPlataforma,
  textoDePermissaoDeProjeto,
} from './permissoes-do-cursinho';

const nos = PERMISSION_HIERARCHY.flatMap((g) => g.permissions);
const campo = (p: Permissions) => PERMISSION_FIELD_MAP[p];

describe('permissões que um cursinho pode dar (tickets/023, card 00)', () => {
  it('⚠️ toda permissão `project` da hierarquia é recusada sem perfil base', () => {
    const deProjeto = nos.filter((n) => n.type === PermissionType.project);
    expect(deProjeto.length).toBeGreaterThan(0);
    for (const n of deProjeto) {
      expect(
        camposDeProjetoAcimaDaBase({ [campo(n.key)]: true }, null),
      ).toEqual([campo(n.key)]);
    }
  });

  it('nenhuma permissão `prepCourse` é recusada', () => {
    const doCursinho = nos.filter((n) => n.type === PermissionType.prepCourse);
    const pedido = Object.fromEntries(
      doCursinho.map((n) => [campo(n.key), true]),
    );
    expect(camposDeProjetoAcimaDaBase(pedido, null)).toEqual([]);
  });

  it('⚠️ falha fechada: permissão fora da hierarquia conta como de projeto', () => {
    const naHierarquia = new Set(nos.map((n) => n.key));
    for (const p of Object.values(Permissions)) {
      if (!naHierarquia.has(p)) expect(CAMPOS_DE_PROJETO).toContain(campo(p));
    }
  });

  it('herdada do perfil base passa; acima do base, não', () => {
    const base = { visualizarQuestao: true };
    expect(
      camposDeProjetoAcimaDaBase({ visualizarQuestao: true }, base),
    ).toEqual([]);
    expect(
      camposDeProjetoAcimaDaBase(
        { visualizarQuestao: true, validarQuestao: true },
        base,
      ),
    ).toEqual(['validarQuestao']);
  });

  it('o que é gravado: campos de projeto iguais aos do base, o resto intacto', () => {
    const out = comCamposDeProjetoDaBase(
      { name: 'x', gerenciarTurmas: true, visualizarQuestao: false },
      { visualizarQuestao: true },
    );
    expect(out).toMatchObject({
      name: 'x',
      gerenciarTurmas: true,
      visualizarQuestao: true,
      criarQuestao: false,
    });
  });

  it('mensagem usa o rótulo da tela', () => {
    const rotulo = nos.find((n) => n.key === Permissions.criarQuestao)!.label;
    expect(textoDePermissaoDeProjeto(['criarQuestao'])).toContain(rotulo);
  });

  it('perfil base válido: da plataforma e marcado como base', () => {
    expect(ehPerfilBaseDaPlataforma({ base: true })).toBe(true);
    expect(ehPerfilBaseDaPlataforma({ base: false })).toBe(false);
    expect(
      ehPerfilBaseDaPlataforma({ base: true, partnerPrepCourse: { id: 'c' } }),
    ).toBe(false);
    expect(ehPerfilBaseDaPlataforma(null)).toBe(false);
  });
});
