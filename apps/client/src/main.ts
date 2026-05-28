import { createSSRApp } from 'vue'
import App from './App.vue'
import { registerGlobalComponents } from './components'
import store from './store'
import { initializeRequestClient } from './utils/request'
import './styles/global.css'

export function createApp() {
  initializeRequestClient()

  const app = createSSRApp(App)
  app.use(store)
  registerGlobalComponents(app)

  return {
    app,
  }
}
