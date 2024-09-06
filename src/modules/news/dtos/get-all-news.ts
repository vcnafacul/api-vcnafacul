import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetAllNewsDtoInput extends GetAllDtoInput {
  @ApiProperty({ enum: Status })
  @IsOptional()
  status: Status | null = null;
}
