import { Period } from 'src/modules/user/enum/period';
import { addDays, addMonths, format } from 'date-fns';
import { AggregateInscriptionCoursePeriodDtoOutput } from '../dtos/aggregate-inscription-course-period.dto.output';

export function buildFullSeries(
  groupBy: Period,
  rawData: AggregateInscriptionCoursePeriodDtoOutput[],
): AggregateInscriptionCoursePeriodDtoOutput[] {
  if (rawData.length === 0) return [];

  // se não tiver start/end no input, usa os limites do raw
  const start =
    groupBy === Period.year
      ? parseInt(rawData[0].period)
      : new Date(rawData[0].period);
  let end =
    groupBy === Period.year
      ? parseInt(rawData[rawData.length - 1].period)
      : new Date(rawData[rawData.length - 1].period);

  if (groupBy === Period.year) end = end;
  else if (groupBy === Period.month) end = addMonths(end, 1);
  else end = addDays(end, 1);

  const results: AggregateInscriptionCoursePeriodDtoOutput[] = [];
  const dataMap = new Map(rawData.map((r) => [r.period.toString(), r]));

  let cursor = start;

  while (cursor <= end) {
    let period: string;

    switch (groupBy) {
      case 'day':
        period = format(cursor, 'yyyy-MM-dd');
        cursor = addDays(cursor, 1);
        break;
      case 'month':
        period = format(cursor, 'yyyy-MM');
        cursor = addMonths(cursor, 1);
        break;
      case 'year':
        period = cursor.toString();
        cursor = (cursor as number) + 1;
        break;
    }
    results.push(
      dataMap.get(period) ?? { period, total: 0, cumulativeTotal: 0 },
    );
  }

  return results;
}
