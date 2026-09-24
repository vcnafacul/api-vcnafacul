import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TrocarFuncaoDoConviteDtoInput {
  @ApiProperty()
  @IsString()
  roleId: string;
}
