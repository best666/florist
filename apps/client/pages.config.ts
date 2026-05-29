import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  globalStyle: {
    navigationBarTitleText: '养花人',
    navigationBarTextStyle: 'black',
    styleIsolation: 'apply-shared',
  },
  easycom: {
    autoscan: true,
    custom: {
      '^app-(.*)': '@/components/App$1.vue',
    },
  },
})
