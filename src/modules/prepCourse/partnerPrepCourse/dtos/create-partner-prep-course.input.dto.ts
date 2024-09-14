import { ApiProperty } from '@nestjs/swagger';
import { GeoExist } from 'src/modules/geo/validator/geo-exist.validator';
import { UserExist } from 'src/modules/user/validator/user-exist.validator';

export class PartnerPrepCourseDtoInput {
  @ApiProperty()
  @GeoExist({ message: 'GeoLocation não existe not exist' })
  geoId: string;

  @ApiProperty()
  @UserExist({ message: 'User not exist' })
  userId: string;
}
