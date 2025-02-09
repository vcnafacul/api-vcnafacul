import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { Class } from './class.entity';
import { ClassRepository } from './class.repository';
import { CreateClassDtoInput } from './dtos/create-class.dto.input';
import { UpdateClassDTOInput } from './dtos/update-class.dto.input';

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

  async findOneById(id: string): Promise<Class> {
    const classEntity = await this.repository.findOneBy({ id });

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    return classEntity;
  }

  async update(dto: UpdateClassDTOInput): Promise<void> {
    const classEntity = await this.repository.findOneBy({ id: dto._id });
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${dto._id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    Object.assign(classEntity, {
      name: dto.name ?? classEntity.name,
      description: dto.description ?? classEntity.description,
      year: dto.year ?? classEntity.year,
      startDate: dto.startDate ?? classEntity.startDate,
      endDate: dto.endDate ?? classEntity.endDate,
    });

    await this.repository.update(classEntity);
  }
}
