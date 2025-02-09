import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { Class } from './class.entity';
import { ClassRepository } from './class.repository';
import { CreateClassDtoInput } from './dtos/create-class.dto.input';

@Injectable()
export class ClassService extends BaseService<Class> {
  constructor(
    private readonly repository: ClassRepository,
    private readonly partnerRepository: PartnerPrepCourseRepository,
  ) {
    super(repository);
  }

  async create(dto: CreateClassDtoInput, userId: string): Promise<Class> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    const c = new Class();
    c.name = dto.name;
    c.description = dto.description;
    c.year = dto.year;
    c.startDate = dto.startDate;
    c.endDate = dto.endDate;
    c.partnerPrepCourse = partnerPrepCourse;
    c.admins = [];
    c.students = [];
    const entity = await this.repository.create(c);

    return entity;
  }
}
