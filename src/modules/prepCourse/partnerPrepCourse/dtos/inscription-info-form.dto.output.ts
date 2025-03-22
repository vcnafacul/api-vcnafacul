import { ApiProperty } from '@nestjs/swagger';

export class InscriptionInfoFormDtoOutput {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;
}
