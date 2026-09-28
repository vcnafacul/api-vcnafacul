import { AtorService } from './ator.service';
import { HEADER_ATOR, headerDoAtor, semAtor } from './ator';

function make(role: Record<string, boolean> | null, cursinhoId: string | null) {
  const userService = {
    findOneBy: jest.fn().mockResolvedValue(role ? { id: 'u1', role } : null),
  };
  const cursinhoResolver = {
    resolveCursinhoIdOuNull: jest.fn().mockResolvedValue(cursinhoId),
  };
  return new AtorService(userService as any, cursinhoResolver as any);
}

describe('AtorService (tickets/023, card 02)', () => {
  it('⚠️ admin que não é colaborador: cursinhoId null, sem 403', async () => {
    await expect(
      make({ criarQuestao: true }, null).resolver('u1'),
    ).resolves.toEqual({
      userId: 'u1',
      cursinhoId: null,
      admin: true,
      editorCursinho: false,
    });
  });

  it('admin que também é colaborador: cursinho e admin', async () => {
    const ator = await make({ validarQuestao: true }, 'c1').resolver('u1');
    expect(ator).toMatchObject({ cursinhoId: 'c1', admin: true });
  });

  it('editor do cursinho: não é admin', async () => {
    const ator = await make({ editarQuestoesCursinho: true }, 'c1').resolver(
      'u1',
    );
    expect(ator).toMatchObject({
      cursinhoId: 'c1',
      admin: false,
      editorCursinho: true,
    });
  });

  it('só ver o banco não faz de ninguém admin nem editor', async () => {
    const ator = await make(
      { visualizarQuestao: true, visualizarQuestoesCursinho: true },
      'c1',
    ).resolver('u1');
    expect(ator).toMatchObject({ admin: false, editorCursinho: false });
  });

  it('usuário sem papel: tudo falso', async () => {
    const ator = await make(null, null).resolver('u1');
    expect(ator).toMatchObject({ admin: false, editorCursinho: false });
  });
});

describe('header e corpo', () => {
  it('o ator vai em JSON no header x-ator', () => {
    const ator = {
      userId: 'u',
      cursinhoId: null,
      admin: true,
      editorCursinho: false,
    };
    expect(HEADER_ATOR).toBe('x-ator');
    expect(JSON.parse(headerDoAtor(ator)['x-ator'])).toEqual(ator);
  });

  it('semAtor tira o ator forjado e mantém o resto', () => {
    expect(semAtor({ a: 1, ator: { admin: true } })).toEqual({ a: 1 });
    expect(semAtor(null)).toBeNull();
    expect(semAtor([1])).toEqual([1]);
  });
});
