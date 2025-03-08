import { Module, OnModuleInit } from '@nestjs/common';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { LogStudentRepository } from '../studentCourse/log-student/log-student.repository';
import { StudentCourseModule } from '../studentCourse/student-course.module';
import { InscriptionCourseController } from './inscription-course.controller';
import { InscriptionCourseRepository } from './inscription-course.repository';
import { InscriptionCourseService } from './inscription-course.service';

@Module({
  controllers: [InscriptionCourseController],
  imports: [PartnerPrepCourseModule, StudentCourseModule],
  providers: [
    InscriptionCourseService,
    InscriptionCourseRepository,
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
