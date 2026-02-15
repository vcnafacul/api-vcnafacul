import { Period } from '../enum/period';
import { buildFullSeriesActive } from './build-full-series-active';
import { buildFullSeriesLastAccess } from './build-full-series-last-access';

describe('buildFullSeriesActive', () => {
  it('should return empty array for empty input', () => {
    expect(buildFullSeriesActive(Period.day, [])).toEqual([]);
  });

  it('should fill gaps for daily period', () => {
    const raw = [
      { period: '2025-01-01', total: 5, active: 3 },
      { period: '2025-01-03', total: 2, active: 1 },
    ];
    const result = buildFullSeriesActive(Period.day, raw);
    // Find the entries by period name to avoid timezone issues
    const jan01 = result.find((r) => r.period === '2025-01-01');
    const jan02 = result.find((r) => r.period === '2025-01-02');
    const jan03 = result.find((r) => r.period === '2025-01-03');
    expect(jan01).toEqual({ period: '2025-01-01', total: 5, active: 3 });
    expect(jan02).toEqual({ period: '2025-01-02', total: 0, active: 0 });
    expect(jan03).toEqual({ period: '2025-01-03', total: 2, active: 1 });
  });

  it('should fill gaps for monthly period', () => {
    const raw = [
      { period: '2025-01', total: 10, active: 8 },
      { period: '2025-03', total: 5, active: 2 },
    ];
    const result = buildFullSeriesActive(Period.month, raw);
    const feb = result.find((r) => r.period === '2025-02');
    expect(feb).toEqual({ period: '2025-02', total: 0, active: 0 });
    expect(result.find((r) => r.period === '2025-01')).toBeDefined();
    expect(result.find((r) => r.period === '2025-03')).toBeDefined();
  });

  it('should fill gaps for yearly period', () => {
    const raw = [
      { period: '2023', total: 100, active: 80 },
      { period: '2025', total: 50, active: 40 },
    ];
    const result = buildFullSeriesActive(Period.year, raw);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ period: '2024', total: 0, active: 0 });
  });

  it('should handle single entry for yearly', () => {
    const raw = [{ period: '2025', total: 3, active: 1 }];
    const result = buildFullSeriesActive(Period.year, raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(raw[0]);
  });
});

describe('buildFullSeriesLastAccess', () => {
  it('should return empty array for empty input', () => {
    expect(buildFullSeriesLastAccess(Period.day, [])).toEqual([]);
  });

  it('should fill gaps for daily period', () => {
    const raw = [
      { period: '2025-01-01', total: 5 },
      { period: '2025-01-03', total: 2 },
    ];
    const result = buildFullSeriesLastAccess(Period.day, raw);
    const jan02 = result.find((r) => r.period === '2025-01-02');
    expect(jan02).toEqual({ period: '2025-01-02', total: 0 });
  });

  it('should fill gaps for monthly period', () => {
    const raw = [
      { period: '2025-01', total: 10 },
      { period: '2025-03', total: 5 },
    ];
    const result = buildFullSeriesLastAccess(Period.month, raw);
    const feb = result.find((r) => r.period === '2025-02');
    expect(feb).toEqual({ period: '2025-02', total: 0 });
  });

  it('should fill gaps for yearly period', () => {
    const raw = [
      { period: '2023', total: 100 },
      { period: '2025', total: 50 },
    ];
    const result = buildFullSeriesLastAccess(Period.year, raw);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ period: '2024', total: 0 });
  });
});
