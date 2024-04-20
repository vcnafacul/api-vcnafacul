import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';

export interface GetAllGeoInput extends GetAllInput {
  where: object;
}
