export function maskRg(rg?: string): string {
  if (!rg) return '***.***.***-*';
  const digits = rg.replace(/\D/g, ''); // Remove tudo que não for número
  if (digits.length < 9) return '***.***.***-*'; // fallback caso esteja incompleto

  return `***.***.${digits.slice(6, 8)}-${digits.slice(8, 9)}`;
}
