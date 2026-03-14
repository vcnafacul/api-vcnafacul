import { adjustDate } from './adjustDate';
import { cleanString } from './cleanString';
import { maskCpf } from './maskCpf';
import { maskEmail } from './maskEmail';
import { maskPhone } from './maskPhone';
import { maskRg } from './maskRg';

describe('maskEmail', () => {
  it('should mask a normal email', () => {
    expect(maskEmail('fernando@gmail.com')).toBe('f******o@gmail.com');
  });

  it('should mask a short user (2 chars)', () => {
    expect(maskEmail('ab@gmail.com')).toBe('a*@gmail.com');
  });

  it('should return fallback for invalid email', () => {
    expect(maskEmail('noemail')).toBe('***@***');
  });

  it('should lowercase the email', () => {
    expect(maskEmail('User@Domain.COM')).toBe('u**r@domain.com');
  });
});

describe('maskPhone', () => {
  it('should mask a phone with 11 digits', () => {
    expect(maskPhone('11987654321')).toBe('(11) *****-4321');
  });

  it('should mask a formatted phone', () => {
    expect(maskPhone('(11) 98765-4321')).toBe('(11) *****-4321');
  });

  it('should return fallback for short phone', () => {
    expect(maskPhone('12345')).toBe('(**) *****-****');
  });
});

describe('maskRg', () => {
  it('should mask a valid RG', () => {
    expect(maskRg('123456789')).toBe('***.***.78-9');
  });

  it('should return fallback for undefined', () => {
    expect(maskRg(undefined)).toBe('***.***.***-*');
  });

  it('should return fallback for short RG', () => {
    expect(maskRg('1234')).toBe('***.***.***-*');
  });
});

describe('maskCpf', () => {
  it('should mask a formatted CPF', () => {
    expect(maskCpf('123.456.789-00')).toBe('***.***.789-00');
  });

  it('should return fallback for undefined', () => {
    expect(maskCpf(undefined)).toBe('***.***.***-**');
  });
});

describe('adjustDate', () => {
  it('should add days to a date', () => {
    const date = new Date(2025, 0, 1); // Jan 1 local
    const result = adjustDate(date, 5);
    expect(result.getDate()).toBe(6);
  });

  it('should subtract days', () => {
    const date = new Date(2025, 0, 10);
    const result = adjustDate(date, -3);
    expect(result.getDate()).toBe(7);
  });

  it('should not mutate original date', () => {
    const date = new Date(2025, 5, 15);
    adjustDate(date, 10);
    expect(date.getDate()).toBe(15);
  });
});

describe('cleanString', () => {
  it('should remove accents', () => {
    expect(cleanString('café')).toBe('cafe');
    expect(cleanString('José')).toBe('Jose');
  });

  it('should replace special characters with nothing and spaces with underscore', () => {
    expect(cleanString('foo bar')).toBe('foo_bar');
    expect(cleanString('a-b c.d')).toBe('ab_cd');
  });

  it('should keep alphanumeric and replace spaces with underscore', () => {
    expect(cleanString('hello world')).toBe('hello_world');
  });

  it('should handle empty string', () => {
    expect(cleanString('')).toBe('');
  });
});
