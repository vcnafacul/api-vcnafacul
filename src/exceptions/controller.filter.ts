/* istanbul ignore file */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class ControllerExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno';

    // Só objeto puro é espalhado: spread de string viraria { '0': 'p', ... } e
    // de array viraria índices numéricos no corpo da resposta.
    const isPlainObject =
      typeof body === 'object' && body !== null && !Array.isArray(body);

    let message = body;
    if (isPlainObject && body.hasOwnProperty('message')) {
      message = body['message'];
    }

    response.status(status).json({
      // Campos extras do corpo (ex.: `simuladosUsando`/`provasUsando` no 409 de
      // categoria em uso, vindos do ms-simulado via HttpServiceAxios) precisam
      // sobreviver até o cliente — antes só `message` passava. Vem antes das
      // chaves canônicas de propósito: statusCode/timestamp/path são autoridade
      // do filtro e não podem ser sobrescritos pelo corpo.
      ...(isPlainObject ? (body as Record<string, unknown>) : {}),
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
