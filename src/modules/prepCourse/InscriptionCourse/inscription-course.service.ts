import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { Gender } from 'src/modules/user/enum/gender';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EmailService } from 'src/shared/services/email/email.service';
import { adjustDate } from 'src/utils/adjustDate';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { CreateInscriptionCourseInput } from './dtos/create-inscription-course.dto.input';
import { InscriptionCourseDtoOutput } from './dtos/get-all-inscription.dto.output';
import { GetSubscribersDtoOutput } from './dtos/get-subscribers.dto.output';
import { UpdateInscriptionCourseDTOInput } from './dtos/update-inscription-course.dto.input';
import { InscriptionCourse } from './inscription-course.entity';
import { InscriptionCourseRepository } from './inscription-course.repository';

@Injectable()
export class InscriptionCourseService extends BaseService<InscriptionCourse> {
  constructor(
    private readonly repository: InscriptionCourseRepository,
    private readonly studentRepository: StudentCourseRepository,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private readonly emailService: EmailService,
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

  async getSubscribers(
    inscriptionId: string,
  ): Promise<GetSubscribersDtoOutput[]> {
    const inscription = await this.repository.getSubscribers(inscriptionId);
    const subscribers: GetSubscribersDtoOutput[] = inscription.students.map(
      (student) => {
        return {
          id: student.id,
          cadastrado_em: student.createdAt,
          isento: student.isFree ? 'Sim' : 'Não',
          convocar: student.selectEnrolled ? 'Sim' : 'Não',
          data_convocacao: student.selectEnrolledAt,
          data_limite_convocacao: student.limitEnrolledAt
            ? adjustDate(student.limitEnrolledAt, -1)
            : null,
          lista_de_espera: student.waitingList ? 'Sim' : 'Não',
          status: student.applicationStatus,
          email: student.user.email,
          cpf: student.cpf,
          rg: student.rg,
          uf: student.uf,
          telefone_emergencia: student.urgencyPhone,
          socioeconomic: student.socioeconomic,
          whatsapp: student.whatsapp,
          nome: student.user.firstName,
          sobrenome: student.user.lastName,
          nome_social: student.user.socialName,
          data_nascimento: student.user.birthday,
          genero:
            student.user.gender === Gender.Male
              ? 'Masculino'
              : student.user.gender === Gender.Female
              ? 'Feminino'
              : 'Outro',
          telefone: student.user.phone,
          bairro: student.user.neighborhood,
          rua: student.user.street,
          numero: student.user.number,
          complemento: student.user.complement,
          CEP: student.user.postalCode,
          cidade: student.user.city,
          estado: student.user.state,
          nome_guardiao_legal: student.legalGuardian?.fullName || '',
          telefone_guardiao_legal: student.legalGuardian?.phone || '',
          rg_guardiao_legal: student.legalGuardian?.rg || '',
          uf_guardiao_legal: student.legalGuardian?.uf || '',
          cpf_guardiao_legal: student.legalGuardian?.cpf || '',
          parentesco_guardiao_legal:
            student.legalGuardian?.family_relationship || '',
        };
      },
    );
    return subscribers;
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

  async updateWaitingList(id: string, studentId: string, waitingList: boolean) {
    const inscription = await this.repository.findOneBy({ id });
    if (!inscription) {
      throw new HttpException('Inscrição não encontrada', HttpStatus.NOT_FOUND);
    }
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new HttpException('Estudante não encontrado', HttpStatus.NOT_FOUND);
    }
    if (student.applicationStatus === StatusApplication.UnderReview) {
      if (student.enrolled) {
        throw new HttpException(
          'Não é possível alterar status de lista de espera de estudantes matriculados',
          HttpStatus.BAD_REQUEST,
        );
      }
      student.applicationStatus = StatusApplication.UnderReview;
      if (!waitingList) {
        student.waitingList = false;
        await this.removeStudentWaitingList(student, inscription);
      } else {
        student.waitingList = true;
        student.selectEnrolled = false;
        await this.addStudentWaitingList(student, inscription);
      }
    } else {
      throw new HttpException(
        'Não é possível alterar informações do estudantes. Status Block',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async removeStudentWaitingList(
    student: StudentCourse,
    inscription: InscriptionCourse,
  ) {
    await this.repository.removeNode(student, inscription);
  }

  async addStudentWaitingList(
    student: StudentCourse,
    inscription: InscriptionCourse,
  ) {
    await this.repository.addList(student, inscription);
  }

  async updateOrderWaitingList(id: string, studentsId: string[]) {
    if (studentsId.length > 0) {
      const inscription = await this.repository.findOneBy({ id });
      if (!inscription) {
        throw new HttpException(
          'Inscrição não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }
      inscription.head = studentsId[0];
      await Promise.all(
        studentsId.map(async (studentId, index) => {
          const student = await this.studentRepository.findOneBy({
            id: studentId,
          });
          student.prev = index > 0 ? studentsId[index - 1] : null;
          student.next =
            index < studentsId.length - 1 ? studentsId[index + 1] : null;

          await this.studentRepository.update(student);
        }),
      );
      if (studentsId.length > 1) {
        inscription.tail = studentsId[studentsId.length - 1];
      } else {
        inscription.tail = studentsId[0];
      }
      inscription.lenght = studentsId.length;
      await this.repository.update(inscription);
    }
  }

  async getWaitingList(id: string) {
    return await this.repository.getWaitingList(id);
  }

  async sendEmailWaitingList(id: string) {
    const inscription = await this.repository.findOneBy({ id });
    const list = await this.repository.getWaitingList(id);
    await this.emailService.sendWaitingList(
      list,
      inscription.partnerPrepCourse.geo.name,
    );
  }
}
