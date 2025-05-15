import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { UserModule } from '../user/user.module';
import { NewsController } from './news.controller';
import { NewsRepository } from './news.repository';
import { NewsService } from './news.service';

@Module({
  imports: [UserModule, EnvModule],
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
