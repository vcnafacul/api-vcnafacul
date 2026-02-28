import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { FrontendErrorBodyDto } from './dto/frontend-error.dto';
import { FrontendErrorsService } from './frontend-errors.service';

const FRONTEND_ERRORS_THROTTLE = {
  default: { ttl: 60000, limit: 30 },
};

@ApiTags('FrontendErrors')
@Controller('frontend-errors')
export class FrontendErrorsController {
  constructor(
    private readonly service: FrontendErrorsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle(FRONTEND_ERRORS_THROTTLE)
  @ApiResponse({ status: 200, description: 'Erro registrado' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async capture(
    @Body() body: FrontendErrorBodyDto,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress;
    const sanitized = this.service.sanitize(body, ip);

    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = this.jwtService.verify<{ user?: { id?: string } }>(token);
        if (payload?.user?.id && typeof payload.user.id === 'string') {
          userId = payload.user.id;
        }
      } catch {
        // Token inválido ou expirado: não preencher userId
      }
    }

    await this.service.capture(sanitized, userId);
    return { status: 'ok' };
  }
}
