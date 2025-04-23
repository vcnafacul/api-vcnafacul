import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { QueryFailedError } from 'typeorm';
import { FrenteRepository } from '../frente/frente.repository';
import { CreateSubjectDTOInput } from './dtos/create-subject.dto.input';
import { UpdateSubjectDTOInput } from './dtos/update-subject.dto.input';
import { Subject } from './subject.entity';
import { SubjectRepository } from './subject.repository';

@Injectable()
export class SubjectService extends BaseService<Subject> {
  constructor(
    private readonly repository: SubjectRepository,
    private readonly frenteRepository: FrenteRepository,
  ) {
    super(repository);
  }

  async create(data: CreateSubjectDTOInput): Promise<Subject> {
    const frente = await this.frenteRepository.findOneBy({ id: data.frente });

    if (!frente) {
      throw new HttpException(
        `Frente não encontrada com o ID ${data.frente}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const subject = new Subject();
    subject.name = data.name;
    subject.description = data.description;
    subject.frente = frente;

    try {
      const subjectSaved = await this.repository.create(subject);
      await this.frenteRepository.addList(subjectSaved, frente); // ← mantém encadeamento de lista
      return subjectSaved;
    } catch (error: any) {
      if (
        error instanceof QueryFailedError &&
        error.message.toLowerCase().includes('duplicate entry')
      ) {
        throw new HttpException(
          `Já existe um tema chamado "${data.name}" nessa frente.`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        'Erro inesperado ao criar o tema.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllOrder(frenteId: string) {
    const frente = await this.frenteRepository.findOneBy({ id: frenteId });
    const nodes = await this.repository.getNodes(frenteId);
    return await this.repository.getOrder(nodes, frente.head);
  }

  async changeOrder(dto: ChangeOrderDTOInput) {
    await this.frenteRepository.changeOrder(
      dto.listId,
      dto.node1,
      dto.node2,
      dto.where,
    );
  }

  async getByFrente(frente: string) {
    return this.repository.getByFrente(frente);
  }

  async update(dto: UpdateSubjectDTOInput) {
    const subject = await this.repository.findOneBy({ id: dto.id });
    if (!subject) {
      throw new HttpException(
        `Subject not found by id ${dto.id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    subject.name = dto.name;
    subject.description = dto.description;
    return await this.repository.update(subject);
  }

  async delete(id: string) {
    const subject = await this.repository.getByIdToRemove(id);
    if (!subject) {
      throw new HttpException(
        `Subject not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (subject.lenght > 0) {
      throw new HttpException(
        `It's not possible to delete subject with content`,
        HttpStatus.CONFLICT,
      );
    }
    await this.frenteRepository.removeNode(subject.frente.id, subject.id);
    await this.repository.delete(id);
  }
}
