import { ValidationPipe } from '@nestjs/common';
import { QuestaoDTOInput } from '../dtos/questao.dto.input';
import { urlDaListagem } from './questao.service';

/** tickets/043, card 02 — os filtros novos chegam ao ms, codificados. */
describe('listagem do banco de questões (043/02)', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const passar = (q: object) =>
    pipe.transform(q, { type: 'query', metatype: QuestaoDTOInput });

  it('⚠️ o whitelist mantém os filtros novos (sem estar no DTO, sumiam calados)', async () => {
    const dto = await passar({
      page: '1',
      limit: '40',
      exame: '64cae409573a2b3d03e58d37',
      categoria: '64ea7f7023b75cddf33b67e7',
      revisoes: 'textClassification,reported',
      comImagem: 'true',
      lixo: 'x',
    });
    expect(dto).toMatchObject({
      exame: '64cae409573a2b3d03e58d37',
      categoria: '64ea7f7023b75cddf33b67e7',
      revisoes: 'textClassification,reported',
      comImagem: 'true',
    });
    expect(dto).not.toHaveProperty('lixo');
  });

  it('flag de revisão desconhecida e exame que não é ObjectId → 400', async () => {
    await expect(passar({ revisoes: 'reported,imageId' })).rejects.toThrow();
    await expect(passar({ exame: 'enem' })).rejects.toThrow();
  });

  it('a URL codifica os valores e não manda vazio', () => {
    expect(
      urlDaListagem({
        page: 1,
        text: 'a&b #2',
        materia: '',
        revisoes: 'textClassification,reported',
        comImagem: 'true',
        exame: undefined,
      }),
    ).toBe(
      'v1/questao?page=1&text=a%26b%20%232&revisoes=textClassification%2Creported&comImagem=true',
    );
  });
});
