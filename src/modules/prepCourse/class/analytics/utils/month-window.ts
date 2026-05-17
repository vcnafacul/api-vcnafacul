export interface CoursePeriodBounds {
  startDate: Date;
  endDate: Date;
}

export function computeMonthWindow(
  month: string,
  period: CoursePeriodBounds,
): { monthStart: Date; monthEnd: Date } {
  const [year, m] = month.split('-').map(Number);
  const naiveStart = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
  const naiveEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59));
  const start = period.startDate > naiveStart ? period.startDate : naiveStart;
  const end = period.endDate < naiveEnd ? period.endDate : naiveEnd;
  return { monthStart: start, monthEnd: end };
}

export function listMonthsInPeriod(
  period: CoursePeriodBounds,
  today = new Date(),
): string[] {
  const cap = period.endDate < today ? period.endDate : today;
  const out: string[] = [];
  const cursor = new Date(
    Date.UTC(
      period.startDate.getUTCFullYear(),
      period.startDate.getUTCMonth(),
      1,
    ),
  );
  while (cursor <= cap) {
    out.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

export function isActivePeriod(
  period: CoursePeriodBounds,
  today = new Date(),
): boolean {
  return today >= period.startDate && today <= period.endDate;
}
