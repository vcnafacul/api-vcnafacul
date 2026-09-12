import { BadRequestException } from '@nestjs/common';
import { ObjectIdPipe } from './object-id.pipe';

describe('ObjectIdPipe', () => {
  const pipe = new ObjectIdPipe();

  it('deixa passar um ObjectId', () => {
    expect(pipe.transform('65ecc850a528b39d273e7900')).toBe(
      '65ecc850a528b39d273e7900',
    );
  });

  it('aceita maiúsculas', () => {
    expect(pipe.transform('65ECC850A528B39D273E7900')).toBe(
      '65ECC850A528B39D273E7900',
    );
  });

  it('recusa o que sairia do caminho na URL do ms', () => {
    // ⚠️ MEDIDO: o Express casa `..%2F..%2F` como UM segmento (200) e entrega
    // o valor DECODIFICADO. Como o service concatena o id na URL, isso faz a
    // api chamar http://ms-simulado:3000/v1/simulado/outro — qualquer rota do
    // ms, com a posição de rede da api, inclusive rotas expostas atrás de
    // OUTRAS permissões.
    for (const hostil of [
      '../../v1/simulado/outro',
      'abc?draft=true',
      'abc#frag',
      'abc/def',
      '..%2F..%2Fv1',
      '%2E%2E%2Fv1%2Fsimulado%2Foutro',
      'http://169.254.169.254/',
    ]) {
      expect(() => pipe.transform(hostil)).toThrow(BadRequestException);
    }
  });

  it('recusa comprimento errado e caractere fora do hex', () => {
    expect(() => pipe.transform('65ecc850a528b39d273e790')).toThrow(); // 23
    expect(() => pipe.transform('65ecc850a528b39d273e79000')).toThrow(); // 25
    expect(() => pipe.transform('65ecc850a528b39d273e790g')).toThrow(); // g
  });

  it('recusa vazio, undefined e não-string', () => {
    expect(() => pipe.transform('')).toThrow();
    expect(() => pipe.transform(undefined as unknown as string)).toThrow();
    expect(() => pipe.transform(123 as unknown as string)).toThrow();
  });

  it('a lista de proibidos deixaria passar o duplo-codificado', () => {
    // `%2E%2E%2F` não contém `.`, `/`, `?` nem `#` — uma lista de caracteres
    // proibidos o aceita. Depois de mais uma rodada de decodificação, é `../`.
    // É por isso que a regra é allowlist: o formato do id é fechado, e a
    // lista de coisas ruins nunca acaba.
    expect(() => pipe.transform('%2E%2E%2Fv1%2Fsimulado%2Foutro')).toThrow();
  });

  it('a mensagem não devolve o valor recebido', () => {
    // Ecoar a entrada num corpo de erro é como um XSS refletido nasce, e não
    // ajuda quem chamou: o formato esperado é a informação útil.
    try {
      pipe.transform('<script>alert(1)</script>');
      fail('deveria ter lançado');
    } catch (e) {
      expect(
        JSON.stringify((e as BadRequestException).getResponse()),
      ).not.toContain('script');
    }
  });
});
