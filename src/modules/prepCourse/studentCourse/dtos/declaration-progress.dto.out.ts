import { ApiProperty } from '@nestjs/swagger';

export class DeclarationProgressDtoOutput {
  @ApiProperty()
  documentsDone: boolean;

  @ApiProperty()
  photoDone: boolean;

  @ApiProperty()
  surveyDone: boolean;

  @ApiProperty()
  declared: boolean;
}
