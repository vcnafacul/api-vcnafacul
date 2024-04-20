export interface GetAllOutput<T> {
  data: T[];
  page: number;
  limit: number;
  totalItems: number;
}
