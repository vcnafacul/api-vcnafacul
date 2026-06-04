import { ApiProperty } from '@nestjs/swagger';
import { PermissionType } from '../permissions/permission-hierarchy';

export class PermissionNodeResponseDto {
  @ApiProperty({ example: 'criar_questao' })
  key: string;

  @ApiProperty({ example: 'Criar questão' })
  label: string;

  @ApiProperty({ enum: PermissionType, example: PermissionType.project })
  type: PermissionType;

  @ApiProperty({ example: true })
  value: boolean;
}

export class PermissionGroupResponseDto {
  @ApiProperty({ example: 'questoes' })
  key: string;

  @ApiProperty({ example: 'Questões' })
  label: string;

  @ApiProperty({ type: [PermissionNodeResponseDto] })
  permissions: PermissionNodeResponseDto[];
}
