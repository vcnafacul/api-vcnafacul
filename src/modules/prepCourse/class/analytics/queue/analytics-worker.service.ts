import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { StatusApplication } from '../../../studentCourse/enums/stastusApplication';
import { ClassService } from '../../class.service';
import { ClassEssayAnalyticsService } from '../../essay-analytics/class-essay-analytics.service';
import { computeMonthWindow } from '../utils/month-window';
import { QueueConsumer } from '../../../../../shared/modules/queue/queue.consumer';
import { ANALYTICS_STREAM } from './analytics-queue.service';

@Injectable()
export class AnalyticsWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsWorkerService.name);

  constructor(
    private readonly consumer: QueueConsumer,
    private readonly classService: ClassService,
    private readonly simuladoHttp: SimuladoHttpService,
    private readonly essayAnalytics: ClassEssayAnalyticsService,
  ) {}

  onModuleInit() {
    this.consumer.register(
      ANALYTICS_STREAM,
      'api-vcnafacul-analytics',
      'worker-1',
      (id, fields) => this.handle(id, fields),
    );
  }

  async handle(_id: string, fields: Record<string, string>) {
    const { classId, month, type = 'simulado' } = fields;
    if (!classId || !month) {
      this.logger.warn(
        `Skipping message with missing fields: ${JSON.stringify(fields)}`,
      );
      return;
    }

    const klass = await this.classService.findOneByIdForAnalytics(classId);
    if (!klass?.coursePeriod) {
      this.logger.warn(
        `Class ${classId} not found or has no coursePeriod; skipping ${month}`,
      );
      return;
    }

    const period = {
      startDate: new Date(klass.coursePeriod.startDate),
      endDate: new Date(klass.coursePeriod.endDate),
    };
    const { monthStart, monthEnd } = computeMonthWindow(month, period);

    const userIds = (klass.students ?? [])
      .filter((s) => s.applicationStatus === StatusApplication.Enrolled)
      .map((s) => s.userId);

    try {
      if (type === 'simulado') {
        await this.simuladoHttp.calculateUserGroupAggregate({
          groupId: classId,
          month,
          monthStart,
          monthEnd,
          userIds,
        });
      } else if (type === 'essay') {
        await this.essayAnalytics.refreshOneMonthInternal({
          classId,
          month,
          monthStart,
          monthEnd,
          userIds,
        });
      } else {
        this.logger.warn(`Unknown analytics job type: ${type}`);
        return;
      }
      this.logger.log(`Recalculated ${type} ${classId} / ${month}`);
    } catch (err) {
      this.logger.error(
        `Failed to recalc ${type} ${classId} / ${month}`,
        err as Error,
      );
      throw err;
    }
  }
}
