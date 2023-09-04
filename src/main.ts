import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
/* import { AllExceptionsFilter } from './exceptions/all.filter'; */
import { useContainer } from 'class-validator';
import { SwaggerModule } from '@nestjs/swagger';
import { document } from './config/swagger.config';

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
  SwaggerModule.setup('api', app, document(app));
  await app.listen(3000);
}
bootstrap();
