import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import {
  ClassEssayPayload,
  ClassEssaySnapshot,
} from './class-essay-snapshot.entity';

interface AggregateMonthInput {
  classId: string;
  monthStart: Date;
  monthEnd: Date;
}

@Injectable()
export class ClassEssayAnalyticsRepository {
  constructor(
    @InjectRepository(ClassEssaySnapshot)
    private readonly snapRepo: Repository<ClassEssaySnapshot>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  findOneByMonth(classId: string, month: string) {
    return this.snapRepo.findOne({ where: { classId, month } });
  }

  listByClass(classId: string) {
    return this.snapRepo.find({
      where: { classId },
      order: { month: 'DESC' },
    });
  }

  async upsert(doc: Partial<ClassEssaySnapshot>) {
    const existing = await this.snapRepo.findOne({
      where: { classId: doc.classId, month: doc.month },
    });
    if (existing) {
      Object.assign(existing, doc);
      return this.snapRepo.save(existing);
    }
    return this.snapRepo.save(this.snapRepo.create(doc));
  }

  async aggregateMonth({
    classId,
    monthStart,
    monthEnd,
  }: AggregateMonthInput): Promise<ClassEssayPayload> {
    // 1) Buscar linhas (essay + review humana mais recente) para alunos Enrolled da turma
    const rows: Array<{
      userId: string;
      essayId: string;
      totalScore: number | string;
      c1: number | string;
      c2: number | string;
      c3: number | string;
      c4: number | string;
      c5: number | string;
    }> = await this.dataSource.query(
      `
        SELECT
          sc.user_id AS userId,
          e.id AS essayId,
          er.total_score AS totalScore,
          er.comp1_score AS c1,
          er.comp2_score AS c2,
          er.comp3_score AS c3,
          er.comp4_score AS c4,
          er.comp5_score AS c5
        FROM essays e
        INNER JOIN student_course sc ON sc.user_id = e.user_id
        INNER JOIN essay_reviews er
          ON er.essay_id = e.id
          AND er.review_type = 'HUMAN'
          AND er.created_at = (
            SELECT MAX(er2.created_at)
            FROM essay_reviews er2
            WHERE er2.essay_id = er.essay_id
              AND er2.review_type = 'HUMAN'
          )
        WHERE sc.classId = ?
          AND sc.applicationStatus = ?
          AND e.status = 'REVIEWED'
          AND e.submitted_at BETWEEN ? AND ?
      `,
      [classId, StatusApplication.Enrolled, monthStart, monthEnd],
    );

    // 2) Agrupa por aluno -> arrays de score
    const byUser = new Map<
      string,
      {
        totalScores: number[];
        c1: number[];
        c2: number[];
        c3: number[];
        c4: number[];
        c5: number[];
      }
    >();
    for (const r of rows) {
      const u = byUser.get(r.userId) ?? {
        totalScores: [],
        c1: [],
        c2: [],
        c3: [],
        c4: [],
        c5: [],
      };
      u.totalScores.push(Number(r.totalScore));
      u.c1.push(Number(r.c1));
      u.c2.push(Number(r.c2));
      u.c3.push(Number(r.c3));
      u.c4.push(Number(r.c4));
      u.c5.push(Number(r.c5));
      byUser.set(r.userId, u);
    }

    // 3) Médias por aluno -> média entre alunos (peso 1 por aluno)
    const avg = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    const userAvgs = [...byUser.values()].map((u) => ({
      total: avg(u.totalScores),
      c1: avg(u.c1),
      c2: avg(u.c2),
      c3: avg(u.c3),
      c4: avg(u.c4),
      c5: avg(u.c5),
    }));

    const meanOf = (key: 'total' | 'c1' | 'c2' | 'c3' | 'c4' | 'c5') =>
      userAvgs.length === 0
        ? 0
        : userAvgs.reduce((acc, u) => acc + u[key], 0) / userAvgs.length;

    const geral = meanOf('total');
    const competencias = {
      c1: meanOf('c1'),
      c2: meanOf('c2'),
      c3: meanOf('c3'),
      c4: meanOf('c4'),
      c5: meanOf('c5'),
    };

    // 4) Contagens auxiliares
    const essaysReviewedByHuman = new Set(rows.map((r) => r.essayId)).size;
    const studentsWithAtLeastOneHumanReview = byUser.size;

    const submittedTotalRow: Array<{
      total: number | string;
      distinctUsers: number | string;
    }> = await this.dataSource.query(
      `
          SELECT
            COUNT(*) AS total,
            COUNT(DISTINCT e.user_id) AS distinctUsers
          FROM essays e
          INNER JOIN student_course sc ON sc.user_id = e.user_id
          WHERE sc.classId = ?
            AND sc.applicationStatus = ?
            AND e.submitted_at BETWEEN ? AND ?
            AND e.status IN ('SUBMITTED', 'REVIEWED')
        `,
      [classId, StatusApplication.Enrolled, monthStart, monthEnd],
    );
    const essaysSubmittedTotal = Number(submittedTotalRow[0]?.total ?? 0);
    const studentsSubmittedTotal = Number(
      submittedTotalRow[0]?.distinctUsers ?? 0,
    );

    const humanReviewRate =
      essaysSubmittedTotal === 0
        ? 0
        : essaysReviewedByHuman / essaysSubmittedTotal;

    return {
      geral,
      competencias,
      studentsWithAtLeastOneHumanReview,
      essaysReviewedByHuman,
      essaysSubmittedTotal,
      studentsSubmittedTotal,
      humanReviewRate,
    };
  }
}
