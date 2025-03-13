export interface GetAllInput {
  page: number;
  limit: number;
}

export interface OrConditional {
  prop: string;
  value: any;
}

export interface Sort {
  field: string;
  sort: 'ASC' | 'DESC';
}

export interface Filter {
  field: string;
  value: any;
}

export interface GetAllWhereInput extends GetAllInput {
  where?: object;
  or?: OrConditional[];
  orderBy?: Sort;
  filters?: Filter[];
}
