import path from 'node:path';

export type ServerRuntimeMode = 'development' | 'production' | 'test';

export interface ServerEnvSource {
  readonly PORT?: string;
  readonly GLOBAL_PREFIX?: string;
  readonly CORS_ORIGIN?: string;
  readonly DATABASE_URL?: string;
  readonly MYSQL_URL?: string;
  readonly AI_PROXY_BASE_URL?: string;
  readonly AI_PROXY_API_KEY?: string;
}

export interface ServerEnvConfig {
  readonly port: number;
  readonly globalPrefix: string;
  readonly corsOrigin: string;
  readonly databaseUrl: string;
  readonly aiProxyBaseUrl: string;
  readonly aiProxyApiKey: string;
}

export const SERVER_ENV_DEFAULTS = {
  port: 3000,
  globalPrefix: 'api',
  corsOrigin: 'http://localhost:9000',
  databaseUrl: 'file:./prisma/florist.db',
  aiProxyBaseUrl: 'https://example.com',
  aiProxyApiKey: 'replace-with-local-key',
} as const;

function normalizeServerMode(nodeEnv?: string): ServerRuntimeMode {
  if (nodeEnv === 'production') {
    return 'production';
  }

  if (nodeEnv === 'test') {
    return 'test';
  }

  return 'development';
}

function normalizeString(value: string | undefined, fallback: string): string {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : fallback;
}

function normalizeNumber(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function getServerEnvFilePaths(nodeEnv?: string): string[] {
  const runtimeMode = normalizeServerMode(nodeEnv);
  const envDir = path.resolve(process.cwd(), 'env');

  return [
    path.resolve(envDir, `.env.${runtimeMode}.local`),
    path.resolve(envDir, '.env.local'),
    path.resolve(envDir, `.env.${runtimeMode}`),
    path.resolve(envDir, '.env'),
  ];
}

export function resolveServerEnv(envSource: ServerEnvSource): ServerEnvConfig {
  const databaseUrl = normalizeString(
    envSource.DATABASE_URL,
    normalizeString(envSource.MYSQL_URL, SERVER_ENV_DEFAULTS.databaseUrl),
  );

  return {
    port: normalizeNumber(envSource.PORT, SERVER_ENV_DEFAULTS.port),
    globalPrefix: normalizeString(
      envSource.GLOBAL_PREFIX,
      SERVER_ENV_DEFAULTS.globalPrefix,
    ),
    corsOrigin: normalizeString(
      envSource.CORS_ORIGIN,
      SERVER_ENV_DEFAULTS.corsOrigin,
    ),
    databaseUrl,
    aiProxyBaseUrl: normalizeString(
      envSource.AI_PROXY_BASE_URL,
      SERVER_ENV_DEFAULTS.aiProxyBaseUrl,
    ),
    aiProxyApiKey: normalizeString(
      envSource.AI_PROXY_API_KEY,
      SERVER_ENV_DEFAULTS.aiProxyApiKey,
    ),
  };
}

export function validateServerEnv(
  envSource: Record<string, unknown>,
): Record<string, unknown> {
  const parsedEnv = resolveServerEnv(envSource as ServerEnvSource);

  return {
    ...envSource,
    PORT: String(parsedEnv.port),
    GLOBAL_PREFIX: parsedEnv.globalPrefix,
    CORS_ORIGIN: parsedEnv.corsOrigin,
    DATABASE_URL: parsedEnv.databaseUrl,
    MYSQL_URL: parsedEnv.databaseUrl,
    AI_PROXY_BASE_URL: parsedEnv.aiProxyBaseUrl,
    AI_PROXY_API_KEY: parsedEnv.aiProxyApiKey,
  };
}

export function resolveCorsOriginOption(corsOrigin: string): true | string[] {
  if (corsOrigin.trim() === '*') {
    return true;
  }

  const originList = corsOrigin
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  return originList.length > 0
    ? originList
    : [SERVER_ENV_DEFAULTS.corsOrigin];
}
