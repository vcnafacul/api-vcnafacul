import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ClassService } from '../../class.service';
import { listMonthsInPeriod } from '../utils/month-window';
import {
  AnalyticsJobType,
  AnalyticsQueueService,
} from '../queue/analytics-queue.service';

const JOB_TYPES: AnalyticsJobType[] = ['simulado', 'essay'];

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(
    private readonly classService: ClassService,
    private readonly queue: AnalyticsQueueService,
  ) {}

  @Cron('0 3 * * 1')
  async weeklyRefreshCurrentMonth() {
    const activeClasses = await this.classService.findAllWithActivePeriod();
    const items: Array<{
      classId: string;
      month: string;
      type: AnalyticsJobType;
    }> = [];
    for (const klass of activeClasses) {
      if (!klass.coursePeriod) continue;
      const months = listMonthsInPeriod({
        startDate: new Date(klass.coursePeriod.startDate),
        endDate: new Date(klass.coursePeriod.endDate),
      });
      const currentMonth = months[months.length - 1];
      if (!currentMonth) continue;
      for (const type of JOB_TYPES) {
        items.push({ classId: klass.id, month: currentMonth, type });
      }
    }
    if (items.length > 0) {
      await this.queue.enqueueMany(items);
    }
    this.logger.log(
      `Weekly cron enqueued ${items.length} jobs (current month, both types)`,
    );
  }

  @Cron('0 3 1 * *')
  async monthlyRefreshAllMonths() {
    const activeClasses = await this.classService.findAllWithActivePeriod();
    const items: Array<{
      classId: string;
      month: string;
      type: AnalyticsJobType;
    }> = [];
    for (const klass of activeClasses) {
      if (!klass.coursePeriod) continue;
      const months = listMonthsInPeriod({
        startDate: new Date(klass.coursePeriod.startDate),
        endDate: new Date(klass.coursePeriod.endDate),
      });
      for (const month of months) {
        for (const type of JOB_TYPES) {
          items.push({ classId: klass.id, month, type });
        }
      }
    }
    if (items.length > 0) {
      await this.queue.enqueueMany(items);
    }
    this.logger.log(
      `Monthly cron enqueued ${items.length} jobs (all months of active classes, both types)`,
    );
  }
}
