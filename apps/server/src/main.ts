import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { AppModule } from './app.module';
import type { ServerEnvConfig } from './config/server-env';
import { resolveCorsOriginOption } from './config/server-env';
import { ADMIN_CONSOLE_HTML } from './modules/admin/admin-console.page';

interface AdminPageRequest {
  method?: string;
  path?: string;
}

interface AdminPageResponse {
  type: (contentType: string) => AdminPageResponse;
  send: (body: string) => void;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appEnv = configService.getOrThrow<ServerEnvConfig>('app');

  app.enableShutdownHooks();
  app.setGlobalPrefix(appEnv.globalPrefix);
  app.enableCors({
    origin: resolveCorsOriginOption(appEnv.corsOrigin),
    credentials: true,
  });
  app.use(compression({ threshold: 1024 }));
  app.use('/admin', (
    request: AdminPageRequest,
    response: AdminPageResponse,
    next: () => void,
  ) => {
    if ((request.method ?? 'GET').toUpperCase() !== 'GET') {
      next();
      return;
    }

    const requestPath = request.path ?? '/';

    if (requestPath === '/' || requestPath === '' || requestPath === '/index.html') {
      response.type('html').send(ADMIN_CONSOLE_HTML);
      return;
    }

    next();
  });
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
