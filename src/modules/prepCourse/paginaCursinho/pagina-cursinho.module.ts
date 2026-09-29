import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { InscriptionCourseModule } from '../InscriptionCourse/inscription-course.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { StudentCourseModule } from '../studentCourse/student-course.module';
import { ImpactoDoCursinhoService } from './impacto-do-cursinho.service';

/**
 * A página pública do cursinho (tickets/025, cards 03–05).
 *
 * ⚠️ Módulo próprio, e não dentro do `PartnerPrepCourseModule`: os módulos de
 * aluno e de inscrição já importam o do cursinho, e o inverso fecharia ciclo.
 */
@Module({
  imports: [
    HttpModule,
    EnvModule,
    PartnerPrepCourseModule,
    CollaboratorModule,
    StudentCourseModule,
    InscriptionCourseModule,
  ],
  providers: [ImpactoDoCursinhoService, HttpServiceAxiosFactory],
  exports: [ImpactoDoCursinhoService],
})
export class PaginaCursinhoModule {}
