import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { InscriptionCourseRepository } from '../InscriptionCourse/inscription-course.repository';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';

export type ImpactoDoCursinho = {
  estudantesAtendidos: number;
  estudantesAtivos: number;
  /** `null` quando o ms não responde: a tela mostra "—". */
  questoesAprovadas: number | null;
  processosSeletivos: number;
};

const UMA_HORA = 60 * 60 * 1000;

/**
 * Os 4 números do impacto da página do cursinho (tickets/025, card 03, R7) —
 * as mesmas regras dos números da plataforma, filtradas por cursinho.
 */
@Injectable()
export class ImpactoDoCursinhoService {
  private readonly logger = new Logger(ImpactoDoCursinhoService.name);
  private readonly ms: HttpServiceAxios;

  constructor(
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly inscriptionCourseRepository: InscriptionCourseRepository,
    private readonly cache: CacheService,
    httpServiceFactory: HttpServiceAxiosFactory,
    envService: EnvService,
  ) {
    this.ms = httpServiceFactory.create(envService.get('SIMULADO_URL'));
  }

  numeros(cursinhoId: string): Promise<ImpactoDoCursinho> {
    return this.cache.wrap(
      `cursinho:impacto:${cursinhoId}`,
      async () => {
        const [atendidos, ativos, processos, aprovadas] = await Promise.all([
          this.studentCourseRepository.countStudentsEffectivelyServed(
            cursinhoId,
          ),
          this.studentCourseRepository.countStudentsCurrentlyEnrolled(
            cursinhoId,
          ),
          this.inscriptionCourseRepository.getTotalNonTest(cursinhoId),
          this.questoesAprovadas(cursinhoId),
        ]);
        return {
          estudantesAtendidos: atendidos,
          estudantesAtivos: ativos,
          questoesAprovadas: aprovadas,
          processosSeletivos: processos,
        };
      },
      UMA_HORA,
    );
  }

  private async questoesAprovadas(cursinhoId: string): Promise<number | null> {
    try {
      const r = await this.ms.get<{ questoesAprovadas: number }>(
        `v1/questao/contador-cursinho/${encodeURIComponent(cursinhoId)}`,
      );
      return r?.questoesAprovadas ?? 0;
    } catch (err) {
      this.logger.warn(
        `Contador de aprovadas indisponível (${cursinhoId}): ${err}`,
      );
      return null;
    }
  }
}
