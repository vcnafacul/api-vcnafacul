import { ApiProperty } from '@nestjs/swagger';

class PrepCourseGeoDtoOutput {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  category: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  number: string;

  @ApiProperty()
  complement: string;

  @ApiProperty()
  neighborhood: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  city: string;
}

class PrepCourseRepresentativeDtoOutput {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;
}

export class PrepCourseDtoOutput {
  @ApiProperty()
  id: string;

  @ApiProperty()
  geo: PrepCourseGeoDtoOutput;

  @ApiProperty()
  representative: PrepCourseRepresentativeDtoOutput;

  @ApiProperty()
  logo: string;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  number_students: number;

  @ApiProperty()
  number_members: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
