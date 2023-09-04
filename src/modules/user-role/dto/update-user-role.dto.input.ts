import { ApiProperty } from '@nestjs/swagger';
import { RoleExist } from 'src/modules/role/validator/role-exist.validator';
import { UserExist } from 'src/modules/user/validator/user-exist.validator';

export class UpdateUserRoleInput {
  @UserExist({ message: 'User not exist' })
  @ApiProperty()
  userId: number;
  @RoleExist({ message: 'Role not exist' })
  @ApiProperty()
  roleId: number;
}
