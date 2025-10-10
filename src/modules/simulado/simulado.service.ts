import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AnswerSimulado } from './dtos/answer-simulado.dto.input';
import { AvailableSimuladoDTOoutput } from './dtos/available-simulado.dto.output';
import { CreateQuestaoDTOInput } from './dtos/create-questao.dto.input';
import { CreateSimuladoDTOInput } from './dtos/create-simulado.dto.input';
import { ReportDTO } from './dtos/report.dto.input';
import { SimuladoDTO } from './dtos/simulado.dto.output';
import { TipoSimuladoDTO } from './dtos/tipo-simulado.dto.output';
import { UpdateDTOInput } from './dtos/update-questao.dto.input';
import { ReportEntity } from './enum/report.enum';
import { Status } from './enum/status.enum';

@Injectable()
export class SimuladoService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    private readonly auditLod: AuditLogService,
    private readonly cache: CacheService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async create(dto: CreateSimuladoDTOInput) {
    return await this.axios.post<SimuladoDTO>('v1/simulado', dto);
  }

  async getAll() {
    return await this.axios.get<SimuladoDTO[]>('v1/simulado');
  }

  async getTipos() {
    return await this.axios.get<TipoSimuladoDTO[]>('v1/tipo-simulado');
  }

  async getToAnswer(id: string) {
    return await this.axios.get<SimuladoDTO>(`v1/simulado/toanswer/${id}`);
  }

  async getById(id: string) {
    return await this.axios.get<SimuladoDTO>(`v1/simulado/${id}`);
  }

  public async delete(id: string): Promise<void> {
    await this.axios.delete(`v1/simulado/${id}`);
  }

  public async answer(dto: AnswerSimulado, userId: string) {
    return await this.axios.post(`v1/simulado/answer`, {
      ...dto,
      idEstudante: userId,
    });
  }

  public async report(reportDto: ReportDTO, userId: string) {
    if (reportDto.entity === ReportEntity.Simulado) {
      await this.auditLod.create({
        entityType: 'Simulado',
        entityId: '',
        changes: { message: reportDto.message },
        updatedBy: userId,
      });
    } else {
      await this.axios.post(`v1/questao/report`, reportDto);
    }
  }

  public async questoes(status: Status) {
    return await this.axios.get(`v1/questao/${status}`);
  }

  public async questoesInfo() {
    return await this.axios.get(`v1/questao/infos`);
  }

  public async questoesUpdateStatus(id: string, status: Status) {
    return await this.axios.patch(`v1/questao/${id}/${status}`);
  }

  public async questoesUpdate(questao: UpdateDTOInput) {
    return await this.axios.patch(`v1/questao`, questao);
  }

  public async createQuestion(questao: CreateQuestaoDTOInput) {
    return await this.axios.post(`v1/questao`, questao);
  }

  public async uploadImage(file: any): Promise<string> {
    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }
    return file.filename.split('.')[0];
  }

  public async getAvailable(type: string) {
    return await this.axios.get<AvailableSimuladoDTOoutput[]>(
      `v1/simulado/available?tipo=${type}`,
    );
  }

  public async getSummary() {
    return this.cache.wrap<object>(
      'simulado:summary',
      async () => await this.axios.get<object>(`v1/simulado/summary`),
    );
  }

  public async getAggregateByPeriod() {
    return this.cache.wrap<object>(
      'simulado:aggregateByPeriod',
      async () =>
        await this.axios.get<object>(`v1/simulado/aggregate-by-Period`),
    );
  }

  public async getAggregateByPeriodAndType() {
    return this.cache.wrap<object>(
      'simulado:aggregateByPeriodAndTipo',
      async () =>
        await this.axios.get<object>(
          `v1/simulado/aggregate-by-Period-and-Type`,
        ),
    );
  }
}
