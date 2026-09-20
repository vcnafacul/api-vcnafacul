import { ApiProperty } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetHistoricoDTOInput extends GetAllDtoInput {
  @ApiProperty()
  /**
   * ⚠️ **Sem decorator de class-validator de propósito? Não — por acidente.**
   *
   * Quem impede um `userId` injetado pelo cliente é o `whitelist: true` da
   * `ValidationPipe` global (`main.ts`), que descarta a propriedade antes de o
   * serviço montar a query. O `getAllByUser` então acrescenta o id do JWT no
   * fim, e o escopo se mantém.
   *
   * **Funciona, mas não por desenho.** Um `@IsOptional()` aqui e o `whitelist`
   * passa a deixar o valor entrar — e o escopo do histórico cai junto. Não
   * acrescente validação a este campo sem tratar disso no serviço.
   */
  userId: number;
}
