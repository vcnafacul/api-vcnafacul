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
    //
    // ⚠️ O dono do fixture carrega `&` e `#` DE PROPÓSITO: um id que encode
    // para si mesmo deixaria o `seg()` do SEGUNDO argumento passar sem ser
    // exercido — tirá-lo continuaria verde. Com estes caracteres, não.
    const { svc, axios } = montar();

    await svc.getById('h1', 'u-dono&x=1#y');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/historico/h1?usuario=u-dono%26x%3D1%23y',
    );
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

describe('HistoricoService.getAllByUser', () => {
  it('⚠️ um `#` num valor da query NÃO descarta o userId do JWT', async () => {
    // O `URL` do axios corta tudo depois do `#`. Concatenando cru, o
    // `userId` que o serviço acrescenta no fim ia junto — e o ms recebia
    // só o `userId` que o atacante embutiu. Medido contra socket real.
    const { svc, axios } = montar();

    await svc.getAllByUser({ page: '1&userId=VITIMA#' } as never, 'u-jwt');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).not.toContain('#');
    expect(url).toContain('userId=u-jwt');
    expect(url).not.toContain('userId=VITIMA');
  });

  it('⚠️ um userId que sobreviva na query é SOBRESCRITO pelo do JWT', async () => {
    const { svc, axios } = montar();

    await svc.getAllByUser({ userId: 'VITIMA' } as never, 'u-jwt');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).toContain('userId=u-jwt');
    expect(url).not.toContain('userId=VITIMA');
  });

  it('a query normal continua passando', async () => {
    const { svc, axios } = montar();

    await svc.getAllByUser({ page: 2, limit: 50 } as never, 'u-jwt');

    const url = axios.get.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=50');
    expect(url).toContain('userId=u-jwt');
  });
});
