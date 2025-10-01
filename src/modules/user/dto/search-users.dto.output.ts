import { ApiProperty } from '@nestjs/swagger';

export class SearchUsersDtoOutput {
  @ApiProperty({ description: 'ID do usuário' })
  id: string;

  @ApiProperty({ description: 'Nome completo do usuário' })
  name: string;

  @ApiProperty({ description: 'Email do usuário' })
  email: string;

  @ApiProperty({ description: 'Telefone do usuário', required: false })
  phone?: string;
}
