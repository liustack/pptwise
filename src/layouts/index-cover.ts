import type { CoverLayout, CoverLayoutId } from "./types"
import { InstitutionalBlockCover } from "./cover-institutional-block"
import { IkbFieldCover } from "./cover-ikb-field-cover"
import { StatCover } from "./cover-stat-cover"
import { RedHeadCover } from "./cover-red-head-cover"
import { ConsoleCover } from "./cover-console-cover"
import { MemoCover } from "./cover-memo-cover"
import { DossierCover } from "./cover-dossier-cover"
import { YearbookCover } from "./cover-yearbook-cover"
import { LessonCover } from "./cover-lesson-cover"
import { PitchCover } from "./cover-pitch-cover"
import { MarqueeCover } from "./cover-marquee-cover"
import { BinderCover } from "./cover-binder-cover"
import { ManuscriptCover } from "./cover-manuscript-cover"
import { PeriodicalCover } from "./cover-periodical-cover"
import { ScrollCover } from "./cover-scroll-cover"
import { CrayonboxCover } from "./cover-crayonbox-cover"
import { InvitationCover } from "./cover-invitation-cover"
import { LineupCover } from "./cover-lineup-cover"
import { PlacardCover } from "./cover-placard-cover"
import { KeynoteCover } from "./cover-keynote-cover"
import { ChalkboardCover } from "./cover-chalkboard-cover"
import { PortraitCover } from "./cover-portrait-cover"
import { AccountCover } from "./cover-account-cover"
import { GaugeVerdictCover } from "./cover-gauge-verdict"

export type { CoverLayout, CoverLayoutId } from "./types"

// Wave 1 收尾：六个 CoverLayoutId 字面量全覆盖，收紧回完整 Record（P1
// Task4→5 起过渡态到此结束，不再是 Partial）。
export const COVER_LAYOUTS: Record<CoverLayoutId, CoverLayout> = {
  "institutional-block": InstitutionalBlockCover,
  "ikb-field-cover": IkbFieldCover,
  "stat-cover": StatCover,
  "red-head-cover": RedHeadCover,
  "gauge-verdict": GaugeVerdictCover,
  "console-cover": ConsoleCover,
  "memo-cover": MemoCover,
  "dossier-cover": DossierCover,
  "yearbook-cover": YearbookCover,
  "lesson-cover": LessonCover,
  "pitch-cover": PitchCover,
  "marquee-cover": MarqueeCover,
  "binder-cover": BinderCover,
  "manuscript-cover": ManuscriptCover,
  "periodical-cover": PeriodicalCover,
  "scroll-cover": ScrollCover,
  "crayonbox-cover": CrayonboxCover,
  "invitation-cover": InvitationCover,
  "lineup-cover": LineupCover,
  "placard-cover": PlacardCover,
  "keynote-cover": KeynoteCover,
  "chalkboard-cover": ChalkboardCover,
  "portrait-cover": PortraitCover,
  "account-cover": AccountCover,
}
