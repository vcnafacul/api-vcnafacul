import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { InscriptionCourse } from './inscription-course.entity';
import { InscriptionCourseRepository } from './inscription-course.repository';

@Injectable()
export class InscriptionCourseService extends BaseService<InscriptionCourse> {
  constructor(
    private readonly repository: InscriptionCourseRepository,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
  ) {
    super(repository);
  }

  async create(dto: CreateInscriptionCourseInput): Promise<InscriptionCourse> {
    const parnetPrepCourse = await this.partnerPrepCourseService.findOneBy({
      id: dto.partnerPrepCourse,
    });
    const currentInscriptionCourse =
      await this.findOneActived(parnetPrepCourse);

    if (currentInscriptionCourse) {
      if (currentInscriptionCourse.endDate < new Date()) {
        currentInscriptionCourse.actived = false;
        await this.repository.update(currentInscriptionCourse);
      } else {
        throw new HttpException(
          'already exists an active inscription course',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const inscriptionCourse: InscriptionCourse = Object.assign(
      new InscriptionCourse(),
      dto,
    );

    const result = await this.repository.create(inscriptionCourse);
    if (parnetPrepCourse.inscriptionCourses) {
      parnetPrepCourse.inscriptionCourses.push(result);
    } else {
      parnetPrepCourse.inscriptionCourses = [result];
    }
    await this.partnerPrepCourseService.update(parnetPrepCourse);
    return result;
  }

  async getById(id: string): Promise<InscriptionCourse> {
    return this.repository.findOneBy({ where: { id } });
  }

  async findOneActived(partnerPrepCourse: PartnerPrepCourse) {
    return await this.repository.findActived(partnerPrepCourse);
  }

  async cancelInscriptionCourse(id: string) {
    const inscriptionCourse = await this.repository.findOneBy({ id });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Inscrição não encontrada',
        HttpStatus.BAD_REQUEST,
      );
    }
    inscriptionCourse.actived = false;
    await this.repository.update(inscriptionCourse);
  }

  async activeInscriptionCourse(id: string) {
    const inscriptionCourse = await this.repository.findOneBy({
      where: { id },
    });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Inscrição não encontrada',
        HttpStatus.BAD_REQUEST,
      );
    }
    inscriptionCourse.actived = true;
    await this.repository.update(inscriptionCourse);
  }

  async update(entity: InscriptionCourse) {
    return this.repository.update(entity);
  }
}
