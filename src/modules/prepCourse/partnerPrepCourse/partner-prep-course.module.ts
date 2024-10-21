import { Module } from '@nestjs/common';
import { RoleModule } from 'src/modules/role/role.module';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { PartnerPrepCourseController } from './partner-prep-course.controller';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';
import { PartnerPrepCourseService } from './partner-prep-course.service';
import { PartnerPrepCourseExistValidator } from './validator/partner-pret-course-exist.validator';

@Module({
  controllers: [PartnerPrepCourseController],
  imports: [RoleModule, UserRoleModule],
  providers: [
    PartnerPrepCourseService,
    PartnerPrepCourseRepository,
    PartnerPrepCourseExistValidator,
  ],
  exports: [PartnerPrepCourseService, PartnerPrepCourseRepository],
})
export class PartnerPrepCourseModule {}
