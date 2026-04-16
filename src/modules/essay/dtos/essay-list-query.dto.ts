import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EssayStatus } from '../enums/essay-status.enum';

export class EssayListQueryDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsEnum(EssayStatus)
  status?: EssayStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
