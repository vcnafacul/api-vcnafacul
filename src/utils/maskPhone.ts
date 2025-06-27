export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, ''); // remove tudo que não for número

  if (digits.length < 10) return '(**) *****-****';

  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);

  return `(${ddd}) *****-${last4}`;
}
