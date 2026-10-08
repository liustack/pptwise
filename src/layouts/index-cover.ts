import type { CoverLayout, CoverLayoutId } from "./types"
import { BannerTitleCover } from "./cover-banner-title"
import { PosterCenterCover } from "./cover-poster-center"
import { SplitDiagonalCover } from "./cover-split-diagonal"
import { LeftAnchorCover } from "./cover-left-anchor"
import { ConstellationCover } from "./cover-constellation"
import { EditorialMastheadCover } from "./cover-editorial-masthead"
import { ToneAdaptiveHeaderCover } from "./cover-tone-adaptive-header"
import { FashionMastheadCover } from "./cover-fashion-masthead"
import { ColophonCover } from "./cover-colophon"
import { InstitutionalBlockCover } from "./cover-institutional-block"
import { MemoHeadCover } from "./cover-memo-head"
import { BoardHeadCover } from "./cover-board-head"
import { VerdictIndexCover } from "./cover-verdict-index"
import { BandTitleCover } from "./cover-band-title"
import { HeaderBandCover } from "./cover-header-band"
import { PaperMastheadCover } from "./cover-paper-masthead"
import { HorizonWedgeCover } from "./cover-horizon-wedge"
import { CornerWedgeCover } from "./cover-corner-wedge"
import { IkbFieldCover } from "./cover-ikb-field-cover"
import { StatCover } from "./cover-stat-cover"
import { TypeRuleCover } from "./cover-type-rule-cover"
import { ThesisPlateCover } from "./cover-thesis-plate-cover"
import { ChalkBandCover } from "./cover-chalk-band-cover"
import { CapsuleOpenCover } from "./cover-capsule-open-cover"
import { IssueHeadCover } from "./cover-issue-head-cover"
import { VerticalTitleCover } from "./cover-vertical-title-cover"
import { InvitationPlateCover } from "./cover-invitation-plate-cover"
import { LookbookOpenCover } from "./cover-lookbook-open-cover"
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
import { PledgeOpenCover } from "./cover-pledge-open-cover"
import { ReportOpenCover } from "./cover-report-open-cover"
import { GaugeVerdictCover } from "./cover-gauge-verdict"
import { CrayonboxOpenCover } from "./cover-crayonbox-open"
import { ShowHeadlineCover } from "./cover-show-headline"

export type { CoverLayout, CoverLayoutId } from "./types"

// Wave 1 收尾：六个 CoverLayoutId 字面量全覆盖，收紧回完整 Record（P1
// Task4→5 起过渡态到此结束，不再是 Partial）。
export const COVER_LAYOUTS: Record<CoverLayoutId, CoverLayout> = {
  "banner-title": BannerTitleCover,
  "poster-center": PosterCenterCover,
  "left-anchor": LeftAnchorCover,
  constellation: ConstellationCover,
  "editorial-masthead": EditorialMastheadCover,
  "tone-adaptive-header": ToneAdaptiveHeaderCover,
  "fashion-masthead": FashionMastheadCover,
  "split-diagonal": SplitDiagonalCover,
  colophon: ColophonCover,
  "institutional-block": InstitutionalBlockCover,
  "memo-head": MemoHeadCover,
  "board-head": BoardHeadCover,
  "verdict-index": VerdictIndexCover,
  "band-title": BandTitleCover,
  "header-band": HeaderBandCover,
  "paper-masthead": PaperMastheadCover,
  "horizon-wedge": HorizonWedgeCover,
  "corner-wedge": CornerWedgeCover,
  "ikb-field-cover": IkbFieldCover,
  "stat-cover": StatCover,
  "type-rule-cover": TypeRuleCover,
  "thesis-plate-cover": ThesisPlateCover,
  "chalk-band-cover": ChalkBandCover,
  "capsule-open-cover": CapsuleOpenCover,
  "issue-head-cover": IssueHeadCover,
  "vertical-title-cover": VerticalTitleCover,
  "invitation-plate-cover": InvitationPlateCover,
  "lookbook-open-cover": LookbookOpenCover,
  "red-head-cover": RedHeadCover,
  "pledge-open-cover": PledgeOpenCover,
  "report-open-cover": ReportOpenCover,
  "gauge-verdict": GaugeVerdictCover,
  "crayonbox-open": CrayonboxOpenCover,
  "show-headline": ShowHeadlineCover,
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
}
