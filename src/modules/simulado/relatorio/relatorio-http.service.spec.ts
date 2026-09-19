import { RelatorioHttpService } from './relatorio-http.service';

const montar = () => {
  const axios = { get: jest.fn().mockResolvedValue({}) };
  const httpServiceFactory = { create: jest.fn().mockReturnValue(axios) };
  const envService = { get: jest.fn().mockReturnValue('http://ms') };
  return {
    svc: new RelatorioHttpService(httpServiceFactory as any, envService as any),
    axios,
  };
};

describe('RelatorioHttpService', () => {
  it('busca as linhas com o cursinho na query', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1?cursinhoId=cur-1',
    );
  });

  it('acrescenta a turma quando ela vem', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1', 't-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1?cursinhoId=cur-1&turmaId=t-1',
    );
  });

  it('sem turma, NÃO manda turmaId vazio', async () => {
    // `turmaId=` no ms vira filtro por string vazia e devolve lista vazia
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1');

    expect(axios.get.mock.calls[0][0]).not.toContain('turmaId');
  });

  it('escapa os valores na query', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur com espaço');

    expect(axios.get.mock.calls[0][0]).toContain('cur%20com%20espa');
  });

  it('busca o agregado por questão na rota de questões', async () => {
    const { svc, axios } = montar();

    await svc.buscarQuestoes('sim-1', 'cur-1', 't-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1/questoes?cursinhoId=cur-1&turmaId=t-1',
    );
  });
});
