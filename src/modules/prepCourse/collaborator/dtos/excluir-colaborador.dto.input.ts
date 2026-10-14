import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ExcluirColaboradorDtoInput {
  /**
   * Perfil que a pessoa recebe ao sair — um de `GET /role/recommended`.
   * Sem ele, `aluno` (tickets/040, card 04).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleId?: string;
}
