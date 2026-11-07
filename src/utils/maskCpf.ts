export function maskCpf(cpf?: string): string {
  if (!cpf) return '***.***.***-**';
  // Pelos dígitos: o CPF pode estar salvo com ou sem pontuação, e o que não
  // tem 11 dígitos sai todo oculto (antes, só "123.456..." era mascarado).
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
