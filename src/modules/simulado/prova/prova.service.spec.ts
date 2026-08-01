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

describe('ProvaService.getAllByCursinho', () => {
  function makeService() {
    const mockAxios = { get: jest.fn().mockResolvedValue({ data: [] }) };
    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://ms') };
    const service = new ProvaService(
      mockFactory as any,
      mockEnv as any,
      {} as any,
      {} as any,
    );
    return { service, mockAxios };
  }

  it('monta a URL do endpoint cursinho com page/limit', async () => {
    const { service, mockAxios } = makeService();
    await service.getAllByCursinho('curs-1', '2', '10');
    expect(mockAxios.get).toHaveBeenCalledWith(
      'v1/prova/cursinho/curs-1?page=2&limit=10',
    );
  });

  it('sem page/limit → sem query string', async () => {
    const { service, mockAxios } = makeService();
    await service.getAllByCursinho('curs-1');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/prova/cursinho/curs-1');
  });
});

describe('ProvaService.createProva — cursinhoId opcional', () => {
  function makeService() {
    const mockAxios = { post: jest.fn().mockResolvedValue({ _id: 'p1' }) };
    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('BUCKET_SIMULADO') };
    const mockBlob = { uploadFile: jest.fn().mockResolvedValue('key') };
    const service = new ProvaService(
      mockFactory as any,
      mockEnv as any,
      mockBlob as any,
      {} as any,
    );
    return { service, mockAxios };
  }

  it('injeta o cursinhoId passado (fluxo cursinho)', async () => {
    const { service, mockAxios } = makeService();
    const dto = { ano: '2024', aplicacao: '1', categoria: 'c1' } as any;
    await service.createProva(dto, undefined, undefined, 'user-1', 'curs-9');
    const sent = mockAxios.post.mock.calls[0][1];
    expect(sent.cursinhoId).toBe('curs-9');
    expect(sent.criadorId).toBe('user-1');
  });

  it('sem o 5º arg → cursinhoId null (admin, retrocompatível)', async () => {
    const { service, mockAxios } = makeService();
    const dto = { ano: '2024', aplicacao: '1', categoria: 'c1' } as any;
    await service.createProva(dto, undefined, undefined, 'user-1');
    const sent = mockAxios.post.mock.calls[0][1];
    expect(sent.cursinhoId).toBeNull();
  });
});
