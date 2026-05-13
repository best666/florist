import type { App } from 'vue'
import AppSectionCard from './AppSectionCard.vue'
import ConfirmPopup from './ConfirmPopup.vue'
import EmptyEmpty from './EmptyEmpty.vue'
import FlowerCard from './FlowerCard.vue'
import FlowerFormPopup from './FlowerFormPopup.vue'
import HomeWeatherReminderPanel from './HomeWeatherReminderPanel.vue'
import RecordCheckinPopup from './RecordCheckinPopup.vue'
import SingleFlowerAiAdvicePanel from './SingleFlowerAiAdvicePanel.vue'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'
import TimeLine from './TimeLine.vue'

const globalComponents = {
  AppSectionCard,
  ConfirmPopup,
  EmptyEmpty,
  FlowerCard,
  FlowerFormPopup,
  HomeWeatherReminderPanel,
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
  AppSectionCard,
  ConfirmPopup,
  EmptyEmpty,
  FlowerCard,
  FlowerFormPopup,
  HomeWeatherReminderPanel,
  RecordCheckinPopup,
  SingleFlowerAiAdvicePanel,
  SubmitBtn,
  TagLabel,
  TimeLine,
}
