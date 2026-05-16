import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassService } from '../class.service';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import {
  computeMonthWindow,
  isActivePeriod,
  listMonthsInPeriod,
} from './utils/month-window';

@Injectable()
export class ClassAnalyticsService {
  constructor(
    private readonly classService: ClassService,
    private readonly simuladoHttp: SimuladoHttpService,
  ) {}

  async listMonths(classId: string, requesterId: string) {
    const klass = await this.classService.findOneById(classId, requesterId);
    if (!klass.coursePeriodStartDate) {
      throw new BadRequestException('Class has no course period');
    }

    const period = {
      startDate: new Date(klass.coursePeriodStartDate),
      endDate: new Date(klass.coursePeriodEndDate),
    };

    const docs = await this.simuladoHttp.listUserGroupAggregates(classId);

    return {
      classId: klass.id,
      className: klass.name,
      coursePeriod: {
        startDate: period.startDate,
        endDate: period.endDate,
        isActive: isActivePeriod(period),
      },
      totalStudents: klass.students?.length ?? 0,
      months: (docs as any[]).map((d) => ({
        month: d.month,
        monthStart: d.monthStart,
        monthEnd: d.monthEnd,
        geral: d.payload.geral,
        studentsWithAtLeastOneCompletedAttempt:
          d.payload.studentsWithAtLeastOneCompletedAttempt,
        totalAttemptsCompleted: d.payload.totalAttemptsCompleted,
        generatedAt: d.generatedAt,
      })),
    };
  }

  async getByMonth(classId: string, month: string, requesterId: string) {
    const klass = await this.classService.findOneById(classId, requesterId);
    const doc = await this.simuladoHttp.getUserGroupAggregateByMonth(
      classId,
      month,
    );
    if (!doc) throw new NotFoundException('Snapshot not generated for this month');

    return {
      classId: klass.id,
      className: klass.name,
      month: doc.month,
      monthStart: doc.monthStart,
      monthEnd: doc.monthEnd,
      ...doc.payload,
      generatedAt: doc.generatedAt,
    };
  }

  async refresh(classId: string, scope: 'current' | 'all', requesterId: string) {
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
    const monthsToRefresh =
      scope === 'all' ? allMonths : [allMonths[allMonths.length - 1]];

    const enrolledUserIds = (klass.students ?? [])
      .filter((s) => s.status === StatusApplication.Enrolled)
      .map((s) => s.userId);

    for (const month of monthsToRefresh) {
      const { monthStart, monthEnd } = computeMonthWindow(month, period);
      await this.simuladoHttp.calculateUserGroupAggregate({
        groupId: classId,
        month,
        monthStart,
        monthEnd,
        userIds: enrolledUserIds,
      });
    }

    return {
      enqueued: monthsToRefresh.map((m) => ({ classId, month: m })),
      estimatedSeconds: monthsToRefresh.length,
    };
  }
}
