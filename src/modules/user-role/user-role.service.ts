import { Injectable } from '@nestjs/common';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { BaseService } from 'src/shared/modules/base/base.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../user/user.entity';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { UpdateUserRoleInput } from './dto/update-user-role.dto.input';
import { UserRoleDTO } from './dto/user-role.dto.output';
import { UserRole } from './user-role.entity';
import { UserRoleRepository } from './user-role.repository';

@Injectable()
export class UserRoleService extends BaseService<UserRole> {
  constructor(
    private readonly userRoleRepository: UserRoleRepository,
    private readonly auditLogService: AuditLogService,
  ) {
    super(userRoleRepository);
  }

  async update(userRoleUpdate: UpdateUserRoleInput, user: User) {
    const userRole = await this.userRoleRepository.findOneBy({
      userId: userRoleUpdate.userId,
    });

    if (userRoleUpdate.roleId === userRole.roleId) return false;

    const changes = {
      old: { roleId: userRole.roleId },
      new: { status: userRoleUpdate.roleId },
    };

    userRole.roleId = userRoleUpdate.roleId;
    userRole.role = null;
    await this.userRoleRepository.update(userRole);

    await this.auditLogService.create({
      entityType: 'user_roles',
      entityId: userRole.id,
      updatedBy: user.id,
      changes: changes,
    });
    return true;
  }

  async findUserRole({
    page,
    limit,
    name,
  }: GetUserDtoInput): Promise<GetAllDtoOutput<UserRoleDTO>> {
    const where = {};
    if (name) {
      where['entity.user.name'] = name;
    }
    const userRole = await this.userRoleRepository.findAllBy({
      page,
      limit,
      name,
    });
    return {
      data: userRole.data.map((ur) => ({
        user: ur.user,
        roleId: ur.roleId,
        roleName: ur.role.name,
      })),
      limit,
      page,
      totalItems: userRole.totalItems,
    };
  }

  async checkUserPermission(
    userId: string,
    roleName: string,
  ): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOneBy({ userId });
    return userRole.role[roleName];
  }
}
