import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetAllInscriptionCourseDtoInput extends GetAllDtoInput {
  @ApiProperty()
  @IsOptional()
  partnerId: string;
}
