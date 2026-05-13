import { registerAs } from '@nestjs/config';
import { resolveServerEnv } from './server-env';

export const appConfig = registerAs('app', () => resolveServerEnv(process.env));
