import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const traceId = request.headers['x-trace-id'] || uuidv4(); // Gerar um traceId se não houver um fornecido

    return next.handle().pipe(
      catchError((error) => {
        const logData = {
          traceId,
          message: error.message || 'Unhandled exception',
          stack: error.stack,
          method: request.method,
          url: request.url,
          timestamp: new Date().toISOString(),
        };

        this.logger.error(logData);

        throw error; // Re-lançar a exceção para não interferir na resposta
      }),
    );
  }
}
