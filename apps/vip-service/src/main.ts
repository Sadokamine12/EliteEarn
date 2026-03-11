import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.VIP_SERVICE_PORT ?? process.env.PORT ?? 3003);
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap vip-service', error);
  process.exitCode = 1;
});
