import { StatusApplication } from '../../studentCourse/enums/stastusApplication';

export class OpenInscriptionDtoOutput {
  id: string;
  name: string;
  endDate: Date;
  cursinho: {
    name: string;
    logo: string | null;
  };
  /** Situação de quem pede neste processo; `null` = não se inscreveu. */
  studentStatus: StatusApplication | null;
}
