import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { TypeGeo } from '../enum/typeGeo';

/** `status=-1`: todos os status (o `StatusEnum.All` do client). */
export const STATUS_TODOS = -1;

/** As "Revisões necessárias" do dash: os relatos do Localiza. */
export const REVISOES_GEO = [
  'reportAddress',
  'reportContact',
  'reportOther',
] as const;
export type RevisaoGeo = (typeof REVISOES_GEO)[number];

export class ListGeoDTOInput extends GetAllDtoInput {
  /** Nome, sigla ou campus (parcial). */
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, nullable: true })
  text?: string;

  @ApiProperty({
    default: Status.Pending,
    enum: [STATUS_TODOS, Status.Pending, Status.Approved, Status.Rejected],
  })
  @Type(() => Number)
  @IsIn([STATUS_TODOS, Status.Pending, Status.Approved, Status.Rejected])
  status: Status | typeof STATUS_TODOS = Status.Pending;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsEnum(TypeGeo)
  @IsOptional()
  type?: TypeGeo;

  /** E-mail do cursinho ou de quem cadastrou (parcial). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  /** UF, exata. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  /** Cidade (parcial). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  /** Tipo de cursinho, exato (Gratuito, Sem fins lucrativos, Outros). */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  /** `revisoes=reportAddress,reportContact`: tem QUALQUER uma delas. */
  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsIn(REVISOES_GEO, { each: true })
  revisoes?: RevisaoGeo[];
}
