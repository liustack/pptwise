import type { ChapterLayout, ChapterLayoutId } from "./types"
import { MastheadChapter } from "./chapter-masthead-chapter"
import { ConstellationChapter } from "./chapter-constellation-chapter"
import { RailChapter } from "./chapter-rail-chapter"
import { BannerChapter } from "./chapter-banner-chapter"
import { PosterChapter } from "./chapter-poster-chapter"
import { RomanChapter } from "./chapter-roman-chapter"
import { ToneAdaptiveChapter } from "./chapter-tone-adaptive-chapter"
import { FashionChapter } from "./chapter-fashion-chapter"
import { VerseChapter } from "./chapter-verse-chapter"
import { GhostRuleChapter } from "./chapter-ghost-rule-chapter"
import { BlockNumeralChapter } from "./chapter-block-numeral-chapter"
import { GhostSectionChapter } from "./chapter-ghost-section-chapter"
import { EmberIndexChapter } from "./chapter-ember-index-chapter"
import { StrokeIndexChapter } from "./chapter-stroke-index-chapter"
import { ActChapter } from "./chapter-act-chapter"
import { FolioGhostChapter } from "./chapter-folio-ghost-chapter"
import { LessonBoxChapter } from "./chapter-lesson-box-chapter"
import { StickerNumeralChapter } from "./chapter-sticker-numeral-chapter"
import { FascicleGhostChapter } from "./chapter-fascicle-ghost-chapter"
import { VolumeSlipChapter } from "./chapter-volume-slip-chapter"
import { GiltOrdinalChapter } from "./chapter-gilt-ordinal-chapter"
import { LookRangeChapter } from "./chapter-look-range-chapter"
import { SealNumeralChapter } from "./chapter-seal-numeral-chapter"
import { ConsoleChapter } from "./chapter-console-chapter"
import { LessonChapter } from "./chapter-lesson-chapter"
import { PitchChapter } from "./chapter-pitch-chapter"
import { MarqueeChapter } from "./chapter-marquee-chapter"
import { BinderChapter } from "./chapter-binder-chapter"
import { ManuscriptChapter } from "./chapter-manuscript-chapter"
import { ScrollChapter } from "./chapter-scroll-chapter"
import { CrayonboxChapter } from "./chapter-crayonbox-chapter"
import { InvitationChapter } from "./chapter-invitation-chapter"
import { LineupChapter } from "./chapter-lineup-chapter"
import { FieldBandChapter } from "./chapter-field-band-chapter"
import { SubjectRuleChapter } from "./chapter-subject-rule-chapter"
import { OneWordChapter } from "./chapter-one-word-chapter"
import { ChalkRuleChapter } from "./chapter-chalk-rule-chapter"
import { DecimalIndexChapter } from "./chapter-decimal-index-chapter"
import { IssueLineChapter } from "./chapter-issue-line-chapter"
import { HallLabelChapter } from "./chapter-hall-label-chapter"
import { GaugeSectionChapter } from "./chapter-gauge-section"
import { CrayonboxStickerChapter } from "./chapter-crayonbox-sticker"
import { ShowPlateChapter } from "./chapter-show-plate"

export type { ChapterLayout, ChapterLayoutId } from "./types"

// Wave 2 chapter 页型注册表：六个 ChapterLayoutId 已全部补齐（本任务收尾
// tone-adaptive-chapter，custom 主题），收紧回完整 Record（沿用 cover 页型
// 在 Wave 1 收尾时的同一模式，见 index.ts）。
export const CHAPTER_LAYOUTS: Record<ChapterLayoutId, ChapterLayout> = {
  "masthead-chapter": MastheadChapter,
  "constellation-chapter": ConstellationChapter,
  "rail-chapter": RailChapter,
  "banner-chapter": BannerChapter,
  "poster-chapter": PosterChapter,
  "roman-chapter": RomanChapter,
  "tone-adaptive-chapter": ToneAdaptiveChapter,
  "fashion-chapter": FashionChapter,
  "verse-chapter": VerseChapter,
  "ghost-rule-chapter": GhostRuleChapter,
  "block-numeral-chapter": BlockNumeralChapter,
  "ghost-section-chapter": GhostSectionChapter,
  "ember-index-chapter": EmberIndexChapter,
  "stroke-index-chapter": StrokeIndexChapter,
  "act-chapter": ActChapter,
  "folio-ghost-chapter": FolioGhostChapter,
  "lesson-box-chapter": LessonBoxChapter,
  "sticker-numeral-chapter": StickerNumeralChapter,
  "fascicle-ghost-chapter": FascicleGhostChapter,
  "volume-slip-chapter": VolumeSlipChapter,
  "gilt-ordinal-chapter": GiltOrdinalChapter,
  "look-range-chapter": LookRangeChapter,
  "seal-numeral-chapter": SealNumeralChapter,
  "field-band-chapter": FieldBandChapter,
  "subject-rule-chapter": SubjectRuleChapter,
  "one-word-chapter": OneWordChapter,
  "chalk-rule-chapter": ChalkRuleChapter,
  "decimal-index-chapter": DecimalIndexChapter,
  "issue-line-chapter": IssueLineChapter,
  "hall-label-chapter": HallLabelChapter,
  "gauge-section": GaugeSectionChapter,
  "crayonbox-sticker": CrayonboxStickerChapter,
  "show-plate": ShowPlateChapter,
  "console-chapter": ConsoleChapter,
  "lesson-chapter": LessonChapter,
  "pitch-chapter": PitchChapter,
  "marquee-chapter": MarqueeChapter,
  "binder-chapter": BinderChapter,
  "manuscript-chapter": ManuscriptChapter,
  "scroll-chapter": ScrollChapter,
  "crayonbox-chapter": CrayonboxChapter,
  "invitation-chapter": InvitationChapter,
  "lineup-chapter": LineupChapter,
}
