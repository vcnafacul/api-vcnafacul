import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheManagerModule } from 'src/shared/modules/cache/cache.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { UserModule } from '../user/user.module';
import { HomeAbout } from './entities/home-about.entity';
import { HomeFeatureSection } from './entities/home-feature-section.entity';
import { HomeFeature } from './entities/home-feature.entity';
import { HomeSupporter } from './entities/home-supporter.entity';
import { HomeContentController } from './home-content.controller';
import { HomeContentService } from './home-content.service';
import { HomeAboutRepository } from './repositories/home-about.repository';
import { HomeFeatureSectionRepository } from './repositories/home-feature-section.repository';
import { HomeFeatureRepository } from './repositories/home-feature.repository';
import { HomeSupporterRepository } from './repositories/home-supporter.repository';

@Module({
  imports: [
    UserModule,
    EnvModule,
    BlobModule,
    CacheManagerModule,
    TypeOrmModule.forFeature([
      HomeAbout,
      HomeFeatureSection,
      HomeFeature,
      HomeSupporter,
    ]),
  ],
  controllers: [HomeContentController],
  providers: [
    HomeContentService,
    HomeAboutRepository,
    HomeFeatureSectionRepository,
    HomeFeatureRepository,
    HomeSupporterRepository,
  ],
})
export class HomeContentModule {}
