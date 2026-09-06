import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordByStudentItem {
  @ApiProperty({ example: 'Maria' })
  name: string;

  @ApiProperty({ example: 'Maria Silva' })
  socialName: string;

  @ApiProperty({ example: false })
  useSocialName: boolean;

  @ApiProperty({ example: '2025000123' })
  codEnrolled: string;

  @ApiProperty({ example: '11999998888', nullable: true, type: String })
  whatsapp: string | null;

  @ApiProperty({ example: '11977776666', nullable: true, type: String })
  urgencyPhone: string | null;

  @ApiProperty({ example: 10 })
  totalClassRecords: number;

  // SUM/ROUND do MySQL voltam como DECIMAL e o mysql2 entrega string
  @ApiProperty({ example: '8' })
  studentRecords: string;

  @ApiProperty({ example: '80.00' })
  presencePercentage: string;
}

export class AttendanceRecordByStudentDtoOutput {
  @ApiProperty()
  class: {
    name: string;
    year: string;
  };

  @ApiProperty({ example: '2025-04-01' })
  startDate: Date;

  @ApiProperty({ example: '2025-04-30' })
  endDate: Date;

  @ApiProperty({ type: [AttendanceRecordByStudentItem] })
  report: AttendanceRecordByStudentItem[];
}
