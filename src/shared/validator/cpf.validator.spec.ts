import { CPFValidator } from './cpf.validator';

describe('CPFValidator', () => {
  let validator: CPFValidator;

  beforeEach(() => {
    validator = new CPFValidator();
  });

  it('should return true for a valid CPF', () => {
    expect(validator.validate('529.982.247-25')).toBe(true);
  });

  it('should return false for an invalid CPF', () => {
    expect(validator.validate('111.111.111-11')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validator.validate('')).toBe(false);
  });
});
