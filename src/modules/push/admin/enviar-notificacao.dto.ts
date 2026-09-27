import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PublicoDoEnvio } from '../push-notification.entity';

/**
 * Públicos do MVP (decisão nº 1 da série, 2026-09-27): todos, por função e
 * por e-mail. "Alunos de um cursinho" fica para quando coordenadores puderem
 * enviar — aí o público precisa ser escopado ao cursinho de quem envia.
 */
export const PUBLICOS_DO_ADMIN = ['all', 'roles', 'emails'] as const;

export class PublicoDoAdminDto {
  @ApiProperty({ enum: PUBLICOS_DO_ADMIN })
  @IsIn(PUBLICOS_DO_ADMIN)
  type: (typeof PUBLICOS_DO_ADMIN)[number];

  @ApiProperty({ required: false, type: [String] })
  @ValidateIf((o) => o.type === 'roles')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  roleIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  @ValidateIf((o) => o.type === 'emails')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5000)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  emails?: string[];
}

export class PreviewDoPublicoDtoInput {
  @ApiProperty({ type: PublicoDoAdminDto })
  @ValidateNested()
  @Type(() => PublicoDoAdminDto)
  audience: PublicoDoAdminDto;
}

export class EnviarNotificacaoDtoInput extends PreviewDoPublicoDtoInput {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;

  /** Validado de novo no service: só caminho do próprio site. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  url?: string;
}

/**
 * DTO → público do serviço, só com os campos do tipo: é isto que vai para o
 * histórico, e um `roleIds` sobrando num envio para "todos" confundiria quem lê.
 */
export function paraPublico(dto: PublicoDoAdminDto): PublicoDoEnvio {
  switch (dto.type) {
    case 'roles':
      return { type: 'roles', roleIds: dto.roleIds ?? [] };
    case 'emails':
      return { type: 'emails', emails: dto.emails ?? [] };
    default:
      return { type: 'all' };
  }
}
