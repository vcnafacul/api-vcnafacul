import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import {
  Filter,
  GetAllInput,
  Sort,
} from 'src/shared/modules/base/interfaces/get-all.input';

export class GetEnrolleds implements GetAllInput {
  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ default: 30, required: false })
  @IsOptional()
  limit: number = 30;

  @ApiProperty({ required: false })
  @IsOptional()
  filter?: Filter | undefined;

  @ApiProperty({ required: false })
  @IsOptional()
  sort?: Sort;
}
