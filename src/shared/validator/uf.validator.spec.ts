import { UFValidator } from './uf.validator';

describe('UFValidator', () => {
  let validator: UFValidator;

  beforeEach(() => {
    validator = new UFValidator();
  });

  it('should return true for a valid UF', () => {
    expect(validator.validate('SP')).toBe(true);
    expect(validator.validate('RJ')).toBe(true);
    expect(validator.validate('MG')).toBe(true);
  });

  it('should return false for an invalid UF', () => {
    expect(validator.validate('XX')).toBe(false);
    expect(validator.validate('')).toBe(false);
  });
});
