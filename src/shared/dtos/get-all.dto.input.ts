import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { GetAllInput } from '../modules/base/interfaces/get-all.input';

/**
 * Teto de itens por página.
 *
 * ⚠️ **1000, e não os 500 do `ms-simulado`** (`ms#186`). MEDIDO: `getGeolocation`
 * pede `limit=1000` numa rota LOCAL desta api (`/geo`) para plotar o mapa da
 * Home, que é página pública. O ms não tem lookup assim — lá 500 bastava.
 *
 * ⚠️ E o corte seria **silencioso**: com teto 500, um mapa de 600 pontos
 * perderia 100 sem erro, sem log, sem nada. Foi o argumento que derrubou o
 * teto menor. O maior pedido real medido no client é 1000.
 */
export const LIMITE_MAXIMO = 1000;

export class GetAllDtoInput implements GetAllInput {
  /**
   * ⚠️ Os decorators abaixo NÃO são higiene — são o conserto.
   *
   * O `main.ts` instala `ValidationPipe({ transform: true })` **sem**
   * `enableImplicitConversion`, então sem `@Type()` nada converte: o valor
   * chegava como STRING com o tipo declarado mentindo `number`.
   *
   * O caminho feliz sobrevivia por coerção aritmética do JavaScript
   * (`("2" - 1) * "10"` é `10`), e só a borda quebrava: `?page=` vazio,
   * `page=0` e `page=-5` viravam `skip` negativo, que o TypeORM emite INLINE
   * no SQL e o MySQL recusa com `ER_PARSE_ERROR` — um **500** que `?page=`
   * sozinho já disparava. `page=abc` virava `NaN` e o TypeORM lançava
   * `TypeORMError`, outro 500.
   */
  @ApiProperty({ default: 1, required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * ⚠️ A coerção para inteiro é também o que torna SEGURA a concatenação crua
   * de query em cinco serviços de proxy (`v1/frente?page=${page}&limit=${limit}`
   * em `simulado`, `subject`, `content`, `materia`, `frente`): um inteiro
   * validado não pode conter `#`, `&` nem `?`. É a mesma classe de defeito do
   * card 11, fechada aqui pela validação em vez de pela montagem da URL.
   */
  @ApiProperty({
    default: 100,
    required: false,
    minimum: 1,
    maximum: LIMITE_MAXIMO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO)
  limit: number = 100;
}
