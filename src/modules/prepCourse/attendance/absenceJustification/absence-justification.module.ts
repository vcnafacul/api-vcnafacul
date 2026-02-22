import { Module } from '@nestjs/common';
import { AbsenceJustificationRepository } from './absence-justification.repository';

@Module({
  controllers: [],
  imports: [],
  providers: [AbsenceJustificationRepository],
  exports: [AbsenceJustificationRepository],
})
export class AbsenceJustificationModule {}
