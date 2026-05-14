import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  globalStyle: {
    navigationBarTitleText: '养花人',
    navigationBarBackgroundColor: '#FFF8F1',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FFF8F1',
  },
  easycom: {
    autoscan: true,
    custom: {
      '^app-(.*)': '@/components/App$1.vue',
    },
  },
})
