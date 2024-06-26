import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
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
  constructor(
    private readonly axios: HttpServiceAxios,
    private readonly configService: ConfigService,
    private readonly auditLod: AuditLogService,
  ) {
    this.axios.setBaseURL(this.configService.get<string>('SIMULADO_URL'));
  }

  async create(dto: CreateSimuladoDTOInput) {
    return await this.axios.postR<SimuladoDTO>('v1/simulado', dto);
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

  public async answer(dto: AnswerSimulado, userId: number) {
    await this.axios.postR(`v1/simulado/answer`, {
      ...dto,
      idEstudante: userId,
    });
  }

  public async report(reportDto: ReportDTO, userId: number) {
    if (reportDto.entity === ReportEntity.Simulado) {
      await this.auditLod.create({
        entityType: 'Simulado',
        entityId: 0,
        changes: { message: reportDto.message },
        updatedBy: userId,
      });
    } else {
      await this.axios.postR(`v1/questao/report`, reportDto);
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
    return await this.axios.postR(`v1/questao`, questao);
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
}
