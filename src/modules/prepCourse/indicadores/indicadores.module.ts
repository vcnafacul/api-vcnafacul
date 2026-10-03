import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { CalculoDosIndicadores } from './calculo-dos-indicadores';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresRepository } from './indicadores.repository';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresTask } from './indicadores.task';

@Module({
  imports: [PartnerPrepCourseModule, UserModule, EnvModule],
  controllers: [IndicadoresController],
  providers: [
    IndicadoresRepository,
    CalculoDosIndicadores,
    IndicadoresService,
    IndicadoresTask,
  ],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
