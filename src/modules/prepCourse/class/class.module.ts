import { Module } from '@nestjs/common';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { CoursePeriodModule } from '../coursePeriod/course-period.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';

@Module({
  controllers: [ClassController],
  imports: [
    PartnerPrepCourseModule,
    UserModule,
    RoleModule,
    CoursePeriodModule,
    EnvModule,
  ],
  providers: [ClassRepository, ClassService],
  exports: [ClassRepository, ClassService],
})
export class ClassModule {}
