import path from 'node:path';
import type { LogLevel } from '@nestjs/common';

export type ServerRuntimeMode = 'development' | 'production' | 'test';

export interface ServerEnvSource {
  readonly PORT?: string;
  readonly GLOBAL_PREFIX?: string;
  readonly CORS_ORIGIN?: string;
  readonly DATABASE_URL?: string;
  readonly MYSQL_URL?: string;
  readonly DATABASE_ENCRYPTION_KEY?: string;
  readonly DATABASE_SSL_ENABLED?: string;
  readonly BACKUP_CRON?: string;
  readonly BACKUP_DIR?: string;
  readonly BACKUP_RETENTION_DAYS?: string;
  readonly THROTTLE_TTL_MS?: string;
  readonly THROTTLE_LIMIT?: string;
  readonly AI_PROXY_BASE_URL?: string;
  readonly AI_PROXY_API_KEY?: string;
  readonly AI_PROXY_MODEL?: string;
  readonly AI_DAILY_QUOTA?: string;
  readonly AI_CACHE_TTL_MS?: string;
  readonly WEATHER_CACHE_TTL_MS?: string;
  readonly IMAGE_CACHE_TTL_MS?: string;
  readonly REQUEST_LOG_RETENTION_DAYS?: string;
  readonly ADMIN_USERNAME?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly ADMIN_SESSION_SECRET?: string;
  readonly ADMIN_SESSION_TTL_MS?: string;
  readonly H5_LOGIN_PHONE?: string;
  readonly H5_LOGIN_CODE?: string;
  readonly H5_LOGIN_NICKNAME?: string;
  readonly APP_LOG_LEVELS?: string;
  readonly EXPOSE_INTERNAL_ERROR_DETAILS?: string;
}

export interface ServerEnvConfig {
  readonly port: number;
  readonly globalPrefix: string;
  readonly corsOrigin: string;
  readonly databaseUrl: string;
  readonly databaseEncryptionKey: string;
  readonly databaseSslEnabled: boolean;
  readonly backupCron: string;
  readonly backupDir: string;
  readonly backupRetentionDays: number;
  readonly throttleTtlMs: number;
  readonly throttleLimit: number;
  readonly aiProxyBaseUrl: string;
  readonly aiProxyApiKey: string;
  readonly aiProxyModel: string;
  readonly aiDailyQuota: number;
  readonly aiCacheTtlMs: number;
  readonly weatherCacheTtlMs: number;
  readonly imageCacheTtlMs: number;
  readonly requestLogRetentionDays: number;
  readonly adminUsername: string;
  readonly adminPassword: string;
  readonly adminSessionSecret: string;
  readonly adminSessionTtlMs: number;
  readonly h5LoginPhone: string;
  readonly h5LoginCode: string;
  readonly h5LoginNickname: string;
  readonly appLogLevels: LogLevel[];
  readonly exposeInternalErrorDetails: boolean;
}

export const SERVER_ENV_DEFAULTS = {
  port: 3000,
  globalPrefix: 'api',
  corsOrigin: 'http://localhost:9000',
  databaseUrl: 'mysql://florist:florist123@127.0.0.1:3307/florist?connection_limit=5',
  databaseEncryptionKey: 'replace-with-32-char-secret-key',
  databaseSslEnabled: false,
  backupCron: '0 30 3 * * *',
  backupDir: 'var/backups',
  backupRetentionDays: 7,
  throttleTtlMs: 60_000,
  throttleLimit: 120,
  aiProxyBaseUrl: 'https://example.com',
  aiProxyApiKey: 'replace-with-local-key',
  aiProxyModel: 'gpt-4o-mini',
  aiDailyQuota: 60,
  aiCacheTtlMs: 10 * 60 * 1000,
  weatherCacheTtlMs: 15 * 60 * 1000,
  imageCacheTtlMs: 60 * 60 * 1000,
  requestLogRetentionDays: 14,
  adminUsername: 'admin',
  adminPassword: 'change-this-admin-password',
  adminSessionSecret: 'replace-with-admin-session-secret',
  adminSessionTtlMs: 12 * 60 * 60 * 1000,
  h5LoginPhone: '',
  h5LoginCode: '',
  h5LoginNickname: 'H5 花友',
  appLogLevels: ['log', 'warn', 'error', 'debug', 'verbose'] as LogLevel[],
  exposeInternalErrorDetails: true,
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

function normalizeBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function normalizeLogLevels(value: string | undefined, fallback: LogLevel[]): LogLevel[] {
  const allowedLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'];
  const normalizedLevels = value
    ?.split(',')
    .map(level => level.trim().toLowerCase())
    .filter((level): level is LogLevel => allowedLevels.includes(level as LogLevel));

  return normalizedLevels && normalizedLevels.length > 0 ? normalizedLevels : fallback;
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
    databaseEncryptionKey: normalizeString(
      envSource.DATABASE_ENCRYPTION_KEY,
      SERVER_ENV_DEFAULTS.databaseEncryptionKey,
    ),
    databaseSslEnabled: normalizeBoolean(
      envSource.DATABASE_SSL_ENABLED,
      SERVER_ENV_DEFAULTS.databaseSslEnabled,
    ),
    backupCron: normalizeString(
      envSource.BACKUP_CRON,
      SERVER_ENV_DEFAULTS.backupCron,
    ),
    backupDir: normalizeString(
      envSource.BACKUP_DIR,
      SERVER_ENV_DEFAULTS.backupDir,
    ),
    backupRetentionDays: normalizeNumber(
      envSource.BACKUP_RETENTION_DAYS,
      SERVER_ENV_DEFAULTS.backupRetentionDays,
    ),
    throttleTtlMs: normalizeNumber(
      envSource.THROTTLE_TTL_MS,
      SERVER_ENV_DEFAULTS.throttleTtlMs,
    ),
    throttleLimit: normalizeNumber(
      envSource.THROTTLE_LIMIT,
      SERVER_ENV_DEFAULTS.throttleLimit,
    ),
    aiProxyBaseUrl: normalizeString(
      envSource.AI_PROXY_BASE_URL,
      SERVER_ENV_DEFAULTS.aiProxyBaseUrl,
    ),
    aiProxyApiKey: normalizeString(
      envSource.AI_PROXY_API_KEY,
      SERVER_ENV_DEFAULTS.aiProxyApiKey,
    ),
    aiProxyModel: normalizeString(
      envSource.AI_PROXY_MODEL,
      SERVER_ENV_DEFAULTS.aiProxyModel,
    ),
    aiDailyQuota: normalizeNumber(
      envSource.AI_DAILY_QUOTA,
      SERVER_ENV_DEFAULTS.aiDailyQuota,
    ),
    aiCacheTtlMs: normalizeNumber(
      envSource.AI_CACHE_TTL_MS,
      SERVER_ENV_DEFAULTS.aiCacheTtlMs,
    ),
    weatherCacheTtlMs: normalizeNumber(
      envSource.WEATHER_CACHE_TTL_MS,
      SERVER_ENV_DEFAULTS.weatherCacheTtlMs,
    ),
    imageCacheTtlMs: normalizeNumber(
      envSource.IMAGE_CACHE_TTL_MS,
      SERVER_ENV_DEFAULTS.imageCacheTtlMs,
    ),
    requestLogRetentionDays: normalizeNumber(
      envSource.REQUEST_LOG_RETENTION_DAYS,
      SERVER_ENV_DEFAULTS.requestLogRetentionDays,
    ),
    adminUsername: normalizeString(
      envSource.ADMIN_USERNAME,
      SERVER_ENV_DEFAULTS.adminUsername,
    ),
    adminPassword: normalizeString(
      envSource.ADMIN_PASSWORD,
      SERVER_ENV_DEFAULTS.adminPassword,
    ),
    adminSessionSecret: normalizeString(
      envSource.ADMIN_SESSION_SECRET,
      SERVER_ENV_DEFAULTS.adminSessionSecret,
    ),
    adminSessionTtlMs: normalizeNumber(
      envSource.ADMIN_SESSION_TTL_MS,
      SERVER_ENV_DEFAULTS.adminSessionTtlMs,
    ),
    h5LoginPhone: normalizeString(
      envSource.H5_LOGIN_PHONE,
      SERVER_ENV_DEFAULTS.h5LoginPhone,
    ),
    h5LoginCode: normalizeString(
      envSource.H5_LOGIN_CODE,
      SERVER_ENV_DEFAULTS.h5LoginCode,
    ),
    h5LoginNickname: normalizeString(
      envSource.H5_LOGIN_NICKNAME,
      SERVER_ENV_DEFAULTS.h5LoginNickname,
    ),
    appLogLevels: normalizeLogLevels(
      envSource.APP_LOG_LEVELS,
      normalizeServerMode(process.env.NODE_ENV) === 'production'
        ? ['warn', 'error']
        : SERVER_ENV_DEFAULTS.appLogLevels,
    ),
    exposeInternalErrorDetails: normalizeBoolean(
      envSource.EXPOSE_INTERNAL_ERROR_DETAILS,
      normalizeServerMode(process.env.NODE_ENV) !== 'production',
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
    DATABASE_ENCRYPTION_KEY: parsedEnv.databaseEncryptionKey,
    DATABASE_SSL_ENABLED: String(parsedEnv.databaseSslEnabled),
    BACKUP_CRON: parsedEnv.backupCron,
    BACKUP_DIR: parsedEnv.backupDir,
    BACKUP_RETENTION_DAYS: String(parsedEnv.backupRetentionDays),
    THROTTLE_TTL_MS: String(parsedEnv.throttleTtlMs),
    THROTTLE_LIMIT: String(parsedEnv.throttleLimit),
    AI_PROXY_BASE_URL: parsedEnv.aiProxyBaseUrl,
    AI_PROXY_API_KEY: parsedEnv.aiProxyApiKey,
    AI_PROXY_MODEL: parsedEnv.aiProxyModel,
    AI_DAILY_QUOTA: String(parsedEnv.aiDailyQuota),
    AI_CACHE_TTL_MS: String(parsedEnv.aiCacheTtlMs),
    WEATHER_CACHE_TTL_MS: String(parsedEnv.weatherCacheTtlMs),
    IMAGE_CACHE_TTL_MS: String(parsedEnv.imageCacheTtlMs),
    REQUEST_LOG_RETENTION_DAYS: String(parsedEnv.requestLogRetentionDays),
    ADMIN_USERNAME: parsedEnv.adminUsername,
    ADMIN_PASSWORD: parsedEnv.adminPassword,
    ADMIN_SESSION_SECRET: parsedEnv.adminSessionSecret,
    ADMIN_SESSION_TTL_MS: String(parsedEnv.adminSessionTtlMs),
    H5_LOGIN_PHONE: parsedEnv.h5LoginPhone,
    H5_LOGIN_CODE: parsedEnv.h5LoginCode,
    H5_LOGIN_NICKNAME: parsedEnv.h5LoginNickname,
    APP_LOG_LEVELS: parsedEnv.appLogLevels.join(','),
    EXPOSE_INTERNAL_ERROR_DETAILS: String(parsedEnv.exposeInternalErrorDetails),
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
