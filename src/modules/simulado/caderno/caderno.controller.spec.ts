import { CadernoController } from './caderno.controller';

const montar = (retorno: any = {}) => {
  const service = {
    baixar: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      avisos: '3',
      ...retorno,
    }),
  };
  const res: any = { setHeader: jest.fn(), send: jest.fn() };
  return { controller: new CadernoController(service as any), service, res };
};

describe('CadernoController', () => {
  it('envia o zip como anexo, com o nome do arquivo', async () => {
    // `attachment`, não `inline`: zip não se abre no navegador.
    const { controller, res } = montar();
    await controller.baixar('65ecc850a528b39d273e7900', undefined, res);
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

  it('repassa o X-Caderno-Avisos', async () => {
    const { controller, res } = montar();
    await controller.baixar('65ecc850a528b39d273e7900', undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-Caderno-Avisos', '3');
  });

  it('sem avisos, não seta o header', async () => {
    const { controller, res } = montar({ avisos: undefined });
    await controller.baixar('65ecc850a528b39d273e7900', undefined, res);
    const nomes = res.setHeader.mock.calls.map((c: any[]) => c[0]);
    expect(nomes).not.toContain('X-Caderno-Avisos');
  });

  it('só a string exata "true" liga o rascunho', async () => {
    // Query string chega como texto. Concatenar o valor cru injeta parâmetro
    // na chamada interna: medido, `draft=true&x=1` viraria
    // `?draft=true&x=1` na URL do ms.
    const { controller, service, res } = montar();
    for (const v of ['true', 'false', '1', '', 'TRUE', 'true&x=1']) {
      await controller.baixar('65ecc850a528b39d273e7900', v, res);
    }
    const draftsRecebidos = service.baixar.mock.calls.map((c: any[]) => c[1]);
    expect(draftsRecebidos).toEqual([true, false, false, false, false, false]);
  });
});
