import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';

export function VcnafaculCors():
  | boolean
  | CorsOptions
  | CorsOptionsDelegate<any> {
  if (process.env.NODE_ENV === 'production') {
    return {
      origin: ['https://www.vcnafacul.com.br', 'https://vcnafacul.com.br'],
      methods: ['POST', 'GET', 'DELETE', 'PUT', 'PATCH'],
      credentials: true, // ✅ Necessário para enviar/receber cookies
    };
  }
  return {
    origin: true,
    credentials: true, // ✅ Necessário para enviar/receber cookies
  };
}
