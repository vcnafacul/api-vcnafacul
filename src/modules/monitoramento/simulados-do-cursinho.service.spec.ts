import { BadGatewayException, HttpException } from '@nestjs/common';
import { SimuladosDoCursinhoService } from './simulados-do-cursinho.service';

describe('SimuladosDoCursinhoService (044/05)', () => {
  const montar = (msGet: jest.Mock) => {
    const gravado: string[] = [];
    // o `wrap` de verdade só grava o que resolve: o dublê imita isso
    const cache = {
      wrap: jest.fn(async (chave: string, fn: () => Promise<unknown>) => {
        const valor = await fn();
        gravado.push(chave);
        return valor;
      }),
    };
    const factory = { create: jest.fn(() => ({ get: msGet })) };
    const env = { get: jest.fn(() => 'http://ms') };
    const service = new SimuladosDoCursinhoService(
      cache as never,
      factory as never,
      env as never,
    );
    return { service, cache, gravado };
  };

  it('repassa a rota do ms com os parâmetros codificados', async () => {
    const msGet = jest.fn().mockResolvedValue({ historicTotal: 3 });
    const { service, cache } = montar(msGet);
    await expect(service.resumo('a&b')).resolves.toEqual({ historicTotal: 3 });
    expect(msGet).toHaveBeenCalledWith(
      'v1/monitoramento/historico/resumo?cursinhoId=a%26b',
    );
    expect(cache.wrap.mock.calls[0][0]).toBe(
      'monitoramento:simulados-resumo:a&b:-',
    );
    await service.porTipo('A', 'year' as never);
    expect(msGet).toHaveBeenLastCalledWith(
      'v1/monitoramento/historico/por-tipo?cursinhoId=A&groupBy=year',
    );
  });

  it('ms fora do ar → 502 e nada no cache', async () => {
    const { service, gravado } = montar(
      jest.fn().mockRejectedValue(new HttpException('down', 500)),
    );
    await expect(
      service.porPeriodo('A', 'month' as never),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(gravado).toEqual([]);
  });

  it('4xx do ms passa adiante', async () => {
    const { service } = montar(
      jest.fn().mockRejectedValue(new HttpException('bad', 400)),
    );
    await expect(service.resumo('A')).rejects.toMatchObject({ status: 400 });
  });
});
