import { palavrasDaBusca } from './busca-de-usuario';

describe('palavrasDaBusca (usuários 02)', () => {
  it('quebra em palavras', () => {
    expect(palavrasDaBusca('Maria Silva')).toEqual(['Maria', 'Silva']);
  });

  it('⚠️ espaços extras não viram palavra vazia', () => {
    // "  Maria   Silva " tem de casar igual a "Maria Silva".
    expect(palavrasDaBusca('  Maria   Silva ')).toEqual(['Maria', 'Silva']);
  });

  it('vazio ou só espaço: nenhuma palavra', () => {
    expect(palavrasDaBusca('')).toEqual([]);
    expect(palavrasDaBusca('   ')).toEqual([]);
    expect(palavrasDaBusca(undefined)).toEqual([]);
  });

  it('⚠️ % e _ do usuário são literais, não curinga do LIKE', () => {
    // Sem escapar, "%" casaria com todo mundo.
    expect(palavrasDaBusca('100% a_b')).toEqual(['100\\%', 'a\\_b']);
  });
});
