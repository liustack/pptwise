import type { ChapterLayout, ChapterLayoutId } from "./types"
import { BlockNumeralChapter } from "./chapter-block-numeral-chapter"
import { GhostSectionChapter } from "./chapter-ghost-section-chapter"
import { FascicleGhostChapter } from "./chapter-fascicle-ghost-chapter"
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
import { PlacardChapter } from "./chapter-placard-chapter"
import { KeynoteChapter } from "./chapter-keynote-chapter"
import { ChalkboardChapter } from "./chapter-chalkboard-chapter"
import { PortraitChapter } from "./chapter-portrait-chapter"
import { AccountChapter } from "./chapter-account-chapter"
import { FieldBandChapter } from "./chapter-field-band-chapter"
import { SubjectRuleChapter } from "./chapter-subject-rule-chapter"
import { DecimalIndexChapter } from "./chapter-decimal-index-chapter"
import { IssueLineChapter } from "./chapter-issue-line-chapter"
import { GaugeSectionChapter } from "./chapter-gauge-section"

export type { ChapterLayout, ChapterLayoutId } from "./types"

// Wave 2 chapter 页型注册表：六个 ChapterLayoutId 已全部补齐（本任务收尾
// tone-adaptive-chapter，custom 主题），收紧回完整 Record（沿用 cover 页型
// 在 Wave 1 收尾时的同一模式，见 index.ts）。
export const CHAPTER_LAYOUTS: Record<ChapterLayoutId, ChapterLayout> = {
  "block-numeral-chapter": BlockNumeralChapter,
  "ghost-section-chapter": GhostSectionChapter,
  "fascicle-ghost-chapter": FascicleGhostChapter,
  "seal-numeral-chapter": SealNumeralChapter,
  "field-band-chapter": FieldBandChapter,
  "subject-rule-chapter": SubjectRuleChapter,
  "decimal-index-chapter": DecimalIndexChapter,
  "issue-line-chapter": IssueLineChapter,
  "gauge-section": GaugeSectionChapter,
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
  "placard-chapter": PlacardChapter,
  "keynote-chapter": KeynoteChapter,
  "chalkboard-chapter": ChalkboardChapter,
  "portrait-chapter": PortraitChapter,
  "account-chapter": AccountChapter,
}
