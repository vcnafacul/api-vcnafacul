import { Injectable } from '@nestjs/common';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../user/user.entity';
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
    where,
  }: GetAllInput): Promise<GetAllDtoOutput<UserRoleDTO>> {
    const userRole = await this._repository.findAllBy({ page, limit, where });
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
    userId: number,
    roleName: string,
  ): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOneBy({ userId });
    return userRole.role[roleName];
  }
}
