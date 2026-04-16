export class CollaboratorDashboardDtoOutput {
  cursinho: {
    name: string;
    logo: string | null;
  };
  frentes: Array<{ id: string; name: string }>;
}
