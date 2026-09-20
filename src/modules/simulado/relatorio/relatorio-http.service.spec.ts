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

  it('buscarSimulados monta a URL com cursinhoId e sem :simuladoId', async () => {
    const { svc, axios } = montar();

    await svc.buscarSimulados('cur-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/simulados?cursinhoId=cur-1',
    );
  });

  it('buscarSimulados OMITE turmaId quando não vem', async () => {
    // `turmaId=` vazio chega ao ms como filtro por '' e devolve lista vazia
    const { svc, axios } = montar();

    await svc.buscarSimulados('cur-1');

    expect(axios.get.mock.calls[0][0]).not.toContain('turmaId');
  });

  it('buscarSimulados inclui turmaId quando vem', async () => {
    const { svc, axios } = montar();

    await svc.buscarSimulados('cur-1', 't-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/simulados?cursinhoId=cur-1&turmaId=t-1',
    );
  });

  it('buscarDetalheDoEstudante monta a URL com o usuário no caminho', async () => {
    const { svc, axios } = montar();

    await svc.buscarDetalheDoEstudante('sim-1', 'u1', 'cur-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1/estudante/u1?cursinhoId=cur-1',
    );
  });

  it('⚠️ não deixa o chamador escolher o cursinho via ? no parâmetro', async () => {
    // `%3F` vira `?` no param decodificado pelo Express; sem encoding, tudo
    // depois dele vira QUERY no ms e o cursinhoId legítimo cai num duplicado
    // descartado. Medido: devolvia 200 com as respostas de outro cursinho.
    const { svc, axios } = montar();

    await svc.buscarDetalheDoEstudante(
      'sim-1',
      'vitima?cursinhoId=cursinho-alheio&x=',
      'cur-1',
    );

    const url = axios.get.mock.calls[0][0] as string;
    // o `?` do atacante tem que estar escapado; só pode haver UM `?` na URL,
    // e o que vem depois dele é o nosso
    expect(url.split('?')).toHaveLength(2);
    expect(url).toContain('cursinhoId=cur-1');
    expect(url).not.toContain('cursinhoId=cursinho-alheio');
  });

  it('⚠️ não deixa o chamador trocar de rota via / no parâmetro', async () => {
    // `%2F` vira `/`, e o `URL` do Node normaliza `..`: o chamador escolhe
    // QUAL rota do ms o gateway chama, e não a que este serviço quis chamar.
    // (Este comentário já apontava o `GET /v1/historico/:id` como destino sem
    // gate — o card `11` fechou aquela rota; o escape é que segue valendo.)
    const { svc, axios } = montar();

    await svc.buscarDetalheDoEstudante(
      'sim-1',
      '../../../historico/abc',
      'cur-1',
    );

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).not.toContain('../');
    expect(url).toContain('/estudante/');
  });

  it('⚠️ o mesmo vale para o simuladoId nas rotas que já existiam', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1?cursinhoId=alheio&x=', 'cur-1');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url.split('?')).toHaveLength(2);
    expect(url).not.toContain('cursinhoId=alheio');
  });

  it('⚠️ e o simuladoId também não troca de rota', async () => {
    const { svc, axios } = montar();

    await svc.buscarQuestoes('../../../historico/abc', 'cur-1');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).not.toContain('../');
    expect(url).toContain('/questoes?');
  });

  it('⚠️ e para o turmaId', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1', 't-1?cursinhoId=alheio&x=');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url.split('?')).toHaveLength(2);
    expect(url).not.toContain('cursinhoId=alheio');
  });
});
