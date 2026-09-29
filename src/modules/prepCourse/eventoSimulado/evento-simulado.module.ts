import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { UserModule } from 'src/modules/user/user.module';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { StudentCourseModule } from '../studentCourse/student-course.module';
import { EventoSimuladoController } from './evento-simulado.controller';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { GestaoDoEventoService } from './gestao-do-evento.service';
import { InscricaoDoAlunoService } from './inscricao-do-aluno.service';
import { ProvasDoMsService } from './provas-do-ms.service';

/** Eventos de simulado presencial do cursinho (tickets/026). */
@Module({
  // `UserModule`: o `PermissionsGuard` das rotas injeta o `UserService`.
  imports: [
    HttpModule,
    EnvModule,
    UserModule,
    CollaboratorModule,
    StudentCourseModule,
  ],
  controllers: [EventoSimuladoController],
  providers: [
    EventoSimuladoRepository,
    GestaoDoEventoService,
    InscricaoDoAlunoService,
    ProvasDoMsService,
    HttpServiceAxiosFactory,
  ],
  exports: [EventoSimuladoRepository],
})
export class EventoSimuladoModule {}
