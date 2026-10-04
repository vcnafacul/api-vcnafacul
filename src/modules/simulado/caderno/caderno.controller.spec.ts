import { CadernoController } from './caderno.controller';

const USER_ID = 'user-1';
const REQ = { user: { id: USER_ID } } as any;

const montar = (retorno: any = {}) => {
  const http = {
    baixar: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      avisos: '3',
      ...retorno,
    }),
  };
  const logos = { resolver: jest.fn().mockResolvedValue({}) };
  const res: any = { setHeader: jest.fn(), send: jest.fn() };
  // Card 32: quem pede é do cursinho dono do simulado.
  const ator = { resolver: jest.fn().mockResolvedValue({ cursinhoId: 'c1' }) };
  const simulados = {
    getById: jest.fn().mockResolvedValue({ cursinhoId: 'c1' }),
  };
  return {
    controller: new CadernoController(
      http as any,
      logos as any,
      ator as any,
      simulados as any,
    ),
    simulados,
    http,
    logos,
    res,
  };
};

const montarECheckarContentType = async (contentType: string) => {
  const { controller, res } = montar({ contentType });
  await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
};

describe('CadernoController', () => {
  it('envia o zip como anexo, com o nome do arquivo', async () => {
    // `attachment`, não `inline`: zip não se abre no navegador.
    const { controller, res } = montar();
    await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="caderno-65ecc850a528b39d273e7900.zip"',
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('ZIP'));
  });

  it('sem content-type do ms, cai em application/zip', () => {
    // Se o ms não mandar o header, enviar `Content-Type:` vazio faz o
    // navegador adivinhar — e adivinhar zip costuma dar errado.
    return montarECheckarContentType('');
  });

  it('repassa o X-Caderno-Avisos', async () => {
    const { controller, res } = montar();
    await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-Caderno-Avisos', '3');
  });

  it('sem avisos, não seta o header', async () => {
    const { controller, res } = montar({ avisos: undefined });
    await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);
    const nomes = res.setHeader.mock.calls.map((c: any[]) => c[0]);
    expect(nomes).not.toContain('X-Caderno-Avisos');
  });

  it('só a string exata "true" liga o rascunho', async () => {
    // Query string chega como texto. Concatenar o valor cru injeta parâmetro
    // na chamada interna: medido, `draft=true&x=1` viraria
    // `?draft=true&x=1` na URL do ms.
    const { controller, http, res } = montar();
    for (const v of ['true', 'false', '1', '', 'TRUE', 'true&x=1']) {
      await controller.baixar('65ecc850a528b39d273e7900', v, REQ, res);
    }
    const draftsRecebidos = http.baixar.mock.calls.map((c: any[]) => c[1]);
    expect(draftsRecebidos).toEqual([true, false, false, false, false, false]);
  });

  describe('baixar — logos', () => {
    it('resolve os logos do usuário do request e repassa ao http service', async () => {
      const { controller, logos, http, res } = montar();
      const resolvidos = { vnf: Buffer.from([0x89]) };
      logos.resolver.mockResolvedValue(resolvidos);

      await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);

      expect(logos.resolver).toHaveBeenCalledWith(USER_ID);
      expect(http.baixar).toHaveBeenCalledWith(
        '65ecc850a528b39d273e7900',
        false,
        resolvidos,
      );
    });

    // ⚠️ O cursinho sai de QUEM PEDIU, não do simulado: o mesmo simulado baixado
    // por dois colaboradores de cursinhos diferentes sai com logos diferentes.
    it('usa o id do usuário do request, não um valor fixo', async () => {
      const { controller, logos, res } = montar();
      const outroReq = { user: { id: 'outro-usuario' } } as any;

      await controller.baixar(
        '65ecc850a528b39d273e7900',
        undefined,
        outroReq,
        res,
      );

      expect(logos.resolver).toHaveBeenCalledWith('outro-usuario');
    });
  });
});

describe('CadernoController — escopo (tickets-documentacao, 32)', () => {
  it('⚠️ simulado de outro cursinho: 403 sem baixar', async () => {
    const { controller, http, res, simulados } = montar();
    simulados.getById.mockResolvedValue({ cursinhoId: 'outro' });
    await expect(
      controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res),
    ).rejects.toMatchObject({ status: 403 });
    expect(http.baixar).not.toHaveBeenCalled();
  });

  it('simulado oficial (sem dono): baixa', async () => {
    const { controller, http, res, simulados } = montar();
    simulados.getById.mockResolvedValue({ cursinhoId: null });
    await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);
    expect(http.baixar).toHaveBeenCalled();
  });
});
