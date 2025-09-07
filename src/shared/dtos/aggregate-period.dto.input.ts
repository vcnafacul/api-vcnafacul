import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Period } from 'src/modules/user/enum/period';

export class AggregatePeriodDtoInput {
  @ApiProperty()
  @IsEnum(Period)
  groupBy: Period;
}
