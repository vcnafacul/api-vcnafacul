import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { Status } from '../enum/status.enum';

export class QuestaoDTOInput extends GetAllDtoInput {
  @ApiProperty()
  @IsNumberString()
  status: Status;
}
