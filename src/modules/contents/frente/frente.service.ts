import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { CreateFrenteDTOInput } from './dtos/create-frente.dto.input';
import { UpdateFrenteDTOInput } from './dtos/update-frente.dto.input';
import { Materias } from './enum/materias';
import { Frente } from './frente.entity';
import { FrenteRepository } from './frente.repository';

@Injectable()
export class FrenteService extends BaseService<Frente> {
  constructor(private readonly repository: FrenteRepository) {
    super(repository);
  }

  async create(data: CreateFrenteDTOInput): Promise<Frente> {
    const frente = new Frente();
    frente.name = data.name;
    frente.materia = data.materia;
    try {
      return await this.repository.create(frente);
    } catch (error: any) {
      if (
        error.code === '23505' || // PostgreSQL
        error.code === 'ER_DUP_ENTRY' || // MySQL
        error.errno === 1062
      ) {
        throw new HttpException(
          `Já existe uma frente com o nome "${data.name}" para essa matéria.`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        'Erro interno ao criar frente de estudo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getByMateria(materia: Materias) {
    return this.repository.getByMateria(materia);
  }

  async update(dto: UpdateFrenteDTOInput) {
    const frente = await this.repository.findOneBy({ id: dto.id });
    if (!frente) {
      throw new HttpException(
        `Frente not found by id ${dto.id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    frente.name = dto.name;
    return await this.repository.update(frente);
  }

  async delete(id: string) {
    const frente = await this.repository.findOneBy({ id });
    if (!frente || frente.id !== id) {
      throw new HttpException(
        `frente not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (frente.lenght > 0) {
      throw new HttpException(
        `It's not possible to delete frente with subject`,
        HttpStatus.CONFLICT,
      );
    }
    await this.repository.delete(id);
  }

  async getByMateriaContentApproved(materia: Materias) {
    return this.repository.getByMateriaContentApproved(materia);
  }
}
