import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvModule } from '../../shared/modules/env/env.module';
import { UserModule } from '../user/user.module';
import { EmailWhitelistController } from './email-whitelist.controller';
import { EmailWhitelist } from './email-whitelist.entity';
import { EmailWhitelistService } from './email-whitelist.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailWhitelist]), UserModule, EnvModule],
  controllers: [EmailWhitelistController],
  providers: [EmailWhitelistService],
})
export class EmailWhitelistModule {}
