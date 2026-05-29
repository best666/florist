import type { App } from 'vue'
import ActionHintButton from './ActionHintButton.vue'
import AppBottomNav from './AppBottomNav.vue'
import AppImage from './AppImage.vue'
import CollapsibleSection from './CollapsibleSection.vue'
import ConfirmPopup from './ConfirmPopup.vue'
import EmptyEmpty from './EmptyEmpty.vue'
import FlowerCard from './FlowerCard.vue'
import FlowerFormPopup from './FlowerFormPopup.vue'
import HomeWeatherReminderPanel from './HomeWeatherReminderPanel.vue'
import HomeQuickDrawer from './HomeQuickDrawer.vue'
import MineAboutLinks from './MineAboutLinks.vue'
import MineBackupPanel from './MineBackupPanel.vue'
import MineExtensionPanel from './MineExtensionPanel.vue'
import MinePermissionsPanel from './MinePermissionsPanel.vue'
import MineRecycleBinPanel from './MineRecycleBinPanel.vue'
import MineThemeSelector from './MineThemeSelector.vue'
import RecordCheckinPopup from './RecordCheckinPopup.vue'
import SingleFlowerAiAdvicePanel from './SingleFlowerAiAdvicePanel.vue'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'
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
