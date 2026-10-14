import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetRecommendedDtoInput {
  @ApiProperty()
  @IsBoolean()
  isRecommended: boolean;
}

export class RecommendedRoleDtoOutput {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
