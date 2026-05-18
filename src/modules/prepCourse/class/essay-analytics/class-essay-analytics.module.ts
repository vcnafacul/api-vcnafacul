import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassModule } from '../class.module';
import { ClassEssayAnalyticsController } from './class-essay-analytics.controller';
import { ClassEssayAnalyticsRepository } from './class-essay-analytics.repository';
import { ClassEssayAnalyticsService } from './class-essay-analytics.service';
import { ClassEssaySnapshot } from './class-essay-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEssaySnapshot]), ClassModule],
  controllers: [ClassEssayAnalyticsController],
  providers: [ClassEssayAnalyticsService, ClassEssayAnalyticsRepository],
  exports: [ClassEssayAnalyticsService],
})
export class ClassEssayAnalyticsModule {}
