import { CadernoTemplateHttpService } from './caderno-template-http.service';

const montar = () => {
  const axios = {
    get: jest.fn().mockResolvedValue({ versao: 3 }),
    post: jest.fn().mockResolvedValue({ versao: 4 }),
    delete: jest.fn().mockResolvedValue(undefined),
    getBinary: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: {},
    }),
  };
  const factory = { create: jest.fn().mockReturnValue(axios) };
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') };
  return {
    service: new CadernoTemplateHttpService(factory as any, env as any),
    axios,
  };
};

describe('as rotas simples', () => {
  // Os cinco não recebem argumento nenhum: o que se prova aqui é só o par
  // verbo/rota. Três colunas, três `%s` — nome de teste deslocado faz alguém
  // ler o teste errado quando ele ficar vermelho daqui a um ano.
  it.each([
    ['publicada', 'get', 'v1/caderno/template'],
    ['rascunho', 'get', 'v1/caderno/template/rascunho'],
    ['versoes', 'get', 'v1/caderno/template/versoes'],
    ['descartarRascunho', 'delete', 'v1/caderno/template/rascunho'],
    ['publicar', 'post', 'v1/caderno/template/rascunho/publicar'],
  ])('%s bate em %s %s', async (metodo, verbo, rota) => {
    const { service, axios } = montar();
    await (service as any)[metodo]();
    // Só o caminho: o segundo argumento varia por método e não é o assunto.
    expect(axios[verbo].mock.calls[0][0]).toBe(rota);
  });
});

describe('restaurar', () => {
  it('manda o criadorId do JWT no corpo, e o número na rota', async () => {
    // ⚠️ `criadorId` é campo INTERNO: o ms o exige e ele vem do JWT, nunca do
    // cliente. É o padrão de prova-create.dto.request.ts:13.
    const { service, axios } = montar();
    await service.restaurar(2, 'user-1');

    const [rota, corpo] = axios.post.mock.calls[0];
    expect(rota).toBe('v1/caderno/template/versoes/2/restaurar');
    expect(corpo).toEqual({ criadorId: 'user-1' });
  });

  it('NÃO manda notas — o ms descarta o campo', async () => {
    // ⚠️ Medido no ms: `restaurar` de lá é `service.restaurar(n,
    // dto.criadorId)` e o docblock diz que ignorar `notas` é de propósito
    // ("quem escreve a nota é o serviço: 'Restaurado da versão N'").
    // Mandar o campo seria oferecer ao coordenador um texto que some sem
    // erro. `not.toHaveProperty` e não `toEqual`: `toEqual` deixa passar um
    // `notas: undefined`, que é exatamente como a regressão voltaria.
    const { service, axios } = montar();
    await service.restaurar(2, 'user-1');

    const [, corpo] = axios.post.mock.calls[0];
    expect(corpo).not.toHaveProperty('notas');
  });

  it('o número entra reserializado, não concatenado como texto', async () => {
    // ⚠️ O card 05 já deixou escrito: concatenar valor de query ou de path na
    // chamada ao ms é injeção de parâmetro. O controller valida, e aqui o
    // tipo é `number` — se algum dia chegar string, o TS acusa.
    const { service, axios } = montar();
    await service.restaurar(7, 'u');
    expect(axios.post.mock.calls[0][0]).toBe(
      'v1/caderno/template/versoes/7/restaurar',
    );
  });
});

describe('zipDeTeste', () => {
  it('sem opção nenhuma, chama a rota nua', async () => {
    const { service, axios } = montar();
    await service.zipDeTeste({});
    expect(axios.getBinary).toHaveBeenCalledWith('v1/caderno/template/teste');
  });

  it('versao vira ?versao=N', async () => {
    const { service, axios } = montar();
    await service.zipDeTeste({ versao: 3 });
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/template/teste?versao=3',
    );
  });

  it('rascunho vira o LITERAL ?rascunho=1', async () => {
    // ⚠️ Literal, nunca o valor recebido. Quem interpreta o que o cliente
    // mandou é o controller; aqui já chega decidido.
    const { service, axios } = montar();
    await service.zipDeTeste({ rascunho: true });
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/template/teste?rascunho=1',
    );
  });

  it('devolve o buffer e o content-type do ms', async () => {
    const { service } = montar();
    const r = await service.zipDeTeste({});
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.contentType).toBe('application/zip');
  });
});
