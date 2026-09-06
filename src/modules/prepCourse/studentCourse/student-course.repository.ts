import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  Filter,
  GetAllWhereInput,
} from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { NodeRepository } from 'src/shared/modules/node/node.repository';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { StatusApplication } from './enums/stastusApplication';
import { StudentCourse } from './student-course.entity';
import { Period } from 'src/modules/user/enum/period';
import { AggregateStudentCoursePeriodDtoOutput } from './dtos/aggregate-student-course-period.dto.output';
import { buildFullSeries } from './handler/build-full-series';

@Injectable()
export class StudentCourseRepository extends NodeRepository<StudentCourse> {
  // `class` e `birthday` NAO estao aqui de propósito: sao tratados em ramos
  // proprios do applyEnrolledFilters, com join e comparacao de data. Quem le
  // este mapa isolado concluiria que nao sao suportados.
  private static readonly FILTERABLE_FIELDS: Record<string, string> = {
    cod_enrolled: 'entity.cod_enrolled',
    cpf: 'entity.cpf',
    email: 'entity.email',
    whatsapp: 'entity.whatsapp',
    applicationStatus: 'entity.applicationStatus',
  };

  /**
   * Colunas do grid que podem ser usadas em `sort[field]`.
   *
   * Sem esta whitelist, `orderBy(`entity.${campo}`)` era montado com o texto
   * que veio da query string. Levantamento do que acontecia antes:
   *
   * - 500 em `actions`, `schoolYear`, `name`, `birthday`, `age` e qualquer
   *   campo desconhecido — o caminho de paginacao `distinctAlias` do TypeORM
   *   resolve a coluna pelos metadados e estoura antes de chegar ao SQL;
   * - 200 **com ordem errada** em `class` e `inscriptionCourse`: sao
   *   propriedades de relacao, entao `entity.class` resolvia para a coluna de
   *   FK e ordenava pelo uuid. O usuario clicava em "Turma" e recebia uma
   *   ordem arbitraria que parecia plausivel — pior que o erro, porque nao da
   *   para perceber.
   */
  private static readonly SORTABLE_FIELDS: Record<string, string> = {
    cod_enrolled: 'entity.cod_enrolled',
    cpf: 'entity.cpf',
    email: 'entity.email',
    whatsapp: 'entity.whatsapp',
    applicationStatus: 'entity.applicationStatus',
    class: 'class.name',
    inscriptionCourse: 'inscription_course.name',
    schoolYear: 'course_period.year',
    birthday: 'users.birthday',
    // O nome exibido depende de `useSocialName`, que o banco nao resolve.
    // Ordenar pelo primeiro nome e a aproximacao mais util disponivel.
    name: 'users.firstName',
  };

  /**
   * `age` e derivado de `birthday`, e a ordem se inverte: quanto mais velho o
   * estudante, mais antiga a data.
   */
  private static readonly INVERTED_SORT_FIELDS = new Set(['age']);

  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(StudentCourse));
  }

  /**
   * Traduz `sort[field]` para a coluna real, validando contra a whitelist.
   *
   * Campo desconhecido responde 400, no mesmo criterio que os filtros ja
   * usam neste metodo — e nao um 500, nem uma ordenacao silenciosamente
   * errada.
   */
  private static applyEnrolledOrder(
    queryBuilder: SelectQueryBuilder<StudentCourse>,
    orderBy?: { field: string; sort: 'ASC' | 'DESC' },
  ): SelectQueryBuilder<StudentCourse> {
    if (!orderBy?.field) {
      return queryBuilder.orderBy('entity.cod_enrolled', 'DESC');
    }

    if (StudentCourseRepository.INVERTED_SORT_FIELDS.has(orderBy.field)) {
      return queryBuilder.orderBy(
        'users.birthday',
        orderBy.sort === 'ASC' ? 'DESC' : 'ASC',
      );
    }

    const column = StudentCourseRepository.SORTABLE_FIELDS[orderBy.field];
    if (!column) {
      throw new HttpException(
        `Ordenação não suportada: ${orderBy.field}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return queryBuilder.orderBy(column, orderBy.sort);
  }

  /**
   * Aplica os filtros da listagem de matriculados (ano letivo + filtros do
   * grid) num query builder ja construido.
   *
   * Existe para que a listagem paginada e a exportacao usem exatamente o mesmo
   * criterio — divergir aqui significa a planilha nao bater com a tela.
   */
  private applyEnrolledFilters(
    queryBuilder: SelectQueryBuilder<StudentCourse>,
    { year, filters }: { year?: number; filters?: Filter[] },
  ): SelectQueryBuilder<StudentCourse> {
    if (year !== undefined && year !== null) {
      queryBuilder = queryBuilder.andWhere('course_period.year = :year', {
        year,
      });
    }

    if (!filters || filters.length === 0) {
      return queryBuilder;
    }

    // O nome do bind leva o indice: com nome fixo, um segundo filtro
    // sobrescreveria o primeiro silenciosamente. Hoje so chega um, mas a
    // prevencao e de graca.
    filters.forEach((filter, index) => {
      const bind = `filterValue_${index}`;
      if (filter.field === 'class') {
        queryBuilder = queryBuilder.andWhere(`class.name LIKE :${bind}`, {
          [bind]: `%${filter.value}%`,
        });
      } else if (filter.field === 'birthday') {
        const dateValue = new Date(filter.value).toISOString().slice(0, 10); // "YYYY-MM-DD"
        const operadores: Record<string, string> = {
          is: '=',
          after: '>',
          before: '<',
        };
        const operador = operadores[filter.operator];
        if (operador) {
          queryBuilder = queryBuilder.andWhere(
            `DATE(users.birthday) ${operador} :${bind}`,
            { [bind]: dateValue },
          );
        }
      } else {
        const column = StudentCourseRepository.FILTERABLE_FIELDS[filter.field];
        if (!column) {
          throw new HttpException(
            `Filtro não suportado: ${filter.field}`,
            HttpStatus.BAD_REQUEST,
          );
        }
        queryBuilder = queryBuilder.andWhere(`${column} LIKE :${bind}`, {
          [bind]: `%${filter.value}%`,
        });
      }
    });

    return queryBuilder;
  }

  override async findAllBy({
    page,
    limit,
    where,
    orderBy,
    filters,
    year,
  }: GetAllWhereInput & {
    year?: number;
  }): Promise<GetAllOutput<StudentCourse>> {
    let queryBuilder = this.repository
      .createQueryBuilder('entity')
      .skip((page - 1) * limit)
      .take(limit)
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
      .leftJoinAndSelect('entity.inscriptionCourse', 'inscription_course')
      .innerJoin('entity.user', 'users')
      .addSelect([
        'users.id',
        'users.firstName',
        'users.lastName',
        'users.socialName',
        'users.email',
        'users.phone',
        'users.state',
        'users.city',
        'users.birthday',
        'users.useSocialName',
      ])
      .where({ ...where })
      .andWhere('entity.deletedAt IS NULL');

    let queryBuilderCount = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
      .leftJoinAndSelect('entity.inscriptionCourse', 'inscription_course')
      .innerJoin('entity.user', 'users')
      .addSelect(['users.birthday'])
      .where({ ...where })
      .andWhere('entity.deletedAt IS NULL');

    // A montagem dos filtros e compartilhada com a exportacao: se cada fluxo
    // montasse o seu, o usuario veria X na tela e baixaria Y.
    queryBuilder = this.applyEnrolledFilters(queryBuilder, { year, filters });
    queryBuilderCount = this.applyEnrolledFilters(queryBuilderCount, {
      year,
      filters,
    });

    queryBuilder = StudentCourseRepository.applyEnrolledOrder(
      queryBuilder,
      orderBy,
    );

    const [data, totalItems] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilderCount.getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  /**
   * Um lote da listagem de matriculados, para a exportacao.
   *
   * Nao calcula o total: a exportacao nao precisa dele, e o `getCount` do
   * `findAllBy` custaria uma query a mais por lote.
   *
   * Usa a mesma montagem de filtros da listagem, com `cod_enrolled` como
   * desempate final — sem ele, registros empatados no campo ordenado podem
   * trocar de posicao entre um lote e outro e aparecer duas vezes ou nenhuma.
   */
  async findEnrolledBatchForExport({
    where,
    orderBy,
    filters,
    year,
    offset,
    limit,
  }: {
    where: object;
    orderBy?: { field: string; sort: 'ASC' | 'DESC' };
    filters?: Filter[];
    year?: number;
    offset: number;
    limit: number;
  }): Promise<StudentCourse[]> {
    let queryBuilder = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
      .leftJoinAndSelect('entity.inscriptionCourse', 'inscription_course')
      .innerJoin('entity.user', 'users')
      .addSelect([
        'users.id',
        'users.firstName',
        'users.lastName',
        'users.socialName',
        'users.email',
        'users.birthday',
        'users.useSocialName',
      ])
      .where({ ...where })
      .andWhere('entity.deletedAt IS NULL');

    queryBuilder = this.applyEnrolledFilters(queryBuilder, { year, filters });

    // Mesma whitelist da listagem: a exportacao recebe o `sort[field]` pelos
    // mesmos query params, entao herdaria o mesmo problema.
    queryBuilder = StudentCourseRepository.applyEnrolledOrder(
      queryBuilder,
      orderBy,
    );
    if (orderBy?.field && orderBy.field !== 'cod_enrolled') {
      queryBuilder = queryBuilder.addOrderBy('entity.cod_enrolled', 'DESC');
    }

    return queryBuilder.skip(offset).take(limit).getMany();
  }

  override async findOneBy(where: object): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ ...where })
      .leftJoinAndSelect('entity.inscriptionCourse', 'inscriptionCourse')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
      .getOne();
  }

  async scheduleEnrolled(
    studentsId: string[],
    data_start: Date,
    data_end: Date,
  ) {
    if (!studentsId || studentsId.length === 0) {
      throw new Error('The studentsId list cannot be empty.');
    }

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        selectEnrolledAt: data_start,
        limitEnrolledAt: data_end,
        applicationStatus: StatusApplication.CalledForEnrollment,
        selectEnrolled: false,
        updatedAt: new Date(),
      })
      .where('id IN (:...studentsId)', { studentsId })
      .execute();
  }

  async getLastEnrollmentCode(): Promise<string | null> {
    const lastCode = await this.repository
      .createQueryBuilder('student_course')
      .select('student_course.cod_enrolled')
      .where('student_course.cod_enrolled IS NOT NULL') // Certifique-se de buscar apenas códigos existentes
      .orderBy('student_course.cod_enrolled', 'DESC') // Ordena decrescente
      .limit(1) // Apenas o último registro
      .getOne();

    return lastCode ? lastCode.cod_enrolled : null;
  }

  async findAllCompletedBy(where: object): Promise<StudentCourse[]> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ ...where })
      .innerJoin('entity.user', 'users')
      .addSelect([
        'users.firstName',
        'users.lastName',
        'users.socialName',
        'users.email',
      ])
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .innerJoin('entity.inscriptionCourse', 'inscriptionCourse')
      .addSelect(['inscriptionCourse.id'])
      .getMany();
  }

  async findOneToSendEmail(id: string): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ id })
      .innerJoin('entity.user', 'users')
      .addSelect([
        'users.firstName',
        'users.lastName',
        'users.socialName',
        'users.email',
      ])
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .innerJoin('entity.inscriptionCourse', 'inscriptionCourse')
      .addSelect(['inscriptionCourse.id'])
      .leftJoinAndSelect('entity.logs', 'logs')
      .getOne();
  }

  async getNotConfirmedEnrolled(): Promise<StudentCourse[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.limitEnrolledAt <= :today', { today })
      .andWhere('entity.applicationStatus = :status', {
        status: StatusApplication.CalledForEnrollment,
      })
      .getMany();
  }

  async notConfirmedEnrolled() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar só a data

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        applicationStatus: StatusApplication.MissedDeadline,
        updatedAt: new Date(),
      })
      .where('limitEnrolledAt <= :today', { today })
      .andWhere('applicationStatus = :status', {
        status: StatusApplication.CalledForEnrollment,
      })
      .execute();
  }

  async getStudentByUserIdAndInscriptionId(
    userId: string,
    inscriptionId: string,
  ) {
    return await this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.user', 'user')
      .addSelect(['user.id'])
      .innerJoin('entity.inscriptionCourse', 'inscriptionCourse')
      .addSelect(['inscriptionCourse.id'])
      .where('user.id = :userId', { userId })
      .andWhere('inscriptionCourse.id = :inscriptionId', { inscriptionId })
      .getOne();
  }

  async getTotalEntity() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .getCount();
  }

  async getTotalEnrolled() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.cod_enrolled IS NOT NULL')
      .getCount();
  }

  async entityByStatus(status: StatusApplication) {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.applicationStatus = :status', { status })
      .getCount();
  }

  async updateStudentStatus(
    studentIds: string[],
    status: StatusApplication,
  ): Promise<void> {
    if (!studentIds || studentIds.length === 0) {
      return;
    }

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        applicationStatus: status,
        updatedAt: new Date(),
      })
      .where('id IN (:...studentIds)', { studentIds })
      .execute();
  }

  async getRegistrationMonitoring(userId: string) {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.userId = :userId', { userId })
      .innerJoinAndSelect('entity.inscriptionCourse', 'inscriptionCourse')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('entity.logs', 'logs')
      //fazer order by createdAt Asc para logs
      .orderBy('logs.createdAt', 'ASC')
      .addOrderBy('entity.createdAt', 'DESC')
      .getMany();
  }

  async findOneForCertificate(id: string): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.id = :id', { id })
      .innerJoinAndSelect('entity.user', 'user')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .innerJoinAndSelect('entity.class', 'class')
      .innerJoinAndSelect('class.coursePeriod', 'course_period')
      .getOne();
  }

  async findOneByCpfAndEnrollmentCode(
    cpf: string,
    enrollmentCode: string,
  ): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.cpf = :cpf', { cpf })
      .andWhere('entity.cod_enrolled = :enrollmentCode', { enrollmentCode })
      .innerJoinAndSelect('entity.user', 'user')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
      .getOne();
  }

  async findOneWithPartnerPrep(id: string): Promise<StudentCourse | null> {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.id = :id', { id })
      .leftJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .leftJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .getOne();
  }

  async findEnrolledByUserId(userId: string): Promise<StudentCourse | null> {
    return this.repository.findOne({
      where: {
        user: { id: userId },
        applicationStatus: StatusApplication.Enrolled,
      },
    });
  }

  async findAllEnrolledWithDetails(userId: string): Promise<StudentCourse[]> {
    return this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.user', 'user')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'ppc')
      .innerJoinAndSelect('ppc.geo', 'geo')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'coursePeriod')
      .where('user.id = :userId', { userId })
      .andWhere('entity.applicationStatus = :status', {
        status: StatusApplication.Enrolled,
      })
      .getMany();
  }

  async countStudentsCurrentlyEnrolled(): Promise<number> {
    const { count } = await this.repository
      .createQueryBuilder('entity')
      .select('COUNT(DISTINCT entity.user_id)', 'count')
      .where('entity.applicationStatus = :status', {
        status: StatusApplication.Enrolled,
      })
      .getRawOne<{ count: string }>();
    return parseInt(count, 10);
  }

  async countStudentsEffectivelyServed(): Promise<number> {
    const { count } = await this.repository
      .createQueryBuilder('entity')
      .select('COUNT(DISTINCT entity.user_id)', 'count')
      .where('entity.applicationStatus IN (:...statuses)', {
        statuses: [
          StatusApplication.Enrolled,
          StatusApplication.EnrollmentCancelled,
          StatusApplication.EnrollmentClosed,
        ],
      })
      .getRawOne<{ count: string }>();
    return parseInt(count, 10);
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('entity')
      .where('entity.user_id = :userId', { userId })
      .getCount();
    return count > 0;
  }

  async findOneWithFullDetails(id: string): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.id = :id', { id })
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.legalGuardian', 'legalGuardian')
      .leftJoinAndSelect('entity.logs', 'logs')
      .leftJoinAndSelect('entity.documents', 'documents')
      .orderBy('logs.created_at', 'DESC')
      .addOrderBy('documents.created_at', 'DESC')
      .getOne();
  }

  async aggregateStudentCourseByPeriod(
    groupBy: Period,
  ): Promise<AggregateStudentCoursePeriodDtoOutput[]> {
    let inscriptionDateExpr: string;
    let enrolmentDateExpr: string;

    switch (groupBy) {
      case 'day':
        inscriptionDateExpr = `DATE_FORMAT(sc.created_at, '%Y-%m-%d')`;
        enrolmentDateExpr = `DATE_FORMAT(sc.selectEnrolledAt, '%Y-%m-%d')`;
        break;

      case 'month':
        inscriptionDateExpr = `DATE_FORMAT(sc.created_at, '%Y-%m')`;
        enrolmentDateExpr = `DATE_FORMAT(sc.selectEnrolledAt, '%Y-%m')`;
        break;

      case 'year':
        inscriptionDateExpr = `CAST(YEAR(sc.created_at) AS CHAR)`;
        enrolmentDateExpr = `CAST(YEAR(sc.selectEnrolledAt) AS CHAR)`;
        break;

      default:
        throw new Error('Invalid groupBy value');
    }

    const inscriptions = await this.repository
      .createQueryBuilder('sc')
      .select(inscriptionDateExpr, 'period')
      .addSelect('COUNT(*)', 'totalInscriptions')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    const enrolments = await this.repository
      .createQueryBuilder('sc')
      .select(enrolmentDateExpr, 'period')
      .addSelect('COUNT(*)', 'totalEnrolments')
      .where('sc.selectEnrolledAt IS NOT NULL')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    const periodsMap = new Map<string, AggregateStudentCoursePeriodDtoOutput>();

    for (const row of inscriptions) {
      periodsMap.set(row.period, {
        period: row.period,
        totalInscriptions: Number(row.totalInscriptions),
        totalEnrolments: 0,
        cumulativeEnrolmentsTotal: 0,
        cumulativeInscriptionsTotal: 0,
      });
    }

    for (const row of enrolments) {
      const existing = periodsMap.get(row.period);

      if (existing) {
        existing.totalEnrolments = Number(row.totalEnrolments);
      } else {
        periodsMap.set(row.period, {
          period: row.period,
          totalInscriptions: 0,
          totalEnrolments: Number(row.totalEnrolments),
          cumulativeEnrolmentsTotal: 0,
          cumulativeInscriptionsTotal: 0,
        });
      }
    }

    const sorted = [...periodsMap.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const fullSeries = buildFullSeries(groupBy, sorted);

    let cumulativeInscriptions = 0;
    let cumulativeEnrolments = 0;

    return fullSeries.map((item) => {
      cumulativeInscriptions += item.totalInscriptions;
      cumulativeEnrolments += item.totalEnrolments ?? 0;

      return {
        period: item.period,
        totalInscriptions: item.totalInscriptions,
        totalEnrolments: item.totalEnrolments,
        cumulativeInscriptionsTotal: cumulativeInscriptions,
        cumulativeEnrolmentsTotal: cumulativeEnrolments,
      };
    });
  }
}
