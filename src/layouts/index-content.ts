import type { ContentLayout, ContentLayoutId } from "./types"
import { NarrowColumnContent } from "./content-narrow-column"
import { TwoColumnContent } from "./content-two-column"
import { RailNumberedContent } from "./content-rail-numbered"
import { StackedPosterContent } from "./content-stacked-poster"
import { ToneAdaptiveContent } from "./content-tone-adaptive-content"
import { BentoPanelContent } from "./content-bento-panel"
import { AsymmetricTriptychContent } from "./content-asymmetric-triptych"
import { QuietFrameContent } from "./content-quiet-frame"
import { SplitBandContent } from "./content-split-band"
import { QuoteStageContent } from "./content-quote-stage"
import { StatementContent } from "./content-statement"
import { PullQuoteContent } from "./content-pull-quote"
import { StatHeroContent } from "./content-stat-hero"
import { OneEvidenceContent } from "./content-one-evidence"
import { GaugeStatsContent } from "./content-gauge-stats"
import { GaugePointContent } from "./content-gauge-point"
import { GaugeSheetContent } from "./content-gauge-sheet"
import { GaugeExhibitContent } from "./content-gauge-exhibit"
import { GaugeFigureContent } from "./content-gauge-figure"
import { NoticeSheetContent } from "./content-notice-sheet"
import { GridSheetContent } from "./content-grid-sheet"
import { GridStatementContent } from "./content-grid-statement"
import { GridFigureContent } from "./content-grid-figure"
import { PanelSheetContent } from "./content-panel-sheet"
import { PanelFigureContent } from "./content-panel-figure"
import { SealSheetContent } from "./content-seal-sheet"
import { ConsoleSheetContent } from "./content-console-sheet"
import { MemoSheetContent } from "./content-memo-sheet"
import { DossierSheetContent } from "./content-dossier-sheet"
import { YearbookSheetContent } from "./content-yearbook-sheet"
import { LessonSheetContent } from "./content-lesson-sheet"
import { PitchSheetContent } from "./content-pitch-sheet"
import { PitchPhotoContent } from "./content-pitch-photo"
import { MarqueeSheetContent } from "./content-marquee-sheet"
import { MarqueeStatementContent } from "./content-marquee-statement"
import { BinderSheetContent } from "./content-binder-sheet"
import { ManuscriptSheetContent } from "./content-manuscript-sheet"
import { PeriodicalSheetContent } from "./content-periodical-sheet"
import { PeriodicalQuoteContent } from "./content-periodical-quote"
import { ScrollSheetContent } from "./content-scroll-sheet"
import { ScrollQuoteContent } from "./content-scroll-quote"
import { CrayonboxSheetContent } from "./content-crayonbox-sheet"
import { SealFigureContent } from "./content-seal-figure"
import { CrayonboxCardsContent } from "./content-crayonbox-cards"
import { CrayonboxPointContent } from "./content-crayonbox-point"
import { ShowGalleryContent } from "./content-show-gallery"
import { ShowSpotlightContent } from "./content-show-spotlight"
import { ShowStatementContent } from "./content-show-statement"
import { ShowFiguresContent } from "./content-show-figures"

export type { ContentLayout, ContentLayoutId } from "./types"

// Wave 3 content 页型注册表：六主题四页型的 content 段已全部到位（terminal 的
// bento-panel 是最后一个，见 Wave 3 Task 22）——收紧回完整 Record，不再是
// Partial 过渡态（沿用 chapter 页型在 Wave 2 收尾任务的同一模式）。
// P1 variety wave, task 4：content 池 7 -> 10，新增三个（顺序与
// `LAYOUT_REGISTRY`/`CONTENT_LAYOUT_DEFS` 的声明顺序一致，见 registry.ts）。
// Content-layout expansion wave, task T2：新增 split-band。
// quote-stage / editorial-verse / speech-layouts waves：pinOnly members
// (quote-stage, statement, pull-quote, stat-hero, one-evidence). mono-bleed
// left with playbill in 2026-10.
// Gallery r2 D10 retired image-lead-split. side-highlight retired next.
// This change retires banner-heading. Auto-selectable content pool is 9.
// brief, crayon, and runway families bring the pin-only count to 14,
// for 23 registered content layouts in total. The brief sample redesign
// adds gauge-sheet, gauge-exhibit and gauge-figure: 17 pin-only, 26 in all.
// The bulletin sample redesign adds notice-sheet: 18 pin-only, 27 in all.
// The swiss sample redesign adds grid-sheet, grid-statement and grid-figure:
// 21 pin-only, 30 in all. The ledger sample redesign adds panel-sheet and
// panel-figure: 23 pin-only, 32 in all. The vermilion sample redesign adds
// seal-sheet and seal-figure: 25 pin-only, 34 in all. The terminal sample
// redesign adds console-sheet: 26 pin-only, 35 in all. The memo sample
// redesign adds memo-sheet: 27 pin-only, 36 in all. The clinic sample
// redesign adds dossier-sheet: 28 pin-only, 37 in all. The almanac sample
// redesign adds yearbook-sheet: 29 pin-only, 38 in all. The homeroom sample
// redesign adds lesson-sheet: 30 pin-only, 39 in all. The ember sample
// redesign adds pitch-sheet and pitch-photo: 32 pin-only, 41 in all. The
// rally sample redesign adds marquee-sheet and marquee-statement: 34
// pin-only, 43 in all. The proposal theme adds binder-sheet: 35 pin-only, 44
// in all. The thesis sample redesign adds manuscript-sheet: 36 pin-only, 45
// in all. The journal sample redesign adds periodical-sheet and
// periodical-quote: 38 pin-only, 47 in all. The ink sample redesign adds
// scroll-sheet and scroll-quote: 40 pin-only, 49 in all. The crayon sample
// redesign adds crayonbox-sheet: 49 in all after the three retired themes.
export const CONTENT_LAYOUTS: Record<ContentLayoutId, ContentLayout> = {
  "narrow-column": NarrowColumnContent,
  "two-column": TwoColumnContent,
  "rail-numbered": RailNumberedContent,
  "stacked-poster": StackedPosterContent,
  "bento-panel": BentoPanelContent,
  "tone-adaptive-content": ToneAdaptiveContent,
  "asymmetric-triptych": AsymmetricTriptychContent,
  "quiet-frame": QuietFrameContent,
  "split-band": SplitBandContent,
  "quote-stage": QuoteStageContent,
  statement: StatementContent,
  "pull-quote": PullQuoteContent,
  "stat-hero": StatHeroContent,
  "one-evidence": OneEvidenceContent,
  "gauge-stats": GaugeStatsContent,
  "gauge-point": GaugePointContent,
  "crayonbox-cards": CrayonboxCardsContent,
  "crayonbox-point": CrayonboxPointContent,
  "show-gallery": ShowGalleryContent,
  "show-spotlight": ShowSpotlightContent,
  "show-statement": ShowStatementContent,
  "show-figures": ShowFiguresContent,
  "gauge-sheet": GaugeSheetContent,
  "gauge-exhibit": GaugeExhibitContent,
  "gauge-figure": GaugeFigureContent,
  "notice-sheet": NoticeSheetContent,
  "grid-sheet": GridSheetContent,
  "grid-statement": GridStatementContent,
  "grid-figure": GridFigureContent,
  "panel-sheet": PanelSheetContent,
  "panel-figure": PanelFigureContent,
  "seal-sheet": SealSheetContent,
  "seal-figure": SealFigureContent,
  "console-sheet": ConsoleSheetContent,
  "memo-sheet": MemoSheetContent,
  "dossier-sheet": DossierSheetContent,
  "yearbook-sheet": YearbookSheetContent,
  "lesson-sheet": LessonSheetContent,
  "pitch-sheet": PitchSheetContent,
  "pitch-photo": PitchPhotoContent,
  "marquee-sheet": MarqueeSheetContent,
  "marquee-statement": MarqueeStatementContent,
  "binder-sheet": BinderSheetContent,
  "manuscript-sheet": ManuscriptSheetContent,
  "periodical-sheet": PeriodicalSheetContent,
  "periodical-quote": PeriodicalQuoteContent,
  "scroll-sheet": ScrollSheetContent,
  "scroll-quote": ScrollQuoteContent,
  "crayonbox-sheet": CrayonboxSheetContent,
}
