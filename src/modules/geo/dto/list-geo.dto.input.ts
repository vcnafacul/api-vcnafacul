import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { TypeGeo } from '../enum/typeGeo';

export class ListGeoDTOInput extends GetAllDtoInput {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, nullable: true })
  text?: string;

  @ApiProperty({ default: Status.Pending })
  @IsNumberString()
  status: Status = Status.Pending;

  @ApiProperty({ default: TypeGeo.PREP_COURSE })
  @IsEnum(TypeGeo)
  type: TypeGeo = TypeGeo.PREP_COURSE;
}
