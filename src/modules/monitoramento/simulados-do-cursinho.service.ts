import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { Period } from '../user/enum/period';
import {
  chaveDoMonitoramento,
  TTL_MONITORAMENTO,
} from './chave-do-monitoramento';

type Metrica = 'resumo' | 'por-periodo' | 'por-tipo';

/**
 * A seção Simulados do Monitoramento por cursinho (tickets/044, card 05): repassa
 * as rotas `v1/monitoramento/historico/*` do ms (card 04) com cache de 1 h.
 *
 * ⚠️ Erro do ms não vai para o cache: o `wrap` só grava o que resolve. Falha de
 * rede ou 5xx do ms vira 502 — a tela mostra "indisponível" só nessa seção.
 */
@Injectable()
export class SimuladosDoCursinhoService {
  private readonly logger = new Logger(SimuladosDoCursinhoService.name);
  private readonly ms: HttpServiceAxios;

  constructor(
    private readonly cache: CacheService,
    httpServiceFactory: HttpServiceAxiosFactory,
    envService: EnvService,
  ) {
    this.ms = httpServiceFactory.create(envService.get('SIMULADO_URL'));
  }

  resumo(cursinhoId: string) {
    return this.buscar('resumo', cursinhoId);
  }

  porPeriodo(cursinhoId: string, groupBy: Period) {
    return this.buscar('por-periodo', cursinhoId, groupBy);
  }

  porTipo(cursinhoId: string, groupBy: Period) {
    return this.buscar('por-tipo', cursinhoId, groupBy);
  }

  private buscar(metrica: Metrica, cursinhoId: string, groupBy?: Period) {
    const query = new URLSearchParams({ cursinhoId });
    if (groupBy) query.set('groupBy', groupBy);
    return this.cache.wrap(
      chaveDoMonitoramento(`simulados-${metrica}`, cursinhoId, groupBy),
      async () => {
        try {
          return await this.ms.get<unknown>(
            `v1/monitoramento/historico/${metrica}?${query.toString()}`,
          );
        } catch (err) {
          if (err instanceof HttpException && err.getStatus() < 500) throw err;
          this.logger.warn(
            `Simulados do cursinho ${cursinhoId} (${metrica}) indisponível: ${err}`,
          );
          throw new BadGatewayException(
            'Os números de simulados estão indisponíveis agora',
          );
        }
      },
      TTL_MONITORAMENTO,
    );
  }
}
