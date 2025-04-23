/* istanbul ignore file */
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const traceId = request.headers['x-trace-id'] || uuidv4(); // Gera um traceId se não houver

    return next.handle().pipe(
      catchError((error) => {
        // Se for uma HttpException, consideramos que já foi tratada e não logamos
        if (error instanceof HttpException) {
          throw error;
        }

        // Logamos apenas erros inesperados
        const logData = {
          traceId,
          message: error.message || 'Unhandled exception',
          stack: error.stack,
          method: request.method,
          url: request.url,
          timestamp: new Date().toISOString(),
        };

        this.logger.error(JSON.stringify(logData));

        throw error; // Re-lançamos para não alterar o fluxo da aplicação
      }),
    );
  }
}
