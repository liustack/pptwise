import type { EndingLayout, EndingLayoutId } from "./types"
import { SignoffEnding } from "./ending-signoff-ending"
import { CloseWordEnding } from "./ending-close-word-ending"
import { DeliberationEnding } from "./ending-deliberation-ending"
import { ConsoleEnding } from "./ending-console-ending"
import { MemoEnding } from "./ending-memo-ending"
import { DossierEnding } from "./ending-dossier-ending"
import { YearbookEnding } from "./ending-yearbook-ending"
import { LessonEnding } from "./ending-lesson-ending"
import { PitchEnding } from "./ending-pitch-ending"
import { MarqueeEnding } from "./ending-marquee-ending"
import { BinderEnding } from "./ending-binder-ending"
import { ManuscriptEnding } from "./ending-manuscript-ending"
import { PeriodicalEnding } from "./ending-periodical-ending"
import { ScrollEnding } from "./ending-scroll-ending"
import { CrayonboxEnding } from "./ending-crayonbox-ending"
import { InvitationEnding } from "./ending-invitation-ending"
import { LineupEnding } from "./ending-lineup-ending"
import { PlacardEnding } from "./ending-placard-ending"
import { KeynoteEnding } from "./ending-keynote-ending"
import { ChalkboardEnding } from "./ending-chalkboard-ending"
import { PortraitEnding } from "./ending-portrait-ending"
import { AccountEnding } from "./ending-account-ending"
import { ResolutionEnding } from "./ending-resolution-ending"
import { GaugeNextEnding } from "./ending-gauge-next"

export type { EndingLayout, EndingLayoutId } from "./types"

// Wave 2 ending 段收尾（w2t16）：六个 EndingLayoutId 全部注册完毕，收紧
// 回完整 Record（不再是 Partial）——同 index-chapter.ts 末任务的过渡收尾。
export const ENDING_LAYOUTS: Record<EndingLayoutId, EndingLayout> = {
  "signoff-ending": SignoffEnding,
  "close-word-ending": CloseWordEnding,
  "deliberation-ending": DeliberationEnding,
  "resolution-ending": ResolutionEnding,
  "gauge-next": GaugeNextEnding,
  "console-ending": ConsoleEnding,
  "memo-ending": MemoEnding,
  "dossier-ending": DossierEnding,
  "yearbook-ending": YearbookEnding,
  "lesson-ending": LessonEnding,
  "pitch-ending": PitchEnding,
  "marquee-ending": MarqueeEnding,
  "binder-ending": BinderEnding,
  "manuscript-ending": ManuscriptEnding,
  "periodical-ending": PeriodicalEnding,
  "scroll-ending": ScrollEnding,
  "crayonbox-ending": CrayonboxEnding,
  "invitation-ending": InvitationEnding,
  "lineup-ending": LineupEnding,
  "placard-ending": PlacardEnding,
  "keynote-ending": KeynoteEnding,
  "chalkboard-ending": ChalkboardEnding,
  "portrait-ending": PortraitEnding,
  "account-ending": AccountEnding,
}
