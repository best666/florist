import CryptoJS from 'crypto-js'
import type { Nullable, StoragePayload } from '@/interfaces'
import { getStorageAesKey, getStorageNamespace } from './env'

export interface PersistStorageOptions {
  expiresInMs?: number
  namespace?: string
}

function resolveNamespace(namespace?: string): string {
  return namespace ?? getStorageNamespace()
}

function resolveStorageKey(key: string, namespace?: string): string {
  return `${resolveNamespace(namespace)}:${key}`
}

function createSecretKey() {
  return CryptoJS.enc.Utf8.parse(getStorageAesKey().padEnd(32, '0').slice(0, 32))
}

function createSecretIv() {
  return CryptoJS.enc.Utf8.parse(getStorageAesKey().padEnd(16, '0').slice(0, 16))
}

function encrypt(raw: string): string {
  return CryptoJS.AES.encrypt(raw, createSecretKey(), {
    iv: createSecretIv(),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()
}

function decrypt(cipherText: string): string {
  return CryptoJS.AES.decrypt(cipherText, createSecretKey(), {
    iv: createSecretIv(),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8)
}

function createPayload<TValue>(
  value: TValue,
  options?: PersistStorageOptions,
): StoragePayload<TValue> {
  return {
    value,
    expiredAt: options?.expiresInMs ? Date.now() + options.expiresInMs : null,
  }
}

export function setEncryptedStorage<TValue>(
  key: string,
  value: TValue,
  options?: PersistStorageOptions,
): void {
  const storageKey = resolveStorageKey(key, options?.namespace)
  const payload = createPayload(value, options)
  uni.setStorageSync(storageKey, encrypt(JSON.stringify(payload)))
}

export function getEncryptedStorage<TValue>(
  key: string,
  options?: PersistStorageOptions,
): Nullable<TValue> {
  const storageKey = resolveStorageKey(key, options?.namespace)
  const rawValue = uni.getStorageSync(storageKey)

  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return null
  }

  try {
    const parsedPayload = JSON.parse(decrypt(rawValue)) as StoragePayload<TValue>

    if (parsedPayload.expiredAt && parsedPayload.expiredAt <= Date.now()) {
      uni.removeStorageSync(storageKey)
      return null
    }

    return parsedPayload.value
  }
  catch {
    uni.removeStorageSync(storageKey)
    return null
  }
}

export function removeEncryptedStorage(
  key: string,
  options?: PersistStorageOptions,
): void {
  uni.removeStorageSync(resolveStorageKey(key, options?.namespace))
}

export function clearEncryptedStorage(namespace?: string): void {
  const targetNamespace = resolveNamespace(namespace)
  const storageInfo = uni.getStorageInfoSync()

  storageInfo.keys
    .filter(key => key.startsWith(`${targetNamespace}:`))
    .forEach(key => {
      uni.removeStorageSync(key)
    })
}

export const encryptedPersistStorage = {
  getItem(key: string): string | null {
    return getEncryptedStorage<string>(key, { namespace: 'pinia' })
  },
  setItem(key: string, value: string): void {
    setEncryptedStorage(key, value, { namespace: 'pinia' })
  },
  removeItem(key: string): void {
    removeEncryptedStorage(key, { namespace: 'pinia' })
  },
}
