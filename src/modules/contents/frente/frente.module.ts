import { Module } from '@nestjs/common';
import { SubjectModule } from '../subject/subject.module';
import { FrenteController } from './frente.controller';
import { FrenteRepository } from './frente.repository';
import { FrenteService } from './frente.service';

@Module({
  controllers: [FrenteController],
  imports: [SubjectModule],
  providers: [FrenteService, FrenteRepository],
})
export class FrenteModule {}
