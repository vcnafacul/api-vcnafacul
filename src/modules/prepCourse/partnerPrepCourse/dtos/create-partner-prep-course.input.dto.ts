import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { GeoExist } from 'src/modules/geo/validator/geo-exist.validator';
import { UserExist } from 'src/modules/user/validator/user-exist.validator';

export class PartnerPrepCourseDtoInput {
  @IsString()
  @ApiProperty()
  @GeoExist({ message: 'GeoLocation não existe not exist' })
  geoId: number;

  @IsString()
  @ApiProperty()
  @UserExist({ message: 'User not exist' })
  userId: number;
}
