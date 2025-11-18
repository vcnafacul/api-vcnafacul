import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDtoInput {
  @IsOptional() // ✅ Agora é opcional (prioriza cookie)
  @IsString()
  @ApiProperty({
    description:
      'Refresh token recebido no login (OPCIONAL - prioriza cookie httpOnly)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  refresh_token?: string;
}
