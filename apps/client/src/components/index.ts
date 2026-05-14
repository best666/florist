import type { App } from 'vue'
import AppImage from './AppImage.vue'
import AppSectionCard from './AppSectionCard.vue'
import ConfirmPopup from './ConfirmPopup.vue'
import EmptyEmpty from './EmptyEmpty.vue'
import FlowerCard from './FlowerCard.vue'
import FlowerFormPopup from './FlowerFormPopup.vue'
import GlobalAdBanner from './GlobalAdBanner.vue'
import HomeWeatherReminderPanel from './HomeWeatherReminderPanel.vue'
import PaymentQrPanel from './PaymentQrPanel.vue'
import RecordCheckinPopup from './RecordCheckinPopup.vue'
import SingleFlowerAiAdvicePanel from './SingleFlowerAiAdvicePanel.vue'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'
import TimeLine from './TimeLine.vue'

const globalComponents = {
  AppImage,
  AppSectionCard,
  ConfirmPopup,
  EmptyEmpty,
  FlowerCard,
  FlowerFormPopup,
  GlobalAdBanner,
  HomeWeatherReminderPanel,
  PaymentQrPanel,
  RecordCheckinPopup,
  SingleFlowerAiAdvicePanel,
  SubmitBtn,
  TagLabel,
  TimeLine,
} as const

export function registerGlobalComponents(app: App): void {
  Object.entries(globalComponents).forEach(([name, component]) => {
    app.component(name, component)
  })
}

export {
  AppImage,
  AppSectionCard,
  ConfirmPopup,
  EmptyEmpty,
  FlowerCard,
  FlowerFormPopup,
  GlobalAdBanner,
  HomeWeatherReminderPanel,
  PaymentQrPanel,
  RecordCheckinPopup,
  SingleFlowerAiAdvicePanel,
  SubmitBtn,
  TagLabel,
  TimeLine,
}
