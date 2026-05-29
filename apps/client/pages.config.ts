import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  globalStyle: {
    navigationBarTitleText: '植愈日记',
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
