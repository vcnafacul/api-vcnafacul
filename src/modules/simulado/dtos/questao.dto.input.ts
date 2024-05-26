import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { Status } from '../enum/status.enum';

export class QuestaoDTOInput extends GetAllDtoInput {
  @ApiProperty()
  @IsOptional()
  @IsNumberString()
  status?: Status | undefined;

  @ApiProperty({ default: '' })
  @IsString()
  materia: string = '';

  @ApiProperty({ default: '' })
  @IsString()
  frente: string = '';

  @ApiProperty({ default: '' })
  @IsString()
  prova: string = '';

  @ApiProperty({ default: '' })
  @IsString()
  enemArea: string = '';

  @ApiProperty()
  @IsString()
  @IsOptional()
  text: string = '';
}
