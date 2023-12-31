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
      userId: ur.userId,
      roleId: ur.roleId,
      userName: ur.user.firstName + ' ' + ur.user.lastName,
      userEmail: ur.user.email,
      userPhone: ur.user.phone,
      roleName: ur.role.name,
    }));
  }
}
