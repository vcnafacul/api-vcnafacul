import { Module } from '@nestjs/common';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';

@Module({
  controllers: [ClassController],
  imports: [PartnerPrepCourseModule, UserRoleModule],
  providers: [ClassRepository, ClassService],
  exports: [ClassRepository, ClassService],
})
export class ClassModule {}
