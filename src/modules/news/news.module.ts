import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsRepository } from './news.repository';

@Module({
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
