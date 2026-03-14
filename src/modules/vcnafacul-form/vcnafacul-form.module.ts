import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { FormController } from './form/form.controller';
import { FormService } from './form/form.service';
import { QuestionFormController } from './question/question-form.controller';
import { QuestionFormService } from './question/question-form.service';
import { RuleFormController } from './rule/rule-form.controller';
import { RuleFormService } from './rule/rule-form.service';
import { RuleSetFormController } from './rule-set/rule-set-form.controller';
import { RuleSetFormService } from './rule-set/rule-set-form.service';
import { SectionFormController } from './section-form/section-form.controller';
import { SectionFormService } from './section-form/section-form.service';
import { SubmissionService } from './submission/submission.service';

@Module({
  imports: [HttpModule, EnvModule],
  controllers: [
    SectionFormController,
    QuestionFormController,
    FormController,
    RuleFormController,
    RuleSetFormController,
  ],
  providers: [
    SectionFormService,
    QuestionFormService,
    HttpServiceAxiosFactory,
    FormService,
    SubmissionService,
    RuleFormService,
    RuleSetFormService,
  ],
  exports: [
    SectionFormService,
    QuestionFormService,
    FormService,
    SubmissionService,
    RuleFormService,
    RuleSetFormService,
  ],
})
export class VcnafaculFormModule {}
