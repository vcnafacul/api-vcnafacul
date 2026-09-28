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

describe('ProvaService.getProvasAll', () => {
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

  it('repassa page/limit no querystring', async () => {
    const { service, mockAxios } = makeService();
    await service.getProvasAll('2', '10');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/prova?page=2&limit=10');
  });

  it('sem page/limit → `v1/prova` CRU, sem querystring', async () => {
    // ⚠️ O coracao do conserto. Outros chamadores chamam sem parametro e
    // esperam o default do ms (limit=40). Mandar `page=undefined` viraria a
    // STRING "undefined" na URL e quebraria o ms em silencio -- o `if (page)`
    // no service existe so para isso.
    const { service, mockAxios } = makeService();
    await service.getProvasAll();
    expect(mockAxios.get).toHaveBeenCalledWith('v1/prova');
  });

  it('so page → so page no querystring', async () => {
    const { service, mockAxios } = makeService();
    await service.getProvasAll('3');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/prova?page=3');
  });

  it('so limit → so limit no querystring', async () => {
    const { service, mockAxios } = makeService();
    await service.getProvasAll(undefined, '25');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/prova?limit=25');
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

describe('ProvaService — receberNovasVersoes (023 · 05)', () => {
  const montar = () => {
    const axios = {
      post: jest.fn().mockResolvedValue({ _id: 'p1' }),
      patch: jest.fn().mockResolvedValue({ receberNovasVersoes: true }),
    };
    const service = new ProvaService(
      { create: () => axios } as any,
      { get: () => 'x' } as any,
      { uploadFile: jest.fn() } as any,
      {} as any,
    );
    return { service, axios };
  };
  const dto = (receberNovasVersoes?: unknown) =>
    ({
      ano: '2024',
      aplicacao: '1',
      categoria: 'c',
      receberNovasVersoes,
    }) as any;

  it.each([
    [undefined, false],
    ['false', false],
    ['true', true],
    [true, true],
  ])('criar com %p manda %p ao ms', async (entrada, esperado) => {
    const { service, axios } = montar();
    await service.createProva(dto(entrada), undefined, undefined, 'u');
    expect(axios.post.mock.calls[0][1].receberNovasVersoes).toBe(esperado);
  });

  it('alterar manda o valor e o ator no header', async () => {
    const { service, axios } = montar();
    const ator = {
      userId: 'u',
      cursinhoId: 'c',
      admin: false,
      editorCursinho: true,
    };
    await service.alterarReceberNovasVersoes('p1', true, ator);
    const [url, corpo, header] = axios.patch.mock.calls[0];
    expect(url).toBe('v1/prova/p1/receber-novas-versoes');
    expect(corpo).toEqual({ valor: true });
    expect(JSON.parse(header['x-ator'])).toEqual(ator);
  });
});

describe('ProvaService.getProvaById com dono (023 · 07)', () => {
  it('header do ator e o nome do cursinho dono', async () => {
    const axios = {
      get: jest.fn().mockResolvedValue({ _id: 'p', cursinhoId: 'A' }),
    };
    const cursinhoNome = {
      comNome: jest.fn(async (ps: any[]) =>
        ps.map((p) => ({ ...p, cursinhoNome: 'Cursinho A' })),
      ),
    };
    const service = new ProvaService(
      { create: () => axios } as any,
      { get: () => 'x' } as any,
      {} as any,
      {} as any,
      cursinhoNome as any,
    );
    const ator = {
      userId: 'u',
      cursinhoId: 'B',
      admin: false,
      editorCursinho: true,
    };
    const p = await service.getProvaById('p', ator);
    expect(JSON.parse(axios.get.mock.calls[0][1]['x-ator'])).toEqual(ator);
    expect(p.cursinhoNome).toBe('Cursinho A');
  });
});

describe('ProvaService.listarAtualizacoes (023 · 13)', () => {
  it('pede ao ms com o ator no header', async () => {
    const axios = { get: jest.fn().mockResolvedValue({ atualizacoes: [] }) };
    const service = new ProvaService(
      { create: () => axios } as any,
      { get: () => 'x' } as any,
      {} as any,
      {} as any,
    );
    const ator = {
      userId: 'u',
      cursinhoId: 'A',
      admin: false,
      editorCursinho: true,
    };
    await service.listarAtualizacoes('p1', ator);
    expect(axios.get.mock.calls[0][0]).toBe('v1/prova/p1/atualizacoes');
    expect(JSON.parse(axios.get.mock.calls[0][1]['x-ator'])).toEqual(ator);
  });
});

describe('ProvaService.aplicarAtualizacoes (023 · 14)', () => {
  it('manda só {de, para} de cada troca, com o ator no header', async () => {
    const axios = { post: jest.fn().mockResolvedValue({ trocadas: 1 }) };
    const service = new ProvaService(
      { create: () => axios } as any,
      { get: () => 'x' } as any,
      {} as any,
      {} as any,
    );
    const ator = {
      userId: 'u',
      cursinhoId: 'A',
      admin: false,
      editorCursinho: true,
    };
    await service.aplicarAtualizacoes(
      'p1',
      [{ de: 'a', para: 'b', extra: 'x' } as any],
      ator,
    );
    const [url, corpo, header] = axios.post.mock.calls[0];
    expect(url).toBe('v1/prova/p1/atualizacoes');
    expect(corpo).toEqual({ trocas: [{ de: 'a', para: 'b' }] });
    expect(JSON.parse(header['x-ator'])).toEqual(ator);
  });
});
