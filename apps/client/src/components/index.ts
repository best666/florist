import type { App } from 'vue'
import ActionHintButton from './ActionHintButton.vue'
import AppBottomNav from './app/AppBottomNav.vue'
import AppImage from './app/AppImage.vue'
import CollapsibleSection from './app/CollapsibleSection.vue'
import ConfirmPopup from './app/ConfirmPopup.vue'
import EmptyEmpty from './app/EmptyEmpty.vue'
import FlowerCard from './flower/FlowerCard.vue'
import FlowerFormPopup from './flower/FlowerFormPopup.vue'
import HomeWeatherReminderPanel from './HomeWeatherReminderPanel.vue'
import HomeQuickDrawer from './HomeQuickDrawer.vue'
import MineAboutLinks from './mine/MineAboutLinks.vue'
import MineBackupPanel from './mine/MineBackupPanel.vue'
import MineExtensionPanel from './mine/MineExtensionPanel.vue'
import MinePermissionsPanel from './mine/MinePermissionsPanel.vue'
import MineRecycleBinPanel from './mine/MineRecycleBinPanel.vue'
import MineThemeSelector from './mine/MineThemeSelector.vue'
import RecordCheckinPopup from './flower/RecordCheckinPopup.vue'
import SingleFlowerAiAdvicePanel from './flower/SingleFlowerAiAdvicePanel.vue'
import SubmitBtn from './app/SubmitBtn.vue'
import TagLabel from './app/TagLabel.vue'
import TimeLine from './TimeLine.vue'

const globalComponents = {
  ActionHintButton,
  AppBottomNav,
  AppImage,
  CollapsibleSection,
  ConfirmPopup,
  EmptyEmpty,
  FlowerCard,
  FlowerFormPopup,
  HomeWeatherReminderPanel,
  HomeQuickDrawer,
  MineAboutLinks,
  MineBackupPanel,
  MineExtensionPanel,
  MinePermissionsPanel,
  MineRecycleBinPanel,
  MineThemeSelector,
  RecordCheckinPopup,
  SingleFlowerAiAdvicePanel,
  SubmitBtn,
  TagLabel,
  TimeLine,
} as const

export function registerGlobalComponents(app: App): void {
  Object.entries(globalComponents).forEach(([name, component]) => {
    // #ifndef MP-WEIXIN
    // 小程序通过 easycom 自动解析组件，不需要全局注册
    app.component(name, component)
    // #endif
  })
}

export {
  ActionHintButton,
  AppBottomNav,
  AppImage,
  CollapsibleSection,
  ConfirmPopup,
  EmptyEmpty,
  FlowerCard,
  FlowerFormPopup,
  HomeWeatherReminderPanel,
  HomeQuickDrawer,
  MineAboutLinks,
  MineBackupPanel,
  MineExtensionPanel,
  MinePermissionsPanel,
  MineRecycleBinPanel,
  MineThemeSelector,
  RecordCheckinPopup,
  SingleFlowerAiAdvicePanel,
  SubmitBtn,
  TagLabel,
  TimeLine,
}
