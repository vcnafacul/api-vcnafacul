import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { InscriptionCourseDtoOutput } from './dtos/get-all-inscription.dto.output';
import { UpdateInscriptionCourseDTOInput } from './dtos/update-inscription-course.dto.input';
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

  async create(
    dto: CreateInscriptionCourseInput,
    userId: string,
  ): Promise<InscriptionCourseDtoOutput> {
    const parnetPrepCourse = await this.partnerPrepCourseService.findOneBy({
      userId,
    });
    const currentInscriptionCourse =
      await this.findOneActived(parnetPrepCourse);

    if (currentInscriptionCourse) {
      if (currentInscriptionCourse.endDate < new Date()) {
        currentInscriptionCourse.actived = false;
        await this.repository.update(currentInscriptionCourse);
      } else {
        throw new HttpException(
          'Já existe uma inscrição ativa para este curso',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const inscriptionCourse: InscriptionCourse = Object.assign(
      new InscriptionCourse(),
      dto,
    );

    const activedInscription = await this.findOneActived(parnetPrepCourse);
    if (activedInscription) {
      inscriptionCourse.actived = false;
    }

    const result = await this.repository.create(inscriptionCourse);
    if (parnetPrepCourse.inscriptionCourses) {
      parnetPrepCourse.inscriptionCourses.push(result);
    } else {
      parnetPrepCourse.inscriptionCourses = [result];
    }
    await this.partnerPrepCourseService.update(parnetPrepCourse);
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      startDate: result.startDate,
      endDate: result.endDate,
      actived: result.actived,
      openingsCount: result.expectedOpening,
      subscribersCount: 0,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      partnerPrepCourseId: parnetPrepCourse.id,
      partnerPrepCourseName: parnetPrepCourse.geo.name,
    };
  }

  async getAll(
    page: number,
    limit: number,
    userId: string,
  ): Promise<GetAllOutput<InscriptionCourseDtoOutput>> {
    const partner = await this.partnerPrepCourseService.findOneBy({ userId });

    const inscription = await this.repository.findAllBy({
      page: page,
      limit: limit,
      where: { partnerPrepCourse: partner },
    });
    return {
      data: inscription.data.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        startDate: i.startDate,
        endDate: i.endDate,
        actived: i.actived,
        openingsCount: i.expectedOpening,
        subscribersCount: i.students?.length || 0,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        partnerPrepCourseId: i.partnerPrepCourse.id,
        partnerPrepCourseName: i.partnerPrepCourse.geo.name,
      })),
      page: inscription.page,
      limit: inscription.limit,
      totalItems: inscription.totalItems,
    };
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
    inscriptionCourse.deletedAt = new Date();
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

  async updateFromDTO(dto: UpdateInscriptionCourseDTOInput) {
    const inscriptionCourse = await this.repository.findOneBy({ id: dto.id });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Inscrição não encontrada',
        HttpStatus.BAD_REQUEST,
      );
    }
    inscriptionCourse.name = dto.name;
    inscriptionCourse.description = dto.description;
    inscriptionCourse.startDate = dto.startDate;
    inscriptionCourse.endDate = dto.endDate;
    inscriptionCourse.expectedOpening = dto.expectedOpening;
    await this.repository.update(inscriptionCourse);
  }

  async getSubscribers(inscriptionId: string) {
    const inscription = await this.repository.getSubscribers(inscriptionId);
    return inscription.students;
  }
}
