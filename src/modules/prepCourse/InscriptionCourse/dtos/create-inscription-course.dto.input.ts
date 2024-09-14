import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartnerPrepCourseExist } from '../../partnerPrepCourse/validator/partner-pret-course-exist.validator';

export class CreateInscriptionCourseInput {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDateString()
  startDate: Date;

  @ApiProperty()
  @IsDateString()
  endDate: Date;

  @ApiProperty({ default: true })
  @IsOptional()
  actived: boolean = true;

  @ApiProperty({
    description:
      'Representa o numero de vagas esperada para o periodo de inscrição',
  })
  @IsNumber()
  expectedOpening: number;

  @ApiProperty()
  @PartnerPrepCourseExist({ message: 'O curso de preparação não existe' })
  @IsString()
  partnerPrepCourse: string;
}
