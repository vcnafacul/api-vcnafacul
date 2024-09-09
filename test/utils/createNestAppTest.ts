import { ValidationPipe } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { AppModule } from 'src/app.module';

export function createNestAppTest(moduleFixture: TestingModule) {
  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  return app;
}
