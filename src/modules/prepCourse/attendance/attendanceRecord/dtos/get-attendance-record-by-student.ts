import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetAttendanceRecordByStudent extends GetAllDtoInput {
  @ApiProperty({ required: true })
  @IsString()
  id: string;

  @ApiProperty({ required: true })
  @IsString()
  studentId: string;
}
