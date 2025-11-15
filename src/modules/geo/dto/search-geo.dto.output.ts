import { ApiProperty } from '@nestjs/swagger';

export class SearchGeoDtoOutput {
  @ApiProperty({ description: 'ID do usuário' })
  id: string;

  @ApiProperty({ description: 'Nome completo do usuário' })
  name: string;
}
