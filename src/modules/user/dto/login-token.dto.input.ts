import { ApiProperty } from '@nestjs/swagger';

export class LoginTokenDTO {
  @ApiProperty()
  access_token: string;
}
