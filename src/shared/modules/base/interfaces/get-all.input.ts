export interface GetAllInput {
  page: number;
  limit: number;
}

export interface OrConditional {
  prop: string;
  value: any;
}

export interface GetAllWhereInput extends GetAllInput {
  where?: object;
  or?: OrConditional[];
}
