import {
  MotivoParaNaoAtivar as A,
  MotivoParaNaoAtribuir as M,
  motivosParaNaoAtivar,
  motivosParaNaoAtribuir,
  SituacaoDaAtivacao,
  SituacaoDaAtribuicao,
} from './atribuicao-de-funcao';

/** Um pedido válido de quem só gerencia colaboradores — cada teste quebra uma regra. */
const valido = (
  over: Partial<SituacaoDaAtribuicao> = {},
): SituacaoDaAtribuicao => ({
  quemPedeId: 'gestor',
  quemPedeEhAdmin: false,
  cursinhoId: 'c1',
  alvo: {
    userId: 'ana',
    cursinhoId: 'c1',
    ativo: true,
    ehAdmin: false,
  },
  funcao: { cursinhoId: 'c1', ehDeAdmin: false },
  ...over,
});

describe('motivosParaNaoAtribuir (convite 02)', () => {
  it('pedido válido: sem motivo', () => {
    expect(motivosParaNaoAtribuir(valido())).toEqual([]);
  });

  describe('para todos — admin ou não', () => {
    it.each([true, false])(
      '⚠️ alvo que não é colaborador DESTE cursinho (admin=%s)',
      (quemPedeEhAdmin) => {
        // O buraco do `user/updateRole`: dava função a QUALQUER usuário.
        expect(
          motivosParaNaoAtribuir(
            valido({
              quemPedeEhAdmin,
              alvo: { ...valido().alvo!, cursinhoId: 'outro' },
            }),
          ),
        ).toContain(M.alvoForaDoCursinho);
        expect(
          motivosParaNaoAtribuir(valido({ quemPedeEhAdmin, alvo: null })),
        ).toContain(M.alvoForaDoCursinho);
      },
    );

    it.each([true, false])(
      '⚠️ função de OUTRO cursinho ou da plataforma (admin=%s)',
      (quemPedeEhAdmin) => {
        // Inclusive a `admin` da plataforma, que não tem cursinho.
        for (const cursinhoId of ['outro', null]) {
          expect(
            motivosParaNaoAtribuir(
              valido({
                quemPedeEhAdmin,
                funcao: { cursinhoId, ehDeAdmin: false },
              }),
            ),
          ).toContain(M.funcaoForaDoCursinho);
        }
      },
    );

    it('colaborador inativo', () => {
      expect(
        motivosParaNaoAtribuir(
          valido({ alvo: { ...valido().alvo!, ativo: false } }),
        ),
      ).toContain(M.alvoInativo);
    });
  });

  describe('⚠️ quem NÃO é admin — senão é escalada de privilégio', () => {
    it('não atribui função que tem gerenciarPermissoesCursinho', () => {
      expect(
        motivosParaNaoAtribuir(
          valido({ funcao: { cursinhoId: 'c1', ehDeAdmin: true } }),
        ),
      ).toEqual([M.funcaoDeAdmin]);
    });

    it('não troca a função de quem é admin', () => {
      expect(
        motivosParaNaoAtribuir(
          valido({ alvo: { ...valido().alvo!, ehAdmin: true } }),
        ),
      ).toEqual([M.alvoEhAdmin]);
    });

    it('não troca a própria função', () => {
      expect(
        motivosParaNaoAtribuir(
          valido({ alvo: { ...valido().alvo!, userId: 'gestor' } }),
        ),
      ).toEqual([M.propriaFuncao]);
    });
  });

  it('o admin do cursinho pode as três', () => {
    expect(
      motivosParaNaoAtribuir(
        valido({
          quemPedeEhAdmin: true,
          alvo: {
            userId: 'gestor',
            cursinhoId: 'c1',
            ativo: true,
            ehAdmin: true,
          },
          funcao: { cursinhoId: 'c1', ehDeAdmin: true },
        }),
      ),
    ).toEqual([]);
  });
});

describe('motivosParaNaoAtivar (tickets-documentacao, card 02)', () => {
  const pedido = (
    over: Partial<SituacaoDaAtivacao> = {},
    alvo: Partial<SituacaoDaAtivacao['alvo']> = {},
  ): SituacaoDaAtivacao => ({
    quemPedeId: 'gestor',
    quemPedeEhAdmin: false,
    cursinhoId: 'A',
    ...over,
    alvo: { userId: 'alvo', cursinhoId: 'A', ehAdmin: false, ...alvo },
  });

  it('colaborador comum do próprio cursinho: pode', () => {
    expect(motivosParaNaoAtivar(pedido())).toEqual([]);
  });

  it('de outro cursinho: só esse motivo, para os dois níveis', () => {
    expect(motivosParaNaoAtivar(pedido({}, { cursinhoId: 'B' }))).toEqual([
      A.alvoForaDoCursinho,
    ]);
    expect(
      motivosParaNaoAtivar(
        pedido({ quemPedeEhAdmin: true }, { cursinhoId: null, ehAdmin: true }),
      ),
    ).toEqual([A.alvoForaDoCursinho]);
  });

  it('a si mesmo: nem o admin', () => {
    expect(
      motivosParaNaoAtivar(
        pedido({ quemPedeEhAdmin: true }, { userId: 'gestor', ehAdmin: true }),
      ),
    ).toEqual([A.proprioCadastro]);
  });

  it('admin: só o admin mexe', () => {
    expect(motivosParaNaoAtivar(pedido({}, { ehAdmin: true }))).toEqual([
      A.alvoEhAdmin,
    ]);
    expect(
      motivosParaNaoAtivar(
        pedido({ quemPedeEhAdmin: true }, { ehAdmin: true }),
      ),
    ).toEqual([]);
  });
});
