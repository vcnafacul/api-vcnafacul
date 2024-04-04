export interface GetAllInput {
  page: number;
  limit: number;
}

export interface GetAllWhereInput extends GetAllInput {
  where?: object;
}
