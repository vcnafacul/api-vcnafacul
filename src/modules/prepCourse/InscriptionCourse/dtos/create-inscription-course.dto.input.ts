import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInscriptionCourseInput {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  description?: string;

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
}
