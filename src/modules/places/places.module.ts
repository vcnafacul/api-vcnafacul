import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PlacesService } from './places.service';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { PlacesController } from './places.controller';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [HttpModule, EnvModule, UserModule, RoleModule],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
