import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateInscriptionCourseInput } from './create-inscription-course.dto.input';
import { IsString } from 'class-validator';

export class UpdateInscriptionCourseDTOInput extends PartialType(
  CreateInscriptionCourseInput,
) {
  @IsString()
  @ApiProperty()
  id: string;
}
