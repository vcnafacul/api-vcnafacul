import { Injectable } from '@nestjs/common';
import { UserRoleRepository } from './user-role.repository';
import { UpdateUserRoleInput } from './dto/update-user-role.dto.input';
import { UserRoleDTO } from './dto/user-role.dto.output';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../user/user.entity';

@Injectable()
export class UserRoleService {
  constructor(
    private readonly userRoleRepository: UserRoleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return await this.userRoleRepository.findAll();
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

  async findUserRole(): Promise<UserRoleDTO[]> {
    const userRole = await this.userRoleRepository.findRelations();
    return userRole.map((ur) => ({
      user: ur.user,
      roleId: ur.roleId,
      roleName: ur.role.name,
    }));
  }

  async checkUserPermission(
    userId: number,
    roleName: string,
  ): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOneById(userId);
    return userRole.role[roleName];
  }
}
