import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { QuestionFormController } from './question/question-form.controller';
import { QuestionFormService } from './question/question-form.service';
import { SectionFormController } from './section-form/section-form.controller';
import { SectionFormService } from './section-form/section-form.service';

@Module({
  imports: [HttpModule, EnvModule],
  controllers: [SectionFormController, QuestionFormController],
  providers: [SectionFormService, QuestionFormService, HttpServiceAxiosFactory],
})
export class VcnafaculFormModule {}
