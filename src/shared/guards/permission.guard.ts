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

  snakeToCamel = (snakeStr: string) => {
    return snakeStr
      .split('_')
      .map((word, index) => {
        if (index === 0) {
          // Deixa a primeira palavra em minúsculas
          return word.toLowerCase();
        }
        // Capitaliza a primeira letra de cada palavra subsequente
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  };

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
      request['user'] = decoded.user;
      return await this.userRoleService.checkUserPermission(
        userId,
        this.snakeToCamel(requiredPermissions),
      );
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
