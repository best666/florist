import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { AppModule } from './app.module';
import type { ServerEnvConfig } from './config/server-env';
import { resolveCorsOriginOption } from './config/server-env';
import { ADMIN_CONSOLE_HTML } from './modules/admin/admin-console.page';

interface ListenError extends Error {
  code?: string;
}

interface AdminPageRequest {
  method?: string;
  path?: string;
}

interface AdminPageResponse {
  type: (contentType: string) => AdminPageResponse;
  send: (body: string) => void;
}

const MAX_AUTO_PORT_ATTEMPTS = 10;
const DEV_SERVER_RUNTIME_FILE = path.resolve(process.cwd(), '.runtime/dev-server.json');
const UPLOAD_ROOT_DIR = path.resolve(process.cwd(), 'var/uploads');

function writeActivePortRuntimeFile(port: number): void {
  fs.mkdirSync(path.dirname(DEV_SERVER_RUNTIME_FILE), { recursive: true });
  fs.writeFileSync(
    DEV_SERVER_RUNTIME_FILE,
    JSON.stringify({
      pid: process.pid,
      port,
      origin: `http://127.0.0.1:${port}`,
      updatedAt: new Date().toISOString(),
    }, null, 2),
    'utf8',
  );
}

function removeActivePortRuntimeFile(): void {
  if (!fs.existsSync(DEV_SERVER_RUNTIME_FILE)) {
    return;
  }

  try {
    const content = fs.readFileSync(DEV_SERVER_RUNTIME_FILE, 'utf8');
    const runtimeInfo = JSON.parse(content) as { pid?: number };

    if (runtimeInfo.pid !== process.pid) {
      return;
    }
  }
  catch {
    return;
  }

  fs.rmSync(DEV_SERVER_RUNTIME_FILE, { force: true });
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const probeServer = net.createServer();

    probeServer.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(error);
    });

    probeServer.once('listening', () => {
      probeServer.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });

    probeServer.listen(port, '::');
  });
}

function canAutoSwitchPort(): boolean {
  return process.env.NODE_ENV !== 'production';
}

async function listenWithAutoPortFallback(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  initialPort: number,
): Promise<number> {
  for (let attempt = 0; attempt < MAX_AUTO_PORT_ATTEMPTS; attempt += 1) {
    const currentPort = initialPort + attempt;
    const portAvailable = await isPortFree(currentPort);

    if (!portAvailable) {
      if (!canAutoSwitchPort()) {
        const portError = new Error(`Port ${currentPort} is already in use.`) as ListenError;
        portError.code = 'EADDRINUSE';
        throw portError;
      }

      const nextPort = currentPort + 1;

      if (attempt === MAX_AUTO_PORT_ATTEMPTS - 1) {
        const portError = new Error(
          `Port ${initialPort} is already in use, and no free port was found in the range ${initialPort}-${currentPort}.`,
        ) as ListenError;
        portError.code = 'EADDRINUSE';
        throw portError;
      }

      console.warn(`Port ${currentPort} is already in use. Trying ${nextPort} instead.`);
      continue;
    }

    await app.listen(currentPort);
    return currentPort;
  }

  throw new Error(`Unable to bind florist server starting from port ${initialPort}.`);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const appEnv = configService.getOrThrow<ServerEnvConfig>('app');

  app.useLogger(appEnv.appLogLevels);

  app.enableShutdownHooks();
  process.once('exit', () => removeActivePortRuntimeFile());
  process.once('SIGINT', () => removeActivePortRuntimeFile());
  process.once('SIGTERM', () => removeActivePortRuntimeFile());
  app.setGlobalPrefix(appEnv.globalPrefix);
  app.enableCors({
    origin: resolveCorsOriginOption(appEnv.corsOrigin),
    credentials: true,
  });
  app.use(compression({ threshold: 1024 }));
  fs.mkdirSync(UPLOAD_ROOT_DIR, { recursive: true });
  app.useStaticAssets(UPLOAD_ROOT_DIR, {
    prefix: '/uploads',
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  });
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

  try {
    const activePort = await listenWithAutoPortFallback(app, appEnv.port);
    writeActivePortRuntimeFile(activePort);

    if (activePort !== appEnv.port) {
      console.warn(`Florist server started on fallback port ${activePort}.`);
    }
  }
  catch (error) {
    const listenError = error as ListenError;

    if (listenError.code === 'EADDRINUSE') {
      console.error(
        [
          `Port ${appEnv.port} is already in use.`,
          'Stop the existing florist server process or start this instance with a different PORT.',
          'Example: PORT=3001 pnpm --filter @florist/server start:dev',
        ].join(' '),
      );
      await app.close();
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

void bootstrap();
