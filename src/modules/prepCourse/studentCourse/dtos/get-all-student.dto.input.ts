import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetAllStudentDtoInput extends GetAllDtoInput {
  @IsString()
  @ApiProperty()
  partnerPrepCourse: string;
}
