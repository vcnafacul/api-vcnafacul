import { Module } from '@nestjs/common';
import { PeriodJustificationRepository } from './period-justification.repository';
import { PeriodJustificationService } from './period-justification.service';
import { PeriodJustificationController } from './period-justification.controller';
import { UserModule } from '../../../user/user.module';
import { EnvModule } from '../../../../shared/modules/env/env.module';
import { CollaboratorModule } from '../../collaborator/collaborator.module';

@Module({
  imports: [UserModule, EnvModule, CollaboratorModule],
  controllers: [PeriodJustificationController],
  providers: [PeriodJustificationRepository, PeriodJustificationService],
  exports: [PeriodJustificationRepository, PeriodJustificationService],
})
export class PeriodJustificationModule {}
