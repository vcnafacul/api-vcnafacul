import { User } from 'src/modules/user/user.entity';

export class UserRoleDTO {
  user: User;
  roleId: string;
  roleName: string;
}
