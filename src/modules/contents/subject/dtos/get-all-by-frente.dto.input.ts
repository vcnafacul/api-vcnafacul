import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GettAllByFrenteDtoInput extends GetAllDtoInput {
  @ApiProperty()
  @IsOptional()
  frenteId: number;
}
