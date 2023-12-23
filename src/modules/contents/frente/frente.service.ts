import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FrenteRepository } from './frente.repository';
import { Frente } from './frente.entity';
import { CreateFrenteDTOInput } from './dtos/create-frente.dto.input';
import { Materias } from './enum/materias';
import { UpdateFrenteDTOInput } from './dtos/update-frente.dto.input';

@Injectable()
export class FrenteService {
  constructor(private readonly repository: FrenteRepository) {}

  async create(data: CreateFrenteDTOInput): Promise<Frente> {
    const frente = new Frente();
    frente.name = data.name;
    frente.materia = data.materia;
    return this.repository.create(frente);
  }

  async getAll() {
    return this.repository.findAll();
  }

  async getById(id: number) {
    return this.repository.findBy({ id });
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

  async delete(id: number) {
    const frente = await this.repository.findOneBy({ id });
    if (!frente || frente.id !== id) {
      throw new HttpException(
        `frente not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (frente.lenght > 0) {
      throw new HttpException(
        `It's not possible to delete subject with content`,
        HttpStatus.CONFLICT,
      );
    }
    await this.repository.delete(id);
  }
}
