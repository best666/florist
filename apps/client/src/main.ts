import { createSSRApp } from 'vue'
import App from './App.vue'
import store from './store'
import { initializeRequestClient } from './utils/request'
import 'virtual:uno.css'

export function createApp() {
  initializeRequestClient()

  const app = createSSRApp(App)
  app.use(store)

  return {
    app,
  }
}
