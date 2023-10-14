import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UserRoleService } from 'src/modules/user-role/user-role.service';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsMiddleware implements NestMiddleware {
  constructor(
    private readonly userRoleService: UserRoleService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authorizationHeader = req.headers.authorization;

    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
      const token = authorizationHeader.slice(7); // Remove o prefixo "Bearer " do token
      try {
        const decoded = jwt.verify(
          token,
          this.configService.get<string>('APP_KEY'),
        );
        const userId = (decoded as jwt.JwtPayload).user.id;

        // Verifica se o usuário tem a permissão 'uploadNews'
        if (userId) {
          const hasPermission = await this.userRoleService.checkUserPermission(
            userId,
            'uploadNews',
          );

          if (!hasPermission) {
            return res.status(403).json({ message: 'Acesso não autorizado' });
          }
          next();
        } else {
          return res.status(403).json({ message: 'Acesso não autorizado' });
        }
      } catch (error) {
        // Trate erros específicos, como token expirado
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({ message: 'Token expirado' });
        } else if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ message: 'Token JWT inválido' });
        } else {
          // Outros erros não tratados
          return res.status(500).json({ message: 'Erro interno do servidor' });
        }
      }
    } else {
      return res.status(401).json({ message: 'Token JWT não fornecido' });
    }
  }
}
