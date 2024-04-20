import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class ListGeoDTOInput extends GetAllDtoInput {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, nullable: true })
  text?: string;

  @ApiProperty({ default: Status.Pending })
  @IsNumberString()
  status: Status = Status.Pending;
}
