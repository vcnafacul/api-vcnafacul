import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { UserRoleService } from 'src/modules/user-role/user-role.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRoleService: UserRoleService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string>(
      PermissionsGuard.name,
      context.getHandler(),
    );
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authorizationHeader.slice(7);

    try {
      const decoded = jwt.verify(
        token,
        this.configService.get<string>('APP_KEY'),
      ) as jwt.JwtPayload;
      const userId = decoded.user?.id;

      if (!userId) {
        return false;
      }
      return await this.userRoleService.checkUserPermission(
        userId,
        'uploadNews',
      );
    } catch (error) {
      return false;
    }
  }
}
