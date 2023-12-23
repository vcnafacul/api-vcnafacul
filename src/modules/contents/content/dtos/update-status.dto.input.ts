import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';
import { StatusContent } from '../enum/status-content';

export class UpdateStatusDTOInput {
  @ApiProperty()
  @IsNumber()
  id: number; //precisa verificar se o subject existe

  @ApiProperty({ enum: StatusContent })
  @IsEnum(StatusContent)
  status: StatusContent;
}
