import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class HighlightedExcerptDto {
  @IsString()
  @IsNotEmpty()
  trecho: string;

  @IsString()
  @IsNotEmpty()
  tipo: 'positivo' | 'negativo';

  @IsString()
  @IsNotEmpty()
  comentario: string;
}

export class CreateEssayReviewDto {
  @IsInt()
  @Min(0)
  @Max(200)
  comp1Score: number;

  @IsString()
  @IsNotEmpty()
  comp1Feedback: string;

  @IsString()
  @IsNotEmpty()
  comp1Suggestion: string;

  @IsInt()
  @Min(0)
  @Max(200)
  comp2Score: number;

  @IsString()
  @IsNotEmpty()
  comp2Feedback: string;

  @IsString()
  @IsNotEmpty()
  comp2Suggestion: string;

  @IsInt()
  @Min(0)
  @Max(200)
  comp3Score: number;

  @IsString()
  @IsNotEmpty()
  comp3Feedback: string;

  @IsString()
  @IsNotEmpty()
  comp3Suggestion: string;

  @IsInt()
  @Min(0)
  @Max(200)
  comp4Score: number;

  @IsString()
  @IsNotEmpty()
  comp4Feedback: string;

  @IsString()
  @IsNotEmpty()
  comp4Suggestion: string;

  @IsInt()
  @Min(0)
  @Max(200)
  comp5Score: number;

  @IsString()
  @IsNotEmpty()
  comp5Feedback: string;

  @IsString()
  @IsNotEmpty()
  comp5Suggestion: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  totalScore: number;

  @IsString()
  @IsNotEmpty()
  generalComment: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HighlightedExcerptDto)
  highlightedExcerpts?: HighlightedExcerptDto[];
}
