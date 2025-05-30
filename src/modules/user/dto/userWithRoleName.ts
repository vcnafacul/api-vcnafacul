export class UserWithRoleName {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthday: Date;
    about: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
    socialName: string;
    city: string;
    state: string;
    lgpd: boolean;
    lastAccess: Date | null;
  };
  roleId: string;
  roleName: string;
}
