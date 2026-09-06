import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetAllWithNameDtoInput {
  @ApiProperty({
    required: false,
    description:
      'Ano letivo. Quando informado, retorna apenas os processos seletivos que possuem ao menos um estudante em turma daquele período letivo.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}
