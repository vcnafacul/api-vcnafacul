import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateInscriptionCourseInput {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ default: true })
  @IsOptional()
  actived: boolean = true;

  @ApiProperty({
    description:
      'Representa o numero de vagas esperada para o periodo de inscrição',
  })
  expectedOpening: number;

  @ApiProperty()
  partnerPrepCourse: number;
}
