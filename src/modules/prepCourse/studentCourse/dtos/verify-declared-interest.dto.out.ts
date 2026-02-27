import { ApiProperty } from '@nestjs/swagger';

export class VerifyDeclaredInterestDtoOutput {
  @ApiProperty()
  isFree: boolean;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  expired: boolean;

  @ApiProperty()
  convocated: boolean;

  @ApiProperty()
  declared: boolean;

  @ApiProperty()
  requestDocuments: boolean;

  @ApiProperty()
  documentsDone: boolean;

  @ApiProperty()
  photoDone: boolean;

  @ApiProperty()
  surveyDone: boolean;
}
