import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordItem {
  @ApiProperty({ example: '2025-04-01' })
  date: string;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 22 })
  presentCount: number;
}

export class AttendanceRecordByClassOutput {
  @ApiProperty()
  class: {
    name: string;
    year: number;
  };

  @ApiProperty({ example: '2025-04-01' })
  startDate: Date;

  @ApiProperty({ example: '2025-04-01' })
  endDate: Date;

  @ApiProperty({ type: [AttendanceRecordItem] })
  classReport: AttendanceRecordItem[];

  @ApiProperty({ type: [AttendanceRecordItem] })
  generalReport: AttendanceRecordItem[];
}
