import { createPinia, setActivePinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { encryptedPersistStorage } from '@/utils/storage'

const store = createPinia()

store.use(
  createPersistedState({
    storage: encryptedPersistStorage,
  }),
)

setActivePinia(store)

export default store

export * from './app'
export * from './flowers'
