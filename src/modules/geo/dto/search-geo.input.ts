import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchGeoDtoInput {
  @ApiProperty({
    description: 'Nome do Cursinho Popular',
    example: 'Cursinho Você na Facul',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
