import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Class } from '../class/class.entity';
import { CoursePeriod } from '../coursePeriod/course-period.entity';
import { IndicadorDiarioTurma } from './indicador-diario-turma.entity';

export interface TurmaDoPeriodo {
  id: string;
  nome: string;
}

@Injectable()
export class IndicadoresRepository {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  private get snapshots() {
    return this.em.getRepository(IndicadorDiarioTurma);
  }

  async periodosDoCursinho(cursinhoId: string): Promise<CoursePeriod[]> {
    return this.em
      .getRepository(CoursePeriod)
      .createQueryBuilder('p')
      .where('p.partner_prep_course_id = :cursinhoId', { cursinhoId })
      .andWhere('p.deleted_at IS NULL')
      .orderBy('p.startDate', 'DESC')
      .getMany();
  }

  async periodoDoCursinho(
    periodoId: string,
    cursinhoId: string,
  ): Promise<CoursePeriod | null> {
    return this.em
      .getRepository(CoursePeriod)
      .createQueryBuilder('p')
      .where('p.id = :periodoId', { periodoId })
      .andWhere('p.partner_prep_course_id = :cursinhoId', { cursinhoId })
      .andWhere('p.deleted_at IS NULL')
      .getOne();
  }

  /** Períodos (de todos os cursinhos) com algum dia em `[desde, ate]`. */
  async periodosQueCobrem(
    desde: Date,
    ate: Date,
  ): Promise<(CoursePeriod & { partnerPrepCourseId: string })[]> {
    const linhas = await this.em
      .getRepository(CoursePeriod)
      .createQueryBuilder('p')
      .addSelect('p.partner_prep_course_id', 'cursinhoId')
      .where('p.deleted_at IS NULL')
      .andWhere('p.startDate <= :ate', { ate })
      .andWhere('p.endDate >= :desde', { desde })
      .getRawAndEntities();
    return linhas.entities.map((p, i) =>
      Object.assign(p, { partnerPrepCourseId: linhas.raw[i].cursinhoId }),
    );
  }

  async turmasSemPeriodo(cursinhoId: string): Promise<number> {
    return this.em
      .getRepository(Class)
      .createQueryBuilder('c')
      .where('c.partner_prep_course_id = :cursinhoId', { cursinhoId })
      .andWhere('c.course_period_id IS NULL')
      .andWhere('c.deleted_at IS NULL')
      .getCount();
  }

  async turmasDoPeriodo(periodoId: string): Promise<TurmaDoPeriodo[]> {
    const turmas = await this.em
      .getRepository(Class)
      .createQueryBuilder('c')
      .select(['c.id', 'c.name'])
      .where('c.course_period_id = :periodoId', { periodoId })
      .andWhere('c.deleted_at IS NULL')
      .orderBy('c.name', 'ASC')
      .getMany();
    return turmas.map((t) => ({ id: t.id, nome: t.name }));
  }

  /** Nome (social, quando a pessoa usa) e telefone dos alunos. */
  async contatosDosAlunos(alunoIds: string[]) {
    const linhas: {
      id: string;
      firstName: string;
      lastName: string;
      socialName: string | null;
      useSocialName: number;
      telefone: string | null;
    }[] = await this.em.query(
      `SELECT sc.id, u.firstName, u.lastName, u.socialName, u.useSocialName,
              COALESCE(sc.whatsapp, u.phone) AS telefone
         FROM student_course sc
         JOIN users u ON u.id = sc.user_id
        WHERE sc.id IN (?)`,
      [alunoIds],
    );
    return new Map(
      linhas.map((l) => [
        l.id,
        {
          nome:
            Number(l.useSocialName) && l.socialName
              ? `${l.socialName.split(' ')[0]} ${l.lastName}`
              : `${l.firstName} ${l.lastName}`,
          telefone: l.telefone,
        },
      ]),
    );
  }

  /** Usuários dos alunos do período (matrícula confirmada), por turma. */
  async usuariosDasTurmas(
    turmaIds: string[],
  ): Promise<{ turmaId: string; userId: string }[]> {
    if (turmaIds.length === 0) return [];
    return this.em.query(
      `SELECT sc.classId AS turmaId, sc.user_id AS userId
         FROM student_course sc
        WHERE sc.classId IN (?) AND sc.deleted_at IS NULL
          AND sc.cod_enrolled IS NOT NULL`,
      [turmaIds],
    );
  }

  /** O papel da pessoa tem `gerenciarEstudantes`? */
  async podeGerenciarEstudantes(userId: string): Promise<boolean> {
    const [linha] = await this.em.query(
      `SELECT r.gerenciar_estudantes AS pode
         FROM users u JOIN roles r ON r.id = u.roleId
        WHERE u.id = ?`,
      [userId],
    );
    return !!Number(linha?.pode);
  }

  /** Grava (ou regrava) a foto do dia de cada turma. */
  async gravar(linhas: Omit<IndicadorDiarioTurma, 'id' | 'createdAt'>[]) {
    if (linhas.length === 0) return;
    await this.snapshots.upsert(linhas, {
      conflictPaths: ['classId', 'dia'],
      skipUpdateIfNoValuesChanged: true,
    });
  }

  /** Dias que a turma já tem gravados, entre `desde` e `ate`. */
  async diasGravados(classId: string, desde: string, ate: string) {
    const linhas = await this.snapshots
      .createQueryBuilder('s')
      .select('s.dia', 'dia')
      .where('s.class_id = :classId', { classId })
      .andWhere('s.dia BETWEEN :desde AND :ate', { desde, ate })
      .getRawMany<{ dia: string | Date }>();
    return new Set(
      linhas.map((l) =>
        typeof l.dia === 'string' ? l.dia.slice(0, 10) : diaIso(l.dia),
      ),
    );
  }

  async serieDoPeriodo(
    periodoId: string,
    turmaIds: string[],
  ): Promise<IndicadorDiarioTurma[]> {
    if (turmaIds.length === 0) return [];
    return this.snapshots
      .createQueryBuilder('s')
      .where('s.course_period_id = :periodoId', { periodoId })
      .andWhere('s.class_id IN (:...turmaIds)', { turmaIds })
      .orderBy('s.dia', 'ASC')
      .getMany();
  }
}

/** `DATE` lido como `Date` pelo driver vira meia-noite local; volta ao dia. */
function diaIso(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}
