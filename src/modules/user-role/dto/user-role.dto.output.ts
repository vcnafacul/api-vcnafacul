import { IsNumber, IsString } from 'class-validator';

export class UserRoleDTO {
  @IsNumber()
  userId: number;

  @IsString()
  userName: string;

  @IsString()
  userEmail: string;

  @IsString()
  userPhone: string;

  @IsNumber()
  roleId: number;

  @IsString()
  roleName: string;
}
