import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { StatusContent } from '../enum/status-content';

export class UpdateStatusDTOInput {
  @ApiProperty()
  @IsString()
  id: string; //precisa verificar se o subject existe

  @ApiProperty({ enum: StatusContent })
  @IsEnum(StatusContent)
  status: StatusContent;
}
