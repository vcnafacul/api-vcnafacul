export const cleanString = (str: string): string => {
  // Remove os acentos
  const normalizedStr = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove os caracteres especiais e substitui por string vazia
  const cleanedStr = normalizedStr.replace(/[^\w\s]/gi, '');

  // Remove os espaços em branco e retorna a string resultante
  return cleanedStr.replace(/\s/g, '_');
};
