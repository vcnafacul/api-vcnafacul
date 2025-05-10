import { Module, OnModuleInit } from '@nestjs/common';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { LogStudentRepository } from '../studentCourse/log-student/log-student.repository';
import { StudentCourseModule } from '../studentCourse/student-course.module';
import { InscriptionCourseController } from './inscription-course.controller';
import { InscriptionCourseRepository } from './inscription-course.repository';
import { InscriptionCourseService } from './inscription-course.service';
import { InscriptionCourseExistValidator } from './validator/inscription-course-exist.validator';

@Module({
  controllers: [InscriptionCourseController],
  imports: [PartnerPrepCourseModule, StudentCourseModule],
  providers: [
    InscriptionCourseService,
    InscriptionCourseRepository,
    InscriptionCourseExistValidator,
    EmailService,
    LogStudentRepository,
    DiscordWebhook,
  ],
  exports: [InscriptionCourseService, InscriptionCourseRepository],
})
export class InscriptionCourseModule implements OnModuleInit {
  constructor(private readonly service: InscriptionCourseService) {}
  async onModuleInit() {
    await this.service.updateInfosInscription();
  }
}
