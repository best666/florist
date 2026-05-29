import { createSSRApp } from 'vue'
import App from './App.vue'
import { registerGlobalComponents } from './components'
import store from './store'
import { initializeRequestClient } from './utils/request'
import './styles/global.css'

/* ---- PWA Service Worker 注册（仅 H5） ---- */
// #ifdef H5
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 静默失败，不阻塞应用启动
    })
  })
}
// #endif

export function createApp() {
  initializeRequestClient()

  const app = createSSRApp(App)
  app.use(store)
  registerGlobalComponents(app)

  return {
    app,
  }
}
