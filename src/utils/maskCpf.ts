export function maskCpf(cpf: string): string {
  return cpf.replace(/^(\d{3})\.(\d{3})/, '***.***');
}
