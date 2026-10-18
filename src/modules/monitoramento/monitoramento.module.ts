import { Module } from '@nestjs/common';
import { InscriptionCourseModule } from '../prepCourse/InscriptionCourse/inscription-course.module';
import { PartnerPrepCourseModule } from '../prepCourse/partnerPrepCourse/partner-prep-course.module';
import { StudentCourseModule } from '../prepCourse/studentCourse/student-course.module';
import { UserModule } from '../user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { MonitoramentoController } from './monitoramento.controller';
import { MonitoramentoRepository } from './monitoramento.repository';
import { MonitoramentoService } from './monitoramento.service';

/**
 * O Monitoramento por cursinho (tickets/044). Módulo próprio, como o
 * `PaginaCursinhoModule`: importa os de cursinho, aluno e inscrição sem fechar ciclo.
 */
@Module({
  imports: [
    // O `PermissionsGuard` resolve o `UserService` e o `EnvService` no contexto do módulo.
    UserModule,
    EnvModule,
    PartnerPrepCourseModule,
    StudentCourseModule,
    InscriptionCourseModule,
  ],
  controllers: [MonitoramentoController],
  providers: [MonitoramentoService, MonitoramentoRepository],
})
export class MonitoramentoModule {}
