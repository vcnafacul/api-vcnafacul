import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetUserDtoInput extends GetAllDtoInput {
  @ApiProperty({ default: '', required: false })
  @IsOptional()
  name: string = '';

  @ApiProperty({ required: false })
  @IsOptional()
  roleId: string = '';

  /**
   * Só os colaboradores deste cursinho (card 06 de `tela-de-usuarios`) —
   * ativos e inativos. Combina com `name` e `roleId` (E).
   */
  @ApiProperty({ required: false })
  @IsOptional()
  partnerId: string = '';
}
