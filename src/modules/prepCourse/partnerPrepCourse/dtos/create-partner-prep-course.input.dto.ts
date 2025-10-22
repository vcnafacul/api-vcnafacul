import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { GeoExist } from 'src/modules/geo/validator/geo-exist.validator';
import { UserExist } from 'src/modules/user/validator/user-exist.validator';

export class PartnerPrepCourseDtoInput {
  @ApiProperty()
  @GeoExist({ message: 'GeoLocation não existe not exist' })
  geoId: string;

  @ApiProperty()
  @UserExist({ message: 'Usuário não encontrado' })
  representative: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}
