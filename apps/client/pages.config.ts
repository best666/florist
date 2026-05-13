import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  globalStyle: {
    navigationBarTitleText: '养花人',
    navigationBarBackgroundColor: '#FAFAFA',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FAFAFA',
  },
  easycom: {
    autoscan: true,
    custom: {
      '^app-(.*)': '@/components/App$1.vue',
    },
  },
})
