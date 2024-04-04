import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { StatusContent } from '../enum/status-content';

export interface GetAllContentInput extends GetAllInput {
  status?: StatusContent;
  subjectId?: number;
  title?: string;
}
