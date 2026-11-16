import {
  collectRecipients,
  extractAddress,
  replaceFromAddress,
  splitByWhitelist,
} from './email-routing';

describe('email-routing', () => {
  const whitelist = new Set(['aluno@gmail.com', 'dev@vcnafacul.com.br']);
  const isReleased = (a: string) => whitelist.has(a);

  describe('extractAddress', () => {
    it('tira o nome de exibição e põe em minúsculas', () => {
      expect(extractAddress('Fulano <Aluno@Gmail.com>')).toBe(
        'aluno@gmail.com',
      );
      expect(extractAddress({ name: 'X', address: 'A@B.com' })).toBe('a@b.com');
      expect(extractAddress('  a@b.com ')).toBe('a@b.com');
    });
  });

  describe('collectRecipients', () => {
    it('junta to/cc/bcc, separa string com vírgula e remove repetidos', () => {
      expect(
        collectRecipients({
          to: 'a@x.com, b@x.com',
          cc: [{ address: 'A@x.com' }],
          bcc: ['c@x.com'],
        }),
      ).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    });
  });

  describe('splitByWhitelist', () => {
    it('ninguém liberado: tudo no bloqueado', () => {
      const opts = { to: 'outro@x.com', subject: 's' };
      const { released, blocked } = splitByWhitelist(opts, isReleased);
      expect(released).toBeNull();
      expect(blocked).toEqual({ to: ['outro@x.com'], subject: 's' });
    });

    it('todos liberados: tudo no liberado', () => {
      const { released, blocked } = splitByWhitelist(
        { to: 'aluno@gmail.com' },
        isReleased,
      );
      expect(released).toEqual({ to: ['aluno@gmail.com'] });
      expect(blocked).toBeNull();
    });

    it('aluno liberado + BCC fixo: só o aluno sai pelo liberado', () => {
      const { released, blocked } = splitByWhitelist(
        {
          to: 'Aluno@Gmail.com',
          bcc: 'cursinho.ufscar@vcnafacul.com.br',
          subject: 's',
        },
        isReleased,
      );
      expect(released).toEqual({ to: ['Aluno@Gmail.com'], subject: 's' });
      expect(blocked).toEqual({
        bcc: ['cursinho.ufscar@vcnafacul.com.br'],
        subject: 's',
      });
    });

    it('envio em massa: separa o BCC e o to falso fica no bloqueado', () => {
      const { released, blocked } = splitByWhitelist(
        {
          to: 'smtp@vcnafacul.com.br',
          bcc: ['a@x.com', 'dev@vcnafacul.com.br', 'b@x.com'],
        },
        isReleased,
      );
      expect(released).toEqual({ bcc: ['dev@vcnafacul.com.br'] });
      expect(blocked).toEqual({
        to: ['smtp@vcnafacul.com.br'],
        bcc: ['a@x.com', 'b@x.com'],
      });
    });

    it('não altera o objeto original', () => {
      const opts = { to: ['aluno@gmail.com', 'x@x.com'] };
      splitByWhitelist(opts, isReleased);
      expect(opts).toEqual({ to: ['aluno@gmail.com', 'x@x.com'] });
    });
  });

  describe('replaceFromAddress', () => {
    it('mantém o nome de exibição', () => {
      expect(
        replaceFromAddress('Voce na Facul <smtp@a.com>', 'liberado@b.com'),
      ).toBe('Voce na Facul <liberado@b.com>');
    });

    it('endereço puro vira o novo endereço', () => {
      expect(replaceFromAddress('smtp@a.com', 'liberado@b.com')).toBe(
        'liberado@b.com',
      );
      expect(replaceFromAddress(undefined, 'liberado@b.com')).toBe(
        'liberado@b.com',
      );
    });

    it('objeto mantém o name', () => {
      expect(
        replaceFromAddress({ name: 'VNF', address: 'a@a.com' }, 'b@b.com'),
      ).toEqual({ name: 'VNF', address: 'b@b.com' });
    });
  });
});
