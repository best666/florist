import type { Nullable } from '@/interfaces'
import {
  getEncryptedStorage,
  removeEncryptedStorage,
  setEncryptedStorage,
} from '@/utils/storage'

export function useEncryptedStorage<TValue>(key: string) {
  function getValue(): Nullable<TValue> {
    return getEncryptedStorage<TValue>(key)
  }

  function setValue(value: TValue, expiresInMs?: number): void {
    if (expiresInMs === undefined) {
      setEncryptedStorage<TValue>(key, value)
      return
    }

    setEncryptedStorage<TValue>(key, value, { expiresInMs })
  }

  function removeValue(): void {
    removeEncryptedStorage(key)
  }

  return {
    getValue,
    setValue,
    removeValue,
  }
}
