import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class LoginTokenDTO {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  status: HttpStatus;

  @ApiProperty()
  errors?: string[];
}
