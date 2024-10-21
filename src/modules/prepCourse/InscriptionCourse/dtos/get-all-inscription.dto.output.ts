import { ApiProperty } from '@nestjs/swagger';

export class InscriptionCourseDtoOutput {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  actived: boolean;

  @ApiProperty()
  openingsCount: number;

  @ApiProperty()
  subscribersCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  partnerPrepCourseId: string;

  @ApiProperty()
  partnerPrepCourseName: string;
}
