import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchUsersDtoInput {
  @ApiProperty({
    description: 'Nome para buscar nos campos firstName + lastName',
    example: 'João Silva',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
