import type { IUserAuthSession } from '@florist/contracts'
import { getEncryptedStorage, removeEncryptedStorage, setEncryptedStorage } from './storage'

const AUTH_SESSION_STORAGE_KEY = 'auth:session'

export function readAuthSessionFromStorage(): IUserAuthSession | null {
  return getEncryptedStorage<IUserAuthSession>(AUTH_SESSION_STORAGE_KEY)
}

export function readAuthUserIdFromStorage(): string | null {
  return readAuthSessionFromStorage()?.sessionUserId ?? null
}

export function writeAuthSessionToStorage(session: IUserAuthSession): void {
  setEncryptedStorage(AUTH_SESSION_STORAGE_KEY, session)
}

export function clearAuthSessionFromStorage(): void {
  removeEncryptedStorage(AUTH_SESSION_STORAGE_KEY)
}
