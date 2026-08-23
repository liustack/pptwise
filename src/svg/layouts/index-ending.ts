import type { EndingLayout, EndingLayoutId } from "./types"
import { MastheadEnding } from "./ending-masthead-ending"
import { ConstellationEnding } from "./ending-constellation-ending"
import { RailEnding } from "./ending-rail-ending"
import { BannerEnding } from "./ending-banner-ending"
import { PosterEnding } from "./ending-poster-ending"
import { ToneAdaptiveEnding } from "./ending-tone-adaptive-ending"
import { FashionEnding } from "./ending-fashion-ending"
import { ActionPadEnding } from "./ending-action-pad-ending"
import { SignoffEnding } from "./ending-signoff-ending"
import { CloseWordEnding } from "./ending-close-word-ending"
import { AskEnding } from "./ending-ask-ending"
import { RuleCloseEnding } from "./ending-rule-close-ending"
import { PillCtaEnding } from "./ending-pill-cta-ending"
import { DefenseCloseEnding } from "./ending-defense-close-ending"
import { HomeworkCloseEnding } from "./ending-homework-close-ending"
import { ReminderListEnding } from "./ending-reminder-list-ending"
import { AfterwordEnding } from "./ending-afterword-ending"
import { InviteFieldEnding } from "./ending-invite-field-ending"
import { SealCloseEnding } from "./ending-seal-close-ending"
import { GiltWordEnding } from "./ending-gilt-word-ending"
import { WindowCloseEnding } from "./ending-window-close-ending"
import { DeliberationEnding } from "./ending-deliberation-ending"
import { ScorecardEnding } from "./ending-scorecard-ending"
import { CarePlanEnding } from "./ending-care-plan-ending"
import { SeatCtaEnding } from "./ending-seat-cta-ending"

export type { EndingLayout, EndingLayoutId } from "./types"

// Wave 2 ending 段收尾（w2t16）：六个 EndingLayoutId 全部注册完毕，收紧
// 回完整 Record（不再是 Partial）——同 index-chapter.ts 末任务的过渡收尾。
export const ENDING_LAYOUTS: Record<EndingLayoutId, EndingLayout> = {
  "masthead-ending": MastheadEnding,
  "constellation-ending": ConstellationEnding,
  "rail-ending": RailEnding,
  "banner-ending": BannerEnding,
  "poster-ending": PosterEnding,
  "tone-adaptive-ending": ToneAdaptiveEnding,
  "fashion-ending": FashionEnding,
  "action-pad-ending": ActionPadEnding,
  "signoff-ending": SignoffEnding,
  "close-word-ending": CloseWordEnding,
  "ask-ending": AskEnding,
  "rule-close-ending": RuleCloseEnding,
  "pill-cta-ending": PillCtaEnding,
  "defense-close-ending": DefenseCloseEnding,
  "homework-close-ending": HomeworkCloseEnding,
  "reminder-list-ending": ReminderListEnding,
  "afterword-ending": AfterwordEnding,
  "invite-field-ending": InviteFieldEnding,
  "seal-close-ending": SealCloseEnding,
  "gilt-word-ending": GiltWordEnding,
  "window-close-ending": WindowCloseEnding,
  "deliberation-ending": DeliberationEnding,
  "scorecard-ending": ScorecardEnding,
  "care-plan-ending": CarePlanEnding,
  "seat-cta-ending": SeatCtaEnding,
}
