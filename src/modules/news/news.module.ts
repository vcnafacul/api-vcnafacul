import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsRepository } from './news.repository';
import { NewsMiddleware } from 'src/shared/middleware/user-role.middle';
import { UserRoleModule } from '../user-role/user-role.module';

@Module({
  imports: [UserRoleModule],
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NewsMiddleware)
      .exclude({ path: 'news', method: RequestMethod.GET })
      .forRoutes(NewsController);
  }
}
