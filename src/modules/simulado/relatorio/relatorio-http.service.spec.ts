import { RelatorioHttpService } from './relatorio-http.service';

const montar = () => {
  const axios = {
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
  };
  const httpServiceFactory = { create: jest.fn().mockReturnValue(axios) };
  const envService = { get: jest.fn().mockReturnValue('http://ms') };
  return {
    svc: new RelatorioHttpService(httpServiceFactory as any, envService as any),
    axios,
  };
};

describe('RelatorioHttpService', () => {
  it('⚠️ POST com o cursinho no CORPO, não na query', async () => {
    // Card 18: o recorte passou a ser uma LISTA de usuários, que não cabe numa
    // query string — um UUID ocupa 36 caracteres e uma turma de 50 passa de
    // 2.300, acima do limite seguro de URL.
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1');

    expect(axios.post).toHaveBeenCalledWith('v1/relatorio-simulado/sim-1', {
      cursinhoId: 'cur-1',
    });
  });

  it('⚠️ manda a lista de usuarios quando há recorte', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1', ['u1', 'u2']);

    expect(axios.post).toHaveBeenCalledWith('v1/relatorio-simulado/sim-1', {
      cursinhoId: 'cur-1',
      usuarios: ['u1', 'u2'],
    });
  });

  it('⚠️ sem recorte, a chave `usuarios` nem aparece', async () => {
    // Ausente = cursinho inteiro. Um `[]` significaria "nenhum estudante", e o
    // ms o recusa de propósito — mandar `usuarios: undefined` no JSON some, mas
    // a chave explícita seria confusa de ler no log.
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1');

    expect(axios.post.mock.calls[0][1]).not.toHaveProperty('usuarios');
  });

  it('busca o agregado por questão na rota de questões', async () => {
    const { svc, axios } = montar();

    await svc.buscarQuestoes('sim-1', 'cur-1', ['u1']);

    expect(axios.post).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1/questoes',
      { cursinhoId: 'cur-1', usuarios: ['u1'] },
    );
  });

  it('buscarSimulados usa a rota literal, sem :simuladoId', async () => {
    const { svc, axios } = montar();

    await svc.buscarSimulados('cur-1');

    expect(axios.post).toHaveBeenCalledWith('v1/relatorio-simulado/simulados', {
      cursinhoId: 'cur-1',
    });
  });

  it('buscarSimulados manda os usuarios quando há recorte', async () => {
    const { svc, axios } = montar();

    await svc.buscarSimulados('cur-1', ['u7']);

    expect(axios.post).toHaveBeenCalledWith('v1/relatorio-simulado/simulados', {
      cursinhoId: 'cur-1',
      usuarios: ['u7'],
    });
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

  it('⚠️ o simuladoId no CAMINHO continua escapado, mesmo com POST', async () => {
    // O corpo tirou o cursinho da URL, mas o `:simuladoId` segue sendo
    // segmento de caminho — e o `seg()` continua sendo o que impede o chamador
    // de reescrever a rota do ms.
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1?cursinhoId=alheio&x=', 'cur-1');

    const url = axios.post.mock.calls[0][0] as string;
    expect(url).not.toContain('?');
    expect(url).toContain('sim-1%3F');
  });

  it('⚠️ e o simuladoId também não troca de rota', async () => {
    const { svc, axios } = montar();

    await svc.buscarQuestoes('../../../historico/abc', 'cur-1');

    const url = axios.post.mock.calls[0][0] as string;
    expect(url).not.toContain('../');
    expect(url).toContain('/questoes');
  });

  it('⚠️ o cursinhoId no CORPO é imune a injeção de query', async () => {
    // Era o vetor do card 07: um `?` no valor virava query e sobrepunha o
    // cursinho legítimo. No corpo não existe `?` com significado — o valor
    // chega ao ms exatamente como saiu daqui.
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1?cursinhoId=alheio');

    expect(axios.post.mock.calls[0][1]).toEqual({
      cursinhoId: 'cur-1?cursinhoId=alheio',
    });
  });
});
