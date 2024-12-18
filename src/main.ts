import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { VcnafaculCors } from './config/cors';
import { document } from './config/swagger.config';
import { ControllerExceptionsFilter } from './exceptions/controller.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: VcnafaculCors() });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalFilters(new ControllerExceptionsFilter());
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ limit: '30mb', extended: true }));
  SwaggerModule.setup('api', app, document(app));
  await app.listen(process.env.API_PORT, process.env.HOST);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
