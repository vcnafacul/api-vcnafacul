import {
  computeMonthWindow,
  CoursePeriodBounds,
  listMonthsInPeriod,
  isActivePeriod,
} from './month-window';

describe('month-window utilities', () => {
  describe('computeMonthWindow', () => {
    const period: CoursePeriodBounds = {
      startDate: new Date(Date.UTC(2026, 1, 23, 0, 0, 0)), // 2026-02-23
      endDate: new Date(Date.UTC(2026, 11, 15, 23, 59, 59)), // 2026-12-15
    };

    it('should truncate month start if period starts after month start', () => {
      const result = computeMonthWindow('2026-02', period);
      expect(result.monthStart).toEqual(
        new Date(Date.UTC(2026, 1, 23, 0, 0, 0)),
      );
    });

    it('should truncate month end if period ends before month end', () => {
      const result = computeMonthWindow('2026-12', period);
      expect(result.monthEnd).toEqual(
        new Date(Date.UTC(2026, 11, 15, 23, 59, 59)),
      );
    });

    it('should return full month when period contains entire month', () => {
      const result = computeMonthWindow('2026-06', period);
      expect(result.monthStart).toEqual(
        new Date(Date.UTC(2026, 5, 1, 0, 0, 0)),
      );
      expect(result.monthEnd).toEqual(
        new Date(Date.UTC(2026, 5, 30, 23, 59, 59)),
      );
    });
  });

  describe('listMonthsInPeriod', () => {
    const period: CoursePeriodBounds = {
      startDate: new Date(Date.UTC(2026, 1, 23, 0, 0, 0)), // 2026-02-23
      endDate: new Date(Date.UTC(2026, 11, 15, 23, 59, 59)), // 2026-12-15
    };

    it('should list months from period start until today', () => {
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0)); // 2026-05-16
      const result = listMonthsInPeriod(period, today);
      expect(result).toEqual(['2026-02', '2026-03', '2026-04', '2026-05']);
    });

    it('should cap at period end date if it is before today', () => {
      const today = new Date(Date.UTC(2027, 0, 1, 0, 0, 0)); // 2027-01-01
      const result = listMonthsInPeriod(period, today);
      expect(result).toContain('2026-12');
      expect(result.every((m) => m.startsWith('2026-'))).toBe(true);
    });

    it('should work with period that ends before period.endDate', () => {
      const periodShort: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), // 2026-01-01
        endDate: new Date(Date.UTC(2026, 2, 31, 23, 59, 59)), // 2026-03-31
      };
      const today = new Date(Date.UTC(2026, 5, 16, 12, 0, 0)); // 2026-06-16
      const result = listMonthsInPeriod(periodShort, today);
      expect(result).toEqual(['2026-01', '2026-02', '2026-03']);
    });

    it('should return empty array if period start is after today', () => {
      const periodFuture: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 5, 1, 0, 0, 0)), // 2026-06-01
        endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59)), // 2026-12-31
      };
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0)); // 2026-05-16
      const result = listMonthsInPeriod(periodFuture, today);
      expect(result).toEqual([]);
    });
  });

  describe('isActivePeriod', () => {
    it('should return true if today is within period', () => {
      const period: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)),
        endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
      };
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0)); // 2026-05-16
      expect(isActivePeriod(period, today)).toBe(true);
    });

    it('should return false if today is before period start', () => {
      const period: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 5, 1, 0, 0, 0)),
        endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
      };
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0)); // 2026-05-16
      expect(isActivePeriod(period, today)).toBe(false);
    });

    it('should return false if today is after period end', () => {
      const period: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)),
        endDate: new Date(Date.UTC(2026, 3, 31, 23, 59, 59)),
      };
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0)); // 2026-05-16
      expect(isActivePeriod(period, today)).toBe(false);
    });

    it('should return true if today equals period start', () => {
      const period: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 4, 16, 12, 0, 0)),
        endDate: new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
      };
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0));
      expect(isActivePeriod(period, today)).toBe(true);
    });

    it('should return true if today equals period end', () => {
      const period: CoursePeriodBounds = {
        startDate: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)),
        endDate: new Date(Date.UTC(2026, 4, 16, 12, 0, 0)),
      };
      const today = new Date(Date.UTC(2026, 4, 16, 12, 0, 0));
      expect(isActivePeriod(period, today)).toBe(true);
    });
  });
});
