import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum AnswerType {
  Text = 'Text',
  Number = 'Number',
  Boolean = 'Boolean',
  Options = 'Options',
}

export enum AnswerCollectionType {
  Single = 'single',
  Multiple = 'multiple',
}

export class CreateQuestionDtoInput {
  @ApiProperty()
  @IsString()
  @IsOptional()
  sectionId: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  helpText?: string;

  @ApiProperty({ enum: AnswerType })
  @IsEnum(AnswerType)
  answerType: AnswerType;

  @ApiProperty({
    enum: AnswerCollectionType,
    default: AnswerCollectionType.Single,
  })
  @IsEnum(AnswerCollectionType)
  collection: AnswerCollectionType;

  // Só valida/exige quando for Options
  @ApiPropertyOptional({
    type: [String],
    description: 'Obrigatório quando answerType = Options',
  })
  @ValidateIf((o) => o.answerType === AnswerType.Options)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ArrayUnique() // opcional: evita opções duplicadas
  options?: string[];
}
