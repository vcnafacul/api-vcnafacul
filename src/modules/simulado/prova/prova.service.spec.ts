import { ProvaService } from './prova.service';

describe('ProvaService.createProva — injeção de criadorId/cursinhoId', () => {
  let service: ProvaService;
  let mockAxios: { post: jest.Mock };
  let mockBlob: { uploadFile: jest.Mock };

  beforeEach(() => {
    mockAxios = { post: jest.fn().mockResolvedValue({ _id: 'p1' }) };
    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('BUCKET_SIMULADO') };
    mockBlob = { uploadFile: jest.fn().mockResolvedValue('uploaded-key') };
    service = new ProvaService(
      mockFactory as any,
      mockEnv as any,
      mockBlob as any,
      {} as any,
    );
  });

  it('injeta criadorId (do param) e cursinhoId null, ignorando o que vier no dto', async () => {
    const dto = {
      edicao: 'Regular',
      ano: '2024',
      aplicacao: '1',
      categoria: 'cat1',
      nome: 'Simuladão',
      nomeSimulado: 'Simulado Único',
      criadorId: 'HACKER',
      cursinhoId: 'HACK-CURSINHO',
    } as any;

    await service.createProva(dto, { f: 1 }, { g: 1 }, 'real-user');

    expect(mockAxios.post.mock.calls[0][0]).toBe('v1/prova');
    const sent = mockAxios.post.mock.calls[0][1];
    expect(sent.criadorId).toBe('real-user');
    expect(sent.cursinhoId).toBeNull();
    expect(sent.nome).toBe('Simuladão');
    expect(sent.nomeSimulado).toBe('Simulado Único');
  });

  it('funciona sem file/gabarito (prova custom sem PDF)', async () => {
    const dto = {
      ano: '2024',
      aplicacao: '1',
      categoria: 'cat1',
      nome: 'Custom',
      nomeSimulado: 'Sim1',
    } as any;

    await service.createProva(dto, undefined, undefined, 'u1');

    expect(mockBlob.uploadFile).not.toHaveBeenCalled();
    const sent = mockAxios.post.mock.calls[0][1];
    expect(sent.filename).toBeUndefined();
    expect(sent.gabarito).toBeUndefined();
    expect(sent.criadorId).toBe('u1');
    expect(sent.cursinhoId).toBeNull();
  });

  it('faz upload quando file/gabarito presentes', async () => {
    const dto = {
      ano: '2024',
      aplicacao: '1',
      categoria: 'cat1',
    } as any;

    await service.createProva(dto, { name: 'f' }, { name: 'g' }, 'u1');

    expect(mockBlob.uploadFile).toHaveBeenCalledTimes(2);
    const sent = mockAxios.post.mock.calls[0][1];
    expect(sent.filename).toBe('uploaded-key');
    expect(sent.gabarito).toBe('uploaded-key');
  });
});
