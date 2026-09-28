import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ProvaController } from '../prova/prova.controller';
import { QuestaoController } from './questao.controller';

/**
 * Quem entra em cada rota do banco de questões (tickets/023, card 01).
 *
 * Lê o `@SetMetadata` que o `PermissionsGuard` usa (lista = OU), rota por
 * rota. ⚠️ As permissões de cursinho só **abrem** as rotas: quem barra a prova
 * de outro cursinho é o ms (card 03).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function permissoesPorRota(controller: any): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const proto = controller.prototype;
  for (const nome of Object.getOwnPropertyNames(proto)) {
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

const questao = permissoesPorRota(QuestaoController);
const prova = permissoesPorRota(ProvaController);
const P = Permissions;

describe('banco de questões — quem entra em cada rota (023 · 01)', () => {
  it.each([
    'GET /',
    'GET :id',
    'GET infos',
    'GET :id/linhagem',
    'GET :id/logs',
    'GET history/:id',
  ])('%s: ver — projeto e cursinho', (rota) => {
    expect(questao[rota]).toEqual(
      expect.arrayContaining([
        P.visualizarQuestao,
        P.visualizarQuestoesCursinho,
        P.editarQuestoesCursinho,
      ]),
    );
  });

  it.each([
    'POST assets',
    'PATCH :id/classification',
    'PATCH :id/content',
    'PATCH :id/nova-versao',
    'POST :id/duplicar',
    'PATCH :id/image-alternativa',
    'PATCH :id/uploadimage',
    'POST :id/provas',
    'DELETE :id/provas/:provaId',
    'PATCH :id/prova-base',
    'POST /',
  ])('%s: editar — criarQuestao ou o editor do cursinho', (rota) => {
    expect(questao[rota]).toEqual(
      expect.arrayContaining([P.criarQuestao, P.editarQuestoesCursinho]),
    );
    // ⚠️ Ver não é editar.
    expect(questao[rota]).not.toContain(P.visualizarQuestoesCursinho);
  });

  it.each([
    'PATCH :id/:status(\\d+)',
    'PATCH /',
    'DELETE :id',
    'GET :id/exclusao',
    'GET health/s3-test',
    'DELETE :id/cache',
  ])('%s: continua só do projeto', (rota) => {
    expect(questao[rota]).toBeDefined();
    expect(questao[rota]).not.toContain(P.editarQuestoesCursinho);
    expect(questao[rota]).not.toContain(P.visualizarQuestoesCursinho);
  });

  it('GET prova/missing/:id: o editor do cursinho escolhe o número', () => {
    expect(prova['GET missing/:id']).toContain(P.editarQuestoesCursinho);
  });

  it('PATCH prova/:id/receber-novas-versoes (023 · 05): quem cadastra prova e o editor', () => {
    expect(prova['PATCH :id/receber-novas-versoes']).toEqual(
      expect.arrayContaining([
        P.cadastrarProvas,
        P.cadastrarProvasCursinho,
        P.editarQuestoesCursinho,
      ]),
    );
  });

  it('GET prova/:id (023 · 07): ler a prova é livre para quem vê o banco ou as provas do cursinho', () => {
    expect(prova['GET :id']).toEqual(
      expect.arrayContaining([
        P.visualizarProvas,
        P.visualizarProvasCursinho,
        P.visualizarQuestao,
        P.visualizarQuestoesCursinho,
        P.editarQuestoesCursinho,
      ]),
    );
  });

  it('GET prova/:id/atualizacoes (023 · 13): as mesmas de ler a prova', () => {
    expect(prova['GET :id/atualizacoes']).toEqual(prova['GET :id']);
  });
});
