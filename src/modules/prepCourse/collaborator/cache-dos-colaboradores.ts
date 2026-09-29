/**
 * Cache da lista de colaboradores da página pública do cursinho
 * (tickets/025). Mora aqui, e não na página, para o `CollaboratorService`
 * limpar sem importar o módulo da página (fecharia ciclo).
 */
export const chaveDosColaboradoresDoCursinho = (cursinhoId: string) =>
  `cursinho:colaboradores:${cursinhoId}`;
