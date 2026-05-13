import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { AppModule } from './app.module';
import type { ServerEnvConfig } from './config/server-env';
import { resolveCorsOriginOption } from './config/server-env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appEnv = configService.getOrThrow<ServerEnvConfig>('app');

  app.enableShutdownHooks();
  app.setGlobalPrefix(appEnv.globalPrefix);
  app.enableCors({
    origin: resolveCorsOriginOption(appEnv.corsOrigin),
  });
  app.use(compression({ threshold: 1024 }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(appEnv.port);
}

void bootstrap();
