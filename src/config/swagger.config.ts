import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';

const config = new DocumentBuilder()
  .setTitle('Você na Facul')
  .setDescription('The vCnafacul API description')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

export const document = (app: any, password: string) => {
  app.use(
    ['/api', '/api/docs', '/api/docs-json'],
    basicAuth({
      users: { admin: password },
      challenge: true,
    }),
  );
  return SwaggerModule.createDocument(app, config);
};
