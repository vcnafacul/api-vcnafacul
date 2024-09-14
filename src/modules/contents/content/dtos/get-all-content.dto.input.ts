import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { StatusContent } from '../enum/status-content';
import { GetAllContentInput } from '../interface/get-all-content.input';

export class GetAllContentDtoInput
  extends GetAllDtoInput
  implements GetAllContentInput
{
  @ApiProperty({ enum: StatusContent })
  @IsOptional()
  status?: StatusContent;

  @ApiProperty()
  @IsOptional()
  subjectId?: string;

  @ApiProperty()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsOptional()
  materia?: number;
}
