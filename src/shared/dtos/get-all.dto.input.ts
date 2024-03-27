import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GetAllInput } from '../modules/base/interfaces/get-all.input';

export class GetAllDtoInput implements GetAllInput {
  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ default: 30, required: false })
  @IsOptional()
  limit: number = 30;

  @ApiProperty({ required: false })
  @IsOptional()
  where?: object;
}
