export const cleanString = (str: string): string => {
  // Remove os acentos
  const normalizedStr = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove os espaços em branco e retorna a string resultante
  return normalizedStr.replace(/\s/g, '');
};
