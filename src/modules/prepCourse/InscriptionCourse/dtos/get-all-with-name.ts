import { ApiProperty } from '@nestjs/swagger';

export class GetAllWithNameDtoOutput {
  @ApiProperty({
    description: 'ID do processo seletivo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;
  @ApiProperty({
    description: 'Nome do processo seletivo',
    example: 'Processo Seletivo 2025',
  })
  name: string;

  @ApiProperty({
    description: 'Data de início do processo seletivo',
    example: '2025-01-01',
  })
  startDate: Date;
  @ApiProperty({
    description: 'Data de fim do processo seletivo',
    example: '2025-01-01',
  })
  endDate: Date;

  @ApiProperty({
    description: 'Data de criação do processo seletivo',
    example: '2025-01-01',
  })
  createdAt: Date;
}
