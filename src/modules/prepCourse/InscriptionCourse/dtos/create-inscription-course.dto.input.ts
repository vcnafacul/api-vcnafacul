import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @ApiProperty({
    description:
      'Representa o numero de vagas esperada para o periodo de inscrição',
  })
  @IsNumber()
  @Min(1)
  expectedOpening: number;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  requestDocuments: boolean = false;
}
