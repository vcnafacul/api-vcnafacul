import { ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { ControllerExceptionsFilter } from './controller.filter';

function makeHost(url = '/rota') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host: any = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  };
  return { host, status, json };
}

describe('ControllerExceptionsFilter', () => {
  const filter = new ControllerExceptionsFilter();

  it('preserva campos extras do corpo do erro (ex.: contadores do 409)', () => {
    const { host, status, json } = makeHost('/mssimulado/categoria/cat-1');

    filter.catch(
      new ConflictException({
        message: 'Categoria em uso e não pode ser excluída',
        simuladosUsando: 2,
        provasUsando: 5,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const body = json.mock.calls[0][0];
    expect(body.simuladosUsando).toBe(2);
    expect(body.provasUsando).toBe(5);
    expect(body.message).toBe('Categoria em uso e não pode ser excluída');
    expect(body.statusCode).toBe(HttpStatus.CONFLICT);
    expect(body.path).toBe('/mssimulado/categoria/cat-1');
  });

  it('não deixa o corpo sobrescrever statusCode/path (autoridade é do filtro)', () => {
    const { host, json } = makeHost('/rota-real');

    filter.catch(
      new HttpException(
        { message: 'erro', statusCode: 999, path: '/rota-falsa' },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.path).toBe('/rota-real');
  });

  it('corpo string continua virando message, sem espalhar caracteres', () => {
    const { host, json } = makeHost();

    filter.catch(
      new HttpException('password invalid', HttpStatus.CONFLICT),
      host,
    );

    const body = json.mock.calls[0][0];
    expect(body.message).toBe('password invalid');
    // spread de string viraria { '0': 'p', '1': 'a', ... }
    expect(body['0']).toBeUndefined();
    expect(Object.keys(body).sort()).toEqual([
      'message',
      'path',
      'statusCode',
      'timestamp',
    ]);
  });

  it('corpo array (ValidationPipe) vira message, sem virar índices numéricos', () => {
    const { host, json } = makeHost();

    filter.catch(
      new HttpException(
        ['campo A inválido', 'campo B inválido'],
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    const body = json.mock.calls[0][0];
    expect(body.message).toEqual(['campo A inválido', 'campo B inválido']);
    expect(body['0']).toBeUndefined();
  });
});
