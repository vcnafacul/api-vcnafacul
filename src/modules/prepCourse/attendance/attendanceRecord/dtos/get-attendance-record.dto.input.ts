import { ApiProperty } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetAttendanceRecord extends GetAllDtoInput {
  @ApiProperty({ required: true })
  classId: string;
}
