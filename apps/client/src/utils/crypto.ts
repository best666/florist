import CryptoJS from 'crypto-js'
import type { Nullable } from '@/interfaces'

export interface AesCipherOptions {
  /**
   * 加密密钥，内部会自动补齐到 AES 需要的长度。
   */
  readonly secretKey: string
  /**
   * 可选向量，不传时默认根据密钥派生。
   */
  readonly iv?: string
}

export interface MaskStringOptions {
  /**
   * 保留开头字符数。
   */
  readonly prefixLength?: number
  /**
   * 保留结尾字符数。
   */
  readonly suffixLength?: number
  /**
   * 掩码字符。
   */
  readonly maskChar?: string
}

const AES_KEY_LENGTH = 32
const AES_IV_LENGTH = 16

function normalizeSecret(value: string, targetLength: number): string {
  return value.padEnd(targetLength, '0').slice(0, targetLength)
}

function createAesKey(secretKey: string): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Utf8.parse(normalizeSecret(secretKey, AES_KEY_LENGTH))
}

function createAesIv(secretKey: string, iv?: string): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Utf8.parse(
    normalizeSecret(iv ?? secretKey, AES_IV_LENGTH),
  )
}

export function encryptTextByAes(
  plainText: string,
  options: AesCipherOptions,
): Nullable<string> {
  try {
    return CryptoJS.AES.encrypt(plainText, createAesKey(options.secretKey), {
      iv: createAesIv(options.secretKey, options.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString()
  }
  catch {
    return null
  }
}

export function decryptTextByAes(
  cipherText: string,
  options: AesCipherOptions,
): Nullable<string> {
  try {
    return CryptoJS.AES.decrypt(cipherText, createAesKey(options.secretKey), {
      iv: createAesIv(options.secretKey, options.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8)
  }
  catch {
    return null
  }
}

export function maskString(
  rawValue: string,
  options?: MaskStringOptions,
): string {
  const normalizedValue = rawValue.trim()

  if (normalizedValue.length === 0) {
    return ''
  }

  const prefixLength = options?.prefixLength ?? 1
  const suffixLength = options?.suffixLength ?? 1
  const maskChar = options?.maskChar ?? '*'

  if (normalizedValue.length <= prefixLength + suffixLength) {
    return maskChar.repeat(normalizedValue.length)
  }

  return [
    normalizedValue.slice(0, prefixLength),
    maskChar.repeat(normalizedValue.length - prefixLength - suffixLength),
    normalizedValue.slice(-suffixLength),
  ].join('')
}

export function maskPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\s+/g, '')

  if (!/^\d{11}$/.test(digits)) {
    return maskString(digits, {
      prefixLength: 2,
      suffixLength: 2,
    })
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`
}

export function maskName(name: string): string {
  const normalizedName = name.trim()

  if (normalizedName.length <= 1) {
    return normalizedName
  }

  return maskString(normalizedName, {
    prefixLength: 1,
    suffixLength: 0,
  })
}
