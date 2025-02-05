export enum Status {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export const statusLabels: Record<Status, string> = {
  [Status.Pending]: 'Pendente',
  [Status.Approved]: 'Aprovado',
  [Status.Rejected]: 'Rejeitado',
};
