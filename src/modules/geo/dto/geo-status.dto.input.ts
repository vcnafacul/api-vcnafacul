import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { MotivoRejeicaoGeo } from '../enum/motivo-rejeicao';

export class GeoStatusChangeDTOInput {
  @IsString()
  @ApiProperty()
  geoId: string;

  @IsEnum(Status)
  @ApiProperty({ enum: Status })
  status: Status;

  /** Obrigatório ao rejeitar. */
  @ValidateIf((dto) => dto.status === Status.Rejected)
  @IsEnum(MotivoRejeicaoGeo, { message: 'Escolha o motivo da rejeição' })
  @ApiProperty({ enum: MotivoRejeicaoGeo, required: false })
  motivo?: MotivoRejeicaoGeo;

  /** Complemento do motivo; obrigatório no "Outro". */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (dto) => dto.motivo === MotivoRejeicaoGeo.Outro || !!dto.refuseReason,
  )
  @IsString()
  @IsNotEmpty({ message: 'Descreva o motivo da rejeição' })
  @MaxLength(500)
  @ApiProperty({ required: false, maxLength: 500 })
  refuseReason?: string;
}
