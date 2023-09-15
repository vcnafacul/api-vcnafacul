import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { SwaggerModule } from '@nestjs/swagger';
import { document } from './config/swagger.config';
import { ControllerExceptionsFilter } from './exceptions/controller.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalFilters(new ControllerExceptionsFilter());
  SwaggerModule.setup('api', app, document(app));
  await app.listen(process.env.PORT);
}
bootstrap();
