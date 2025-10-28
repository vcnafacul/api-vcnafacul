import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class SendBulkEmailDtoInput {
  @ApiProperty({
    description: 'Lista de IDs dos usuários que receberão o email',
    example: ['id1', 'id2', 'id3'],
    required: false,
  })
  @ValidateIf((o) => !o.sendToAll)
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @ApiProperty({
    description: 'Texto do email que será enviado',
    example: 'Olá! Este é um comunicado importante...',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Assunto do email',
    example: 'Comunicado Importante',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description:
      'Se true, envia o email para todos os usuários do sistema. Ignora userIds.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendToAll?: boolean;
}
