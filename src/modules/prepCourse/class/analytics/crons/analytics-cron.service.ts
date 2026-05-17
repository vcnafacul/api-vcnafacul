import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ClassService } from '../../class.service';
import { listMonthsInPeriod } from '../utils/month-window';
import { AnalyticsQueueService } from '../queue/analytics-queue.service';

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
    let count = 0;
    for (const klass of activeClasses) {
      if (!klass.coursePeriod) continue;
      const months = listMonthsInPeriod({
        startDate: new Date(klass.coursePeriod.startDate),
        endDate: new Date(klass.coursePeriod.endDate),
      });
      const currentMonth = months[months.length - 1];
      if (!currentMonth) continue;
      await this.queue.enqueue(klass.id, currentMonth);
      count++;
    }
    this.logger.log(`Weekly cron enqueued ${count} jobs (current month only)`);
  }

  @Cron('0 3 1 * *')
  async monthlyRefreshAllMonths() {
    const activeClasses = await this.classService.findAllWithActivePeriod();
    let count = 0;
    for (const klass of activeClasses) {
      if (!klass.coursePeriod) continue;
      const months = listMonthsInPeriod({
        startDate: new Date(klass.coursePeriod.startDate),
        endDate: new Date(klass.coursePeriod.endDate),
      });
      for (const month of months) {
        await this.queue.enqueue(klass.id, month);
        count++;
      }
    }
    this.logger.log(
      `Monthly cron enqueued ${count} jobs (all months of active classes)`,
    );
  }
}
