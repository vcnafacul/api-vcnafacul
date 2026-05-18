import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isActivePeriod,
  listMonthsInPeriod,
} from '../analytics/utils/month-window';
import { AnalyticsQueueService } from '../analytics/queue/analytics-queue.service';
import { ClassService } from '../class.service';
import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import { ClassEssayAnalyticsRepository } from './class-essay-analytics.repository';
import { ClassEssaySnapshot } from './class-essay-snapshot.entity';
import { EssayMonthDtoOutput } from './dtos/essay-month.dto.output';
import {
  EssayMonthSummary,
  ListEssayMonthsDtoOutput,
} from './dtos/list-essay-months.dto.output';
import { RefreshEssayDtoOutput } from './dtos/refresh-essay.dto.output';

interface RefreshOneMonthInternalInput {
  classId: string;
  month: string;
  monthStart: Date;
  monthEnd: Date;
  userIds: string[];
}

@Injectable()
export class ClassEssayAnalyticsService {
  constructor(
    private readonly classService: ClassService,
    private readonly repository: ClassEssayAnalyticsRepository,
    private readonly analyticsQueue: AnalyticsQueueService,
  ) {}

  async listMonths(
    classId: string,
    requesterId: string,
  ): Promise<ListEssayMonthsDtoOutput> {
    const klass = await this.classService.findOneById(classId, requesterId);
    if (!klass.coursePeriodStartDate) {
      throw new BadRequestException('Class has no course period');
    }

    const period = {
      startDate: new Date(klass.coursePeriodStartDate),
      endDate: new Date(klass.coursePeriodEndDate),
    };
    const snaps = await this.repository.listByClass(classId);

    const months: EssayMonthSummary[] = snaps.map((s) =>
      this.mapSnapshotToMonth(s),
    );

    return {
      classId,
      className: klass.name,
      coursePeriod: {
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
        isActive: isActivePeriod(period),
      },
      totalStudents: (klass.students ?? []).filter(
        (s) => s.status === StatusApplication.Enrolled,
      ).length,
      months,
    };
  }

  async getByMonth(
    classId: string,
    month: string,
    requesterId: string,
  ): Promise<EssayMonthDtoOutput> {
    const klass = await this.classService.findOneById(classId, requesterId);
    const snap = await this.repository.findOneByMonth(classId, month);
    if (!snap) {
      throw new NotFoundException('Snapshot not generated for this month');
    }
    return { classId, className: klass.name, ...this.mapSnapshotToMonth(snap) };
  }

  async refresh(
    classId: string,
    scope: 'current' | 'all',
    requesterId: string,
  ): Promise<RefreshEssayDtoOutput> {
    const klass = await this.classService.findOneById(classId, requesterId);
    if (!klass.coursePeriodStartDate) {
      throw new BadRequestException('Class has no course period');
    }
    const period = {
      startDate: new Date(klass.coursePeriodStartDate),
      endDate: new Date(klass.coursePeriodEndDate),
    };
    if (!isActivePeriod(period)) {
      throw new BadRequestException('Period not active');
    }

    const allMonths = listMonthsInPeriod(period);
    const months =
      scope === 'all' ? allMonths : [allMonths[allMonths.length - 1]];

    const items = months.map((m) => ({
      classId,
      month: m,
      type: 'essay' as const,
    }));
    await this.analyticsQueue.enqueueMany(items);

    return {
      enqueued: items,
      estimatedSeconds: months.length * 2,
    };
  }

  private mapSnapshotToMonth(snap: ClassEssaySnapshot): EssayMonthSummary {
    return {
      month: snap.month,
      monthStart: snap.monthStart.toISOString(),
      monthEnd: snap.monthEnd.toISOString(),
      geral: snap.payload.geral,
      competencias: snap.payload.competencias,
      studentsWithAtLeastOneHumanReview:
        snap.payload.studentsWithAtLeastOneHumanReview,
      essaysReviewedByHuman: snap.payload.essaysReviewedByHuman,
      essaysSubmittedTotal: snap.payload.essaysSubmittedTotal,
      humanReviewRate: snap.payload.humanReviewRate,
      generatedAt: snap.generatedAt.toISOString(),
    };
  }

  /** Called by AnalyticsWorkerService when type='essay' (Phase B). No permission check — internal use only. */
  async refreshOneMonthInternal({
    classId,
    month,
    monthStart,
    monthEnd,
    userIds,
  }: RefreshOneMonthInternalInput): Promise<ClassEssaySnapshot> {
    const payload = await this.repository.aggregateMonth({
      classId,
      monthStart,
      monthEnd,
    });
    return this.repository.upsert({
      classId,
      month,
      monthStart,
      monthEnd,
      userIds,
      payload,
      generatedAt: new Date(),
      sourceEssayCount: payload.essaysReviewedByHuman,
    });
  }
}
