import { ApiProperty } from '@nestjs/swagger';
import { Status } from 'src/modules/simulado/enum/status.enum';

export class InscriptionInfoFormDtoOutput {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  status: Status;
}
