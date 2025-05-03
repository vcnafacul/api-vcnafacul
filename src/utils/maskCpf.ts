export function maskCpf(cpf?: string): string {
  if (!cpf) return '***.***.***-**';
  return cpf.replace(/^(\d{3})\.(\d{3})/, '***.***');
}
