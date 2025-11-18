import { ApiProperty } from '@nestjs/swagger';

export class LoginTokenDTO {
  @ApiProperty({
    description: 'JWT access token válido por 15 minutos',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token para renovar o access token',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Tempo de expiração do access token em segundos',
    example: 900,
  })
  expires_in: number;
}
