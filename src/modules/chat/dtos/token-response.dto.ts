import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ description: 'Firebase custom token (validade 1h)' })
  token: string;
}
