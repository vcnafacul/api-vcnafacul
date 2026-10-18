import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { InscriptionCourseRepository } from '../prepCourse/InscriptionCourse/inscription-course.repository';
import { PartnerPrepCourseRepository } from '../prepCourse/partnerPrepCourse/partner-prep-course.repository';
import { StudentCourseRepository } from '../prepCourse/studentCourse/student-course.repository';
import {
  chaveDoMonitoramento,
  TTL_MONITORAMENTO,
} from './chave-do-monitoramento';

export type ResumoDoCursinho = {
  processosNaoTeste: number;
  processosTotal: number;
  inscricoesNaoTeste: number;
  matriculasNaoTeste: number;
};

export type EstudantesDoCursinho = {
  estudantesAtendidos: number;
  estudantesAtivos: number;
};

/**
 * Os números do Monitoramento recortados por cursinho (tickets/044). As mesmas
 * regras da visão da plataforma, com o filtro do cursinho, em cache de 1 h (D6).
 */
@Injectable()
export class MonitoramentoService {
  constructor(
    private readonly cursinhos: PartnerPrepCourseRepository,
    private readonly inscricoes: InscriptionCourseRepository,
    private readonly estudantes: StudentCourseRepository,
    private readonly cache: CacheService,
  ) {}

  /** 404 antes de qualquer conta (e antes do cache): id inexistente não vira chave. */
  async garantirCursinho(cursinhoId: string): Promise<void> {
    if (!(await this.cursinhos.existe(cursinhoId))) {
      throw new NotFoundException('Cursinho não encontrado');
    }
  }

  async resumo(cursinhoId: string): Promise<ResumoDoCursinho> {
    await this.garantirCursinho(cursinhoId);
    return this.cache.wrap(
      chaveDoMonitoramento('resumo', cursinhoId),
      async () => {
        const [processosNaoTeste, processosTotal, inscricoes, matriculas] =
          await Promise.all([
            this.inscricoes.getTotalNonTest(cursinhoId),
            this.inscricoes.getTotalEntity(cursinhoId),
            this.estudantes.getTotalNonTest(cursinhoId),
            this.estudantes.getTotalEnrolledNonTest(cursinhoId),
          ]);
        return {
          processosNaoTeste,
          processosTotal,
          inscricoesNaoTeste: inscricoes,
          matriculasNaoTeste: matriculas,
        };
      },
      TTL_MONITORAMENTO,
    );
  }

  /** Atendidos e ativos: as contagens da página do cursinho (025). */
  async estudantesDoCursinho(
    cursinhoId: string,
  ): Promise<EstudantesDoCursinho> {
    await this.garantirCursinho(cursinhoId);
    return this.cache.wrap(
      chaveDoMonitoramento('estudantes', cursinhoId),
      async () => {
        const [atendidos, ativos] = await Promise.all([
          this.estudantes.countStudentsEffectivelyServed(cursinhoId),
          this.estudantes.countStudentsCurrentlyEnrolled(cursinhoId),
        ]);
        return { estudantesAtendidos: atendidos, estudantesAtivos: ativos };
      },
      TTL_MONITORAMENTO,
    );
  }
}
