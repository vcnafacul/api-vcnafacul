import { Module } from '@nestjs/common';
import { TypeormService } from './typeorm/typeorm.service';

import { TypeOrmNewsRepository } from './typeorm/repositories/typeorm-questions-repository';
import { TypeOrmGeoRepository } from './typeorm/repositories/typeorm-students-repository';

import { GeoRepository } from '@/domain/site/application/repositories/geo-repository';
import { NewsRepository } from '@/domain/site/application/repositories/news-repository';

@Module({
  imports: [],
  providers: [
    TypeormService,
    {
      provide: NewsRepository,
      useClass: TypeOrmNewsRepository,
    },
    {
      provide: GeoRepository,
      useClass: TypeOrmGeoRepository,
    },
    // {
    //   provide: abstract class,
    //   useClass: class,
    // }
  ],
  exports: [
    TypeormService,
    NewsRepository,
    GeoRepository,
    // ... repositories (abstract class)
  ],
})
export class DatabaseModule {}
