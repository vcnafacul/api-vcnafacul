import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Status } from 'src/modules/simulado/enum/status.enum';
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
    if (new Date(dto.endDate) < new Date()) {
      throw new HttpException(
        'Data de término do curso não pode ser menor que a data atual',
        HttpStatus.BAD_REQUEST,
      );
    }
    const parnetPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);

    await this.updateInfosInscription(parnetPrepCourse);

    const allInscription = await this.findAllBy({
      page: 1,
      limit: 9999,
      where: { partnerPrepCourse: parnetPrepCourse },
    });
    const currentInscriptionCourse = allInscription.data.find(
      (ins) => ins.actived === Status.Approved,
    );
    dto.endDate = new Date(dto.endDate);
    dto.startDate = new Date(dto.startDate);
    dto.endDate.setHours(23, 59, 59, 999);

    this.checkDateConflictWithInscription(
      allInscription.data,
      dto.startDate,
      dto.endDate,
    );

    if (currentInscriptionCourse || dto.startDate > new Date()) {
      dto.actived = Status.Pending;
    }

    const inscriptionCourse: InscriptionCourse = Object.assign(
      new InscriptionCourse(),
      dto,
    );
    inscriptionCourse.description = '';
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
    const partner = await this.partnerPrepCourseService.getByUserId(userId);

    await this.updateInfosInscription(partner);

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
    inscriptionCourse.actived = Status.Rejected;
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
    inscriptionCourse.actived = Status.Approved;
    await this.repository.update(inscriptionCourse);
  }

  async update(entity: InscriptionCourse) {
    return this.repository.update(entity);
  }

  async updateFromDTO(dto: UpdateInscriptionCourseDTOInput, userId: string) {
    const parnetPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);
    await this.updateInfosInscription(parnetPrepCourse);
    const activeInscription =
      await this.repository.findActived(parnetPrepCourse);

    const inscriptionCourse = await this.repository.findOneBy({ id: dto.id });
    if (!inscriptionCourse) {
      throw new HttpException(
        'Inscrição não encontrada',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (activeInscription && activeInscription.id !== dto.id) {
      throw new HttpException(
        'Não é permitido alterar uma inscrição enquanto houver um processo seletivo ativo',
        HttpStatus.BAD_REQUEST,
      );
    }

    dto.endDate = new Date(dto.endDate);
    dto.startDate = new Date(dto.startDate);
    dto.endDate.setHours(23, 59, 59, 999);

    await this.checkDateConflict(
      parnetPrepCourse,
      dto.startDate,
      dto.endDate,
      dto.id,
    );

    if (dto.endDate < new Date()) {
      inscriptionCourse.actived = Status.Rejected;
    } else if (dto.startDate < new Date() && dto.endDate > new Date()) {
      inscriptionCourse.actived = Status.Approved;
    } else {
      inscriptionCourse.actived = Status.Pending;
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

  async updateInfosInscription(partner: PartnerPrepCourse) {
    const inscriptions = await this.repository.findAllBy({
      page: 1,
      limit: 9999,
      where: { partnerPrepCourse: partner },
    });

    await Promise.all(
      inscriptions.data.map(async (ins) => {
        if (ins.endDate < new Date()) {
          ins.actived = Status.Rejected;
          await this.repository.update(ins);
        } else if (ins.startDate < new Date() && ins.endDate > new Date()) {
          ins.actived = Status.Approved;
          await this.repository.update(ins);
        } else {
          ins.actived = Status.Pending;
          await this.repository.update(ins);
        }
      }),
    );
  }

  async checkDateConflict(
    partner: PartnerPrepCourse,
    startDate: Date,
    endDate: Date,
    inscriptionId?: string,
  ) {
    const allInscription = await this.repository.findAllBy({
      page: 1,
      limit: 9999,
      where: { partnerPrepCourse: partner },
    });
    this.checkDateConflictWithInscription(
      allInscription.data,
      startDate,
      endDate,
      inscriptionId,
    );
  }

  checkDateConflictWithInscription(
    inscription: InscriptionCourse[],
    startDate: Date,
    endDate: Date,
    inscriptionId?: string,
  ) {
    inscription.forEach((ins) => {
      if (ins.id !== inscriptionId) {
        if (startDate >= ins.startDate && startDate <= ins.endDate) {
          throw new HttpException(
            'Já existe um processo seletivo neste período',
            HttpStatus.BAD_REQUEST,
          );
        } else if (endDate >= ins.startDate && endDate <= ins.endDate) {
          throw new HttpException(
            'Já existe um processo seletivo neste período',
            HttpStatus.BAD_REQUEST,
          );
        } else if (startDate <= ins.startDate && endDate >= ins.endDate) {
          throw new HttpException(
            'Já existe um processo seletivo neste período',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    });
  }
}
