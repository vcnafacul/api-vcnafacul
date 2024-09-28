import { ApiProperty } from '@nestjs/swagger';

export class HasInscriptionActiveDtoOutput {
  @ApiProperty()
  prepCourseName: string;

  @ApiProperty()
  hasActiveInscription: boolean;
}
