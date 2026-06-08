import { Injectable } from '@nestjs/common';

interface CacheEntry<TValue> {
  value: TValue;
  expiresAt: number;
}

@Injectable()
export class RuntimeCacheService {
  private readonly cacheStore = new Map<string, CacheEntry<unknown>>();

  public get<TValue>(key: string): TValue | null {
    const cacheEntry = this.cacheStore.get(key);

    if (!cacheEntry) {
      return null;
    }

    if (cacheEntry.expiresAt <= Date.now()) {
      this.cacheStore.delete(key);
      return null;
    }

    return cacheEntry.value as TValue;
  }

  public set<TValue>(key: string, value: TValue, ttlMs: number): TValue {
    this.cacheStore.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    return value;
  }

  public async remember<TValue>(
    key: string,
    ttlMs: number,
    factory: () => Promise<TValue>,
  ): Promise<{ value: TValue; cacheHit: boolean }> {
    const cachedValue = this.get<TValue>(key);

    if (cachedValue !== null) {
      return { value: cachedValue, cacheHit: true };
    }

    const nextValue = await factory();
    this.set(key, nextValue, ttlMs);

    return { value: nextValue, cacheHit: false };
  }

  public delete(key: string): void {
    this.cacheStore.delete(key);
  }

  public exists(key: string): boolean {
    const cacheEntry = this.cacheStore.get(key);

    if (!cacheEntry) {
      return false;
    }

    if (cacheEntry.expiresAt <= Date.now()) {
      this.cacheStore.delete(key);
      return false;
    }

    return true;
  }

  /** 原子递增计数器，首次调用时设置 TTL。返回递增后的值。 */
  public increment(key: string, ttlMs: number): number {
    const cacheEntry = this.cacheStore.get(key);

    if (!cacheEntry || cacheEntry.expiresAt <= Date.now()) {
      this.cacheStore.set(key, { value: 1, expiresAt: Date.now() + ttlMs });
      return 1;
    }

    const nextValue = (cacheEntry.value as number) + 1;
    this.cacheStore.set(key, { value: nextValue, expiresAt: cacheEntry.expiresAt });
    return nextValue;
  }
}
