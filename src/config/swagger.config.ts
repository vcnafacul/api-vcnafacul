import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Você na Facul')
  .setDescription('The vCnafacul API description')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

export const document = (app: any) => SwaggerModule.createDocument(app, config);
