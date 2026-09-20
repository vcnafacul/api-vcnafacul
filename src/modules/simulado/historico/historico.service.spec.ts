import { HistoricoService } from './historico.service';

const montar = () => {
  const axios = { get: jest.fn().mockResolvedValue({}) };
  const httpServiceFactory = { create: jest.fn().mockReturnValue(axios) };
  const envService = { get: jest.fn().mockReturnValue('http://ms') };
  const cache = { wrap: jest.fn() };
  return {
    svc: new HistoricoService(
      httpServiceFactory as any,
      envService as any,
      cache as any,
    ),
    axios,
  };
};

describe('HistoricoService.getById', () => {
  it('⚠️ manda o DONO ao ms — é o gate inteiro', async () => {
    // Sem isto, qualquer usuário autenticado lia o histórico de qualquer outro
    // pelo id: respostas marcadas, gabarito, aproveitamento por matéria.
    const { svc, axios } = montar();

    await svc.getById('h1', 'u-dono');

    expect(axios.get).toHaveBeenCalledWith('v1/historico/h1?usuario=u-dono');
  });

  it('⚠️ um id que é um CAMINHO não alcança outra rota do ms', async () => {
    // `%2F` vira `/` e o `URL` do Node normaliza `..`. Sem encoding, um id
    // assim passa por baixo da checagem de dono indo parar noutra rota — a
    // mesma classe que o card 09 fechou no `relatorio-http.service.ts`, cujo
    // docblock cita ESTA rota pelo nome.
    const { svc, axios } = montar();

    await svc.getById('../../../historico/alheio', 'u-dono');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).not.toContain('../');
    expect(url).toContain('v1/historico/');
  });

  it('⚠️ e um id com `?` não sobrepõe o usuário', async () => {
    // mesmo defeito por outra porta: `%3F` vira `?` e tudo depois dele vira
    // query, descartando o `usuario` que este serviço acabou de resolver
    const { svc, axios } = montar();

    await svc.getById('h1?usuario=alheio&x=', 'u-dono');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url.split('?')).toHaveLength(2);
    expect(url).toContain('usuario=u-dono');
    expect(url).not.toContain('usuario=alheio');
  });
});

describe('HistoricoService.getPerformance', () => {
  it('⚠️ o userId também vai encodado', async () => {
    // mesma rota de ataque, mesmo arquivo — consertar só o `getById` deixaria
    // a porta ao lado aberta
    const { svc, axios } = montar();

    await svc.getPerformance('../../../historico/alheio');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).not.toContain('../');
    expect(url).toContain('v1/historico/performance/');
  });
});
