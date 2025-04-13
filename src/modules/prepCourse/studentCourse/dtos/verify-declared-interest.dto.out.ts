import { ApiProperty } from '@nestjs/swagger';

export class VerifyDeclaredInterestDtoOutput {
  @ApiProperty()
  isFree: boolean;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  expired: boolean;

  @ApiProperty()
  convocaded: boolean;

  @ApiProperty()
  declared: boolean;

  @ApiProperty()
  requestDocuments: boolean;
}
