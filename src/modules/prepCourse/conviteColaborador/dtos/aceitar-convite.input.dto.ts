import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AceitarConviteDtoInput {
  @ApiProperty({ description: 'o token do link do email' })
  @IsString()
  token: string;
}
