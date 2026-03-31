export class OpenInscriptionDtoOutput {
  id: string;
  name: string;
  endDate: Date;
  cursinho: {
    name: string;
    logo: string | null;
  };
}
