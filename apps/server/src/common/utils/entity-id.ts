import { randomBytes } from 'node:crypto';

export function createEntityId(prefix: string): string {
  const random = randomBytes(4).toString('base64url').slice(0, 6);
  return `${prefix}-${Date.now()}-${random}`;
}
