import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { Class } from './class.entity';
import { ClassRepository } from './class.repository';
import { ClassDtoOutput } from './dtos/class.dto.output';
import { CreateClassDtoInput } from './dtos/create-class.dto.input';
import { GetClassByIdAttendanceDtoOutput } from './dtos/get-class-by-id-attendance.dto.output';
import { GetClassByIdDtoOutput } from './dtos/get-class-by-id.dto.output';
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

  async findOneById(id: string): Promise<GetClassByIdDtoOutput> {
    const classEntity = await this.repository.findOneById(id);

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }
    const students = classEntity.students.map((student) => {
      return {
        id: student.id,
        name: student.user.useSocialName
          ? `${student.user.socialName?.split(' ')[0]} ${student.user.lastName}`
          : `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        status: student.applicationStatus,
        cod_enrolled: student.cod_enrolled,
        created_at: student.createdAt,
        updated_at: student.updatedAt,
        photo: student.photo,
        logs: student.logs,
        birthday: student.user.birthday,
      };
    });
    const result = {
      ...classEntity,
      students,
    };
    return result as unknown as GetClassByIdDtoOutput;
  }

  async update(dto: UpdateClassDTOInput): Promise<void> {
    const classEntity = await this.repository.findOneBy({ id: dto.id });
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${dto.id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      classEntity.students.length > 0 &&
      new Date(dto.startDate).getFullYear !==
        new Date(classEntity.startDate).getFullYear
    ) {
      throw new HttpException(
        `Class with students cannot be updated`,
        HttpStatus.BAD_REQUEST,
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

  async delete(id: string): Promise<void> {
    const classEntity = await this.repository.findOneBy({ id });
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (classEntity.students.length > 0) {
      throw new HttpException(
        `Class with id ${id} has students, cannot be deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.repository.delete(id);
  }

  async getAll(
    page: number,
    limit: number,
    userId: string,
  ): Promise<GetAllOutput<ClassDtoOutput>> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    const classes = await this.repository.findAllBy({
      page: page,
      limit: limit,
      where: { partnerPrepCourse: partnerPrepCourse },
    });
    return {
      data: classes.data.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        year: c.year,
        startDate: c.startDate,
        endDate: c.endDate,
        number_students: c.students.length,
      })),
      page: classes.page,
      limit: classes.limit,
      totalItems: classes.totalItems,
    };
  }

  async findOneByIdToAttendanceRecord(
    id: string,
  ): Promise<GetClassByIdAttendanceDtoOutput> {
    const classEntity = await this.repository.findOneByIdToAttendanceRecord(id);
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const students = classEntity.students.map((student) => {
      return {
        id: student.id,
        name: student.user.useSocialName
          ? `${student.user.socialName?.split(' ')[0]} ${student.user.lastName}`
          : `${student.user.firstName} ${student.user.lastName}`,
        cod_enrolled: student.cod_enrolled,
      };
    });
    const result = {
      ...classEntity,
      students,
    };
    return result as unknown as GetClassByIdAttendanceDtoOutput;
  }
}
