import { Module } from '@nestjs/common';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { InscriptionCourseController } from './inscription-course.controller';
import { InscriptionCourseRepository } from './inscription-course.repository';
import { InscriptionCourseService } from './inscription-course.service';

@Module({
  controllers: [InscriptionCourseController],
  imports: [UserRoleModule, PartnerPrepCourseModule],
  providers: [InscriptionCourseService, InscriptionCourseRepository],
  exports: [InscriptionCourseService, InscriptionCourseRepository],
})
export class InscriptionCourseModule {}
