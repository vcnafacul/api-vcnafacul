import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';

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

  @ApiProperty({ default: Status.Approved })
  @IsOptional()
  actived: Status = Status.Approved;

  @ApiProperty({
    description:
      'Representa o numero de vagas esperada para o periodo de inscrição',
  })
  @IsNumber()
  @Min(1)
  expectedOpening: number;
}
