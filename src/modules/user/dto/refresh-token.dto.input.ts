import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDtoInput {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Refresh token recebido no login',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  refresh_token: string;
}
