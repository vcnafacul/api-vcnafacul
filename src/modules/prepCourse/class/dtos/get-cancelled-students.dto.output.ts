import { ApiProperty } from '@nestjs/swagger';

export class CancelledStudentDtoOutput {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description:
      'Mascarado quando o papel do requisitante nao tem gerenciarEstudantes',
  })
  email: string;

  @ApiProperty()
  cod_enrolled: string;

  @ApiProperty({
    nullable: true,
    description: 'createdAt do log do cancelamento mais recente',
  })
  cancelledAt: Date | null;

  @ApiProperty({
    nullable: true,
    description: 'description do log do cancelamento mais recente',
  })
  justification: string | null;
}
