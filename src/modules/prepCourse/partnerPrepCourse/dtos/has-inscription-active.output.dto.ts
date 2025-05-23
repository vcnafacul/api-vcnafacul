import { ApiProperty } from '@nestjs/swagger';
import { InscriptionInfoFormDtoOutput } from './inscription-info-form.dto.output';

export class HasInscriptionActiveDtoOutput {
  @ApiProperty()
  prepCourseName: string;

  @ApiProperty()
  inscription?: InscriptionInfoFormDtoOutput;
}
