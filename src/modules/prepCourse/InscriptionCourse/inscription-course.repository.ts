import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { LinkedListRepository } from 'src/shared/modules/linked/linked-list.repository';
import { EntityManager } from 'typeorm';
import { LogStudent } from '../studentCourse/log-student/log-student.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { InscriptionCourse } from './inscription-course.entity';
import { Period } from 'src/modules/user/enum/period';
import { AggregateInscriptionCoursePeriodDtoOutput } from './dtos/aggregate-inscription-course-period.dto.output';
import { buildFullSeries } from './handler/build-full-series';

@Injectable()
export class InscriptionCourseRepository extends LinkedListRepository<
  InscriptionCourse,
  StudentCourse
> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager, InscriptionCourse, StudentCourse);
  }

  async findOneBy(where: object): Promise<InscriptionCourse> {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({ ...where })
      .innerJoinAndSelect(
        'inscription_course.partnerPrepCourse',
        'partnerPrepCourse',
      )
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('inscription_course.students', 'student_course')
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.email',
        'user.phone',
        'user.birthday',
        'user.gender',
        'user.state',
        'user.city',
      ])
      .getOne();
  }

  async findAllWithName(
    partnerPrepCourseId: string,
  ): Promise<InscriptionCourse[]> {
    //andwehere there are students
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where(
        'inscription_course.partner_prep_course_id = :partnerPrepCourseId',
        { partnerPrepCourseId: partnerPrepCourseId },
      )
      .leftJoinAndSelect('inscription_course.students', 'students')
      .addSelect(['students.id'])
      .getMany();
  }

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<InscriptionCourse>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        /*
          ⚠️ COUNT no banco, e não `leftJoin` + `addSelect(student.id)` para
          o service contar `.length`: aquilo trazia uma linha por inscrito de
          todos os processos do cursinho só para devolver um número por
          processo (tickets/021 card 06). O contrato (`subscribersCount`)
          não muda.
        */
        .loadRelationCountAndMap('entity.subscribersCount', 'entity.students')
        .leftJoin('entity.partnerPrepCourse', 'partner_prep_course')
        .addSelect(['partner_prep_course.id'])
        .leftJoin('partner_prep_course.geo', 'geo')
        .addSelect(['geo.name'])
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  /*
    Só relações para-um: uma linha por inscrito. Logs e documentos juntos na
    mesma query multiplicavam as linhas (inscritos × logs × documentos, cada
    uma repetindo o socioeconômico) — vêm à parte, em
    `getUltimoEmailConvocacao` e `getHistoricoInscrito`.
  */
  async getSubscribers(inscriptionId: string) {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({ id: inscriptionId })
      .leftJoinAndSelect('inscription_course.students', 'student_course')
      .leftJoinAndSelect('student_course.user', 'user')
      .leftJoinAndSelect('student_course.legalGuardian', 'legalGuardian')
      .getOne();
  }

  /** Data do último "Email de convocação enviado" de cada inscrito. */
  async getUltimoEmailConvocacao(
    studentIds: string[],
  ): Promise<Map<string, Date>> {
    const ultimos = new Map<string, Date>();
    if (studentIds.length === 0) return ultimos;
    const linhas: { studentId: string; ultimo: Date | string }[] =
      await this._entityManager
        .getRepository(LogStudent)
        .createQueryBuilder('log')
        .select('log.student_id', 'studentId')
        .addSelect('MAX(log.created_at)', 'ultimo')
        .where('log.student_id IN (:...studentIds)', { studentIds })
        .andWhere('log.description = :descricao', {
          descricao: 'Email de convocação enviado',
        })
        .groupBy('log.student_id')
        .getRawMany();
    linhas.forEach((l) => ultimos.set(l.studentId, new Date(l.ultimo)));
    return ultimos;
  }

  /** Logs e documentos de um inscrito, só se ele for deste processo. */
  async getHistoricoInscrito(
    inscriptionId: string,
    studentId: string,
  ): Promise<StudentCourse | null> {
    return await this._entityManager
      .getRepository(StudentCourse)
      .createQueryBuilder('student_course')
      .innerJoin('student_course.inscriptionCourse', 'inscription_course')
      .leftJoinAndSelect('student_course.logs', 'logs')
      .leftJoinAndSelect('student_course.documents', 'documents')
      .where('student_course.id = :studentId', { studentId })
      .andWhere('inscription_course.id = :inscriptionId', { inscriptionId })
      .orderBy('logs.created_at', 'DESC')
      .addOrderBy('documents.created_at', 'DESC')
      .getOne();
  }

  async getWaitingList(id: string) {
    const inscription = await this.findOneBy({ id });
    const orderStudent: {
      id: string;
      position: number;
      name: string;
      email: string;
    }[] = [];
    let currentNode = inscription.students.find(
      (n) => n.id === inscription.head,
    );
    let position: number = 1;
    while (currentNode) {
      orderStudent.push({
        id: currentNode.id,
        position,
        name: `${
          currentNode.user.socialName
            ? currentNode.user.socialName
            : currentNode.user.firstName
        } ${currentNode.user.lastName}`,
        email: currentNode.user.email,
      });
      position = position + 1;
      currentNode = inscription.students.find((n) => n.id === currentNode.next);
    }
    return orderStudent;
  }

  async updateAllInscriptionsStatus(): Promise<void> {
    await this.repository.query(
      `
      UPDATE inscription_course
      SET actived = CASE
        WHEN end_date < ? THEN ?
        WHEN start_date <= ? AND end_date >= ? THEN ?
        ELSE ?
      END
      WHERE deleted_at IS NULL AND actived != ?
      `,
      [
        new Date(), // Para ? (agora)
        Status.Rejected, // Para ? (status rejeitado)
        new Date(), // Para ? (agora, novamente)
        new Date(), // Para ? (agora, novamente)
        Status.Approved, // Para ? (status aprovado)
        Status.Pending, // Para ? (status pendente)
        Status.Rejected, // Para ? (não atualizar se já for rejeitado)
      ],
    );
  }

  /** `cursinhoId` opcional (tickets/044): sem ele, a plataforma inteira. */
  async getTotalEntity(cursinhoId?: string) {
    const qb = this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL');
    if (cursinhoId) {
      qb.andWhere('entity.partner_prep_course_id = :cursinhoId', {
        cursinhoId,
      });
    }
    return qb.getCount();
  }

  /** `cursinhoId` opcional: sem ele, a plataforma inteira (tickets/025). */
  async getTotalNonTest(cursinhoId?: string) {
    const qb = this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.isTest = :isTest', { isTest: false });
    if (cursinhoId) {
      qb.andWhere('entity.partner_prep_course_id = :cursinhoId', {
        cursinhoId,
      });
    }
    return qb.getCount();
  }

  async entityByStatus(status: Status) {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.actived = :status', { status })
      .getCount();
  }

  async aggregateInscriptionCourseByPeriod(
    groupBy: Period,
  ): Promise<AggregateInscriptionCoursePeriodDtoOutput[]> {
    let dateExpr: string;
    switch (groupBy) {
      case 'day':
        dateExpr = 'DATE_FORMAT(pc.created_at, "%Y-%m-%d")';
        break;
      case 'month':
        dateExpr = "DATE_FORMAT(pc.created_at, '%Y-%m')";
        break;
      case 'year':
        dateExpr = 'YEAR(pc.created_at)';
        break;
      default:
        throw new Error('Invalid groupBy value');
    }

    const qb = this.repository
      .createQueryBuilder('pc')
      .select(`${dateExpr}`, 'period')
      .addSelect('COUNT(*)', 'total')
      .groupBy('period')
      .orderBy('period', 'ASC');

    const results = await qb.getRawMany();

    const raw = results.map((r) => ({
      period: r.period,
      total: Number(r.total),
      cumulativeTotal: 0,
    }));

    const fullSeries = buildFullSeries(groupBy, raw);

    let running = 0;

    return fullSeries.map((item) => {
      running += item.total;

      return {
        period: item.period,
        total: item.total,
        cumulativeTotal: running,
      };
    });
  }

  async findOpen(): Promise<InscriptionCourse[]> {
    const now = new Date();
    return this.repository
      .createQueryBuilder('ic')
      .leftJoinAndSelect('ic.partnerPrepCourse', 'ppc')
      .leftJoinAndSelect('ppc.geo', 'geo')
      .where('ic.endDate > :now', { now })
      .andWhere('ic.actived = :actived', { actived: Status.Approved })
      .andWhere('ic.isTest = :isTest', { isTest: false })
      .getMany();
  }

  async findOneWithPartnerPrep(id: string): Promise<InscriptionCourse | null> {
    return this.repository
      .createQueryBuilder('ic')
      .where('ic.id = :id', { id })
      .leftJoinAndSelect('ic.partnerPrepCourse', 'partnerPrepCourse')
      .leftJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .getOne();
  }

  /**
   * O processo é do cursinho em que `userId` é colaborador? (card 43)
   * Ex-membro (`deleted_at`, tickets/040) não conta — SQL cru não tem o filtro
   * de soft delete do TypeORM.
   */
  async ehDoCursinhoDe(inscriptionId: string, userId: string) {
    const [{ n }] = await this._entityManager.query(
      `SELECT COUNT(*) AS n FROM inscription_course ic
         JOIN collaborators c ON c.partner_prep_course_id = ic.partner_prep_course_id
        WHERE ic.id = ? AND c.user_id = ? AND c.deleted_at IS NULL`,
      [inscriptionId, userId],
    );
    return Number(n) > 0;
  }

  /** Quantos destes inscritos são do processo `inscriptionId`. */
  async inscritosDoProcesso(inscriptionId: string, studentIds: string[]) {
    const [{ n }] = await this._entityManager.query(
      `SELECT COUNT(*) AS n FROM student_course
        WHERE inscriptionCourseId = ? AND id IN (?)`,
      [inscriptionId, studentIds],
    );
    return Number(n);
  }
}
