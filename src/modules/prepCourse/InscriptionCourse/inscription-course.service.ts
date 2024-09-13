import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { InscriptionCourse } from './inscription-course.entity';
import { InscriptionCourseRepository } from './inscription-course.repository';

@Injectable()
export class InscriptionCourseService extends BaseService<InscriptionCourse> {
  constructor(private readonly repository: InscriptionCourseRepository) {
    super(repository);
  }

  async create(dto: CreateInscriptionCourseInput): Promise<InscriptionCourse> {
    const inscriptionCourse: InscriptionCourse = Object.assign(
      new InscriptionCourse(),
      dto,
    );
    return this.repository.create(inscriptionCourse);
  }

  async getById(id: string): Promise<InscriptionCourse> {
    return this.repository.findOneBy({ where: { id } });
  }
}
