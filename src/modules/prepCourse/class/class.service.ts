import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleService } from 'src/modules/role/role.service';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { maskEmail } from 'src/utils/maskEmail';
import { CoursePeriodRepository } from '../coursePeriod/course-period.repository';
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
    private readonly coursePeriodRepository: CoursePeriodRepository,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {
    super(repository);
  }

  async create(dto: CreateClassDtoInput, userId: string): Promise<Class> {
    const partnerPrepCourse =
      await this.partnerRepository.findOneByUserId(userId);

    // Validar se o período letivo existe e pertence ao mesmo parceiro
    const coursePeriod = await this.coursePeriodRepository.findOneById(
      dto.coursePeriodId,
    );

    if (!coursePeriod) {
      throw new HttpException(
        'Course period not found or does not belong to this partner',
        HttpStatus.BAD_REQUEST,
      );
    }

    const c = new Class();
    c.name = dto.name;
    c.description = dto.description;
    c.partnerPrepCourse = partnerPrepCourse;
    c.coursePeriod = coursePeriod;
    c.admins = [];
    c.students = [];
    const entity = await this.repository.create(c);

    return entity;
  }

  async findOneById(
    id: string,
    userId: string,
  ): Promise<GetClassByIdDtoOutput> {
    const classEntity = await this.repository.findOneById(id);

    if (!classEntity) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    const user = await this.userService.findUserById(userId);
    const role = await this.roleService.findOneById(user.role.id);
    const manager = role.gerenciarEstudantes;

    const students = classEntity.students.map((student) => {
      return {
        id: student.id,
        name: student.user.useSocialName
          ? `${student.user.socialName?.split(' ')[0]} ${student.user.lastName}`
          : `${student.user.firstName} ${student.user.lastName}`,
        email: manager ? student.user.email : maskEmail(student.user.email),
        status: student.applicationStatus,
        cod_enrolled: student.cod_enrolled,
        created_at: student.createdAt,
        updated_at: student.updatedAt,
        photo: student.photo,
        logs: student.logs,
        birthday: student.user.birthday,
        socioeconomic: student.socioeconomic,
        areaInterest: student.areaInterest,
        selectedCourses: student.selectedCourses,
        isFree: student.isFree,
      };
    });
    const result = {
      ...classEntity,
      coursePeriodId: classEntity.coursePeriod?.id || '',
      coursePeriodName: classEntity.coursePeriod?.name || '',
      coursePeriodYear: classEntity.coursePeriod?.year || 0,
      coursePeriodStartDate: classEntity.coursePeriod?.startDate || new Date(),
      coursePeriodEndDate: classEntity.coursePeriod?.endDate || new Date(),
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

    // Se está atualizando o período letivo, validar
    if (
      dto.coursePeriodId &&
      dto.coursePeriodId !== classEntity.coursePeriod?.id
    ) {
      const coursePeriod = await this.coursePeriodRepository.findOneById(
        dto.coursePeriodId,
      );
      if (!coursePeriod) {
        throw new HttpException(
          'Course period not found or does not belong to this partner',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!coursePeriod) {
        throw new HttpException(
          'Course period not found or does not belong to this partner',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verificar se o período letivo tem turmas com estudantes
      if (classEntity.students.length > 0) {
        throw new HttpException(
          `Class with students cannot change course period`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    Object.assign(classEntity, {
      name: dto.name ?? classEntity.name,
      description: dto.description ?? classEntity.description,
      coursePeriod: dto.coursePeriodId
        ? await this.coursePeriodRepository.findOneBy({
            id: dto.coursePeriodId,
          })
        : classEntity.coursePeriod,
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
        coursePeriodId: c.coursePeriod?.id || '',
        coursePeriodName: c.coursePeriod?.name || '',
        coursePeriodYear: c.coursePeriod?.year || 0,
        coursePeriodStartDate: c.coursePeriod?.startDate || new Date(),
        coursePeriodEndDate: c.coursePeriod?.endDate || new Date(),
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
      coursePeriodId: classEntity.coursePeriod?.id || '',
      coursePeriodName: classEntity.coursePeriod?.name || '',
      coursePeriodYear: classEntity.coursePeriod?.year || 0,
      students,
    };
    return result as unknown as GetClassByIdAttendanceDtoOutput;
  }
}
