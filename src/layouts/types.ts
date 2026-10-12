import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { MenuParamValue } from "../themes/schema"
import type { PageRenderContext } from "../render/page-context"

/**
 * Props every layout receives（原 templates/types.ts 的 SvgTemplateProps，
 * templates/ 删除后原地定义于此，P2 Wave 5）。
 */
export interface SvgTemplateProps {
  ir: PptxIR
  slide: Slide
  index: number
  ctx: ComponentCtx
  /** Effective page-level motif and brand decisions resolved by FullSlideSvg. */
  page?: PageRenderContext
  /** Values validated against this face's registry declaration at theme registration. */
  params?: Readonly<Record<string, MenuParamValue>>
}

/**
 * Cover layout：与旧模板 Cover 同签名的 SVG fragment 组件（spec §3.2）。
 * 纪律：实现文件内禁 theme id、禁 baked hex——颜色/字体只来自 p.ctx。
 */
export type CoverLayout = (p: SvgTemplateProps) => React.ReactElement

/** P2：与 Cover 同签名，覆盖 chapter/content/ending 三页型。 */
export type ChapterLayout = (p: SvgTemplateProps) => React.ReactElement
export type ContentLayout = (p: SvgTemplateProps) => React.ReactElement
export type EndingLayout = (p: SvgTemplateProps) => React.ReactElement

/** 每个 id 都由某个内置主题的菜单用到。新增时在此加 id 并在 index-cover.ts 注册。 */
export type CoverLayoutId =
  // 第七波封面保真（2026-08-22）：institutional-block = 左置巨字+签名块。
  | "institutional-block"
  // Wave 8 batch 1 (2026-08-23): board-locked covers. ikb-field-cover = full
  // primary field + left title + foot bar. stat-cover = display heading as
  // the page's number.
  | "ikb-field-cover"
  | "stat-cover"
  // Wave 8 batch 3 (2026-08-23).
  | "red-head-cover"
  | "gauge-verdict"
  // terminal sample redesign (2026-10-05): the incident console's cover.
  | "console-cover"
  // memo sample redesign (2026-10-05): the typed memorandum's cover.
  | "memo-cover"
  // clinic sample redesign (2026-10-05): the assessment file's cover.
  | "dossier-cover"
  // almanac sample redesign (2026-10-05): the yearbook's cover over its photograph.
  | "yearbook-cover"
  // homeroom sample redesign (2026-10-06): the lesson's board beside the classroom.
  | "lesson-cover"
  // ember sample redesign (2026-10-06): the pitch's photograph with the fire's wedge.
  | "pitch-cover"
  // rally sample redesign (2026-10-06): the campaign's photograph with its ticket stub and confetti.
  | "marquee-cover"
  // proposal theme (2026-10-06): a white proposal page beside the client's photograph.
  | "binder-cover"
  // thesis sample redesign (2026-10-06): a thesis title page beside a photograph.
  | "manuscript-cover"
  // journal sample redesign (2026-10-07): a small magazine's cover beside a photograph.
  | "periodical-cover"
  // ink sample redesign (2026-10-07): a title slip hung beside a photograph.
  | "scroll-cover"
  // crayon sample redesign (2026-10-08): a welcome sign drawn in crayon beside a framed photograph.
  | "crayonbox-cover"
  // luxe sample redesign (2026-10-08): a gilt invitation card beside a photograph.
  | "invitation-cover"
  // runway sample redesign (2026-10-08): a fashion magazine's cover.
  | "lineup-cover"
  // museum sample redesign (2026-10-08): an exhibition catalogue's cover.
  | "placard-cover"
  // stage sample redesign (2026-10-08): the hall from the back row.
  | "keynote-cover"
  // lecture sample redesign (2026-10-08): the board before an evening class begins.
  | "chalkboard-cover"
  // profile theme (2026-10-12): a magazine profile's opening spread beside the speaker's portrait.
  | "portrait-cover"
  // recap theme (2026-10-13): the front sheet of a year's account.
  | "account-cover"

// Wave 2（chapter/ending）新增 id：每主题 1 个（命名见 Wave 2 任务表）
export type ChapterLayoutId =
  // Wave 8 batch 1 pinOnly chapter faces.
  | "block-numeral-chapter"
  | "ghost-section-chapter"
  // Wave 8 batch 2 pinOnly chapter faces.
  | "fascicle-ghost-chapter"
  // Wave 8 batch 3 pinOnly chapter faces.
  | "seal-numeral-chapter"
  | "field-band-chapter"
  | "subject-rule-chapter"
  // Wave 8 batch 4 pinOnly chapter faces.
  | "decimal-index-chapter"
  | "issue-line-chapter"
  | "gauge-section"
  // terminal sample redesign (2026-10-05): the incident console's chapter page.
  | "console-chapter"
  // homeroom sample redesign (2026-10-06): a part of the lesson on a band of board.
  | "lesson-chapter"
  // ember sample redesign (2026-10-06): an act of the pitch, its number outlined in the fire.
  | "pitch-chapter"
  // rally sample redesign (2026-10-06): a section of the campaign, its ticket stub and confetti.
  | "marquee-chapter"
  // proposal theme (2026-10-06): a part of the proposal over its photograph, its tab lit.
  | "binder-chapter"
  // thesis sample redesign (2026-10-06): a section of a thesis with the talk's contents.
  | "manuscript-chapter"
  // ink sample redesign (2026-10-07): a volume opens beside its mounted painting.
  | "scroll-chapter"
  // crayon sample redesign (2026-10-08): a part's number on a tilted block of its section's crayon.
  | "crayonbox-chapter"
  // luxe sample redesign (2026-10-08): a part opens under a veil inside a gilt frame.
  | "invitation-chapter"
  // runway sample redesign (2026-10-08): a part opens on a photograph or on its looks in a row.
  | "lineup-chapter"
  // museum sample redesign (2026-10-08): the doorway to the next hall, in a pool of warm light.
  | "placard-chapter"
  // stage sample redesign (2026-10-08): an act of the talk opens over its photograph.
  | "keynote-chapter"
  // lecture sample redesign (2026-10-08): the board wiped for the next part of the lesson.
  | "chalkboard-chapter"
  // profile theme (2026-10-12): the next part of the talk on white paper.
  | "portrait-chapter"
  // recap theme (2026-10-13): the part's number, title and what it covers.
  | "account-chapter"
export type EndingLayoutId =
  // Wave 8 batch 1 pinOnly ending faces.
  | "signoff-ending"
  | "close-word-ending"
  // Wave 8 batch 3 pinOnly ending faces.
  | "deliberation-ending"
  // Wave 8 batch 4 pinOnly ending faces.
  | "resolution-ending"
  | "gauge-next"
  // terminal sample redesign (2026-10-05): the incident console's close.
  | "console-ending"
  // memo sample redesign (2026-10-05): the typed memorandum's sign-off.
  | "memo-ending"
  // clinic sample redesign (2026-10-05): the assessment file's ballot.
  | "dossier-ending"
  // almanac sample redesign (2026-10-05): the yearbook's decisions over a photograph.
  | "yearbook-ending"
  // homeroom sample redesign (2026-10-06): the lesson's homework.
  | "lesson-ending"
  // ember sample redesign (2026-10-06): the pitch's close and its button.
  | "pitch-ending"
  // rally sample redesign (2026-10-06): the campaign's next steps and its button.
  | "marquee-ending"
  // proposal theme (2026-10-06): what the client is asked to decide, a box per choice, and its button.
  | "binder-ending"
  // thesis sample redesign (2026-10-06): the points a thesis talk leaves and its closing line.
  | "manuscript-ending"
  // journal sample redesign (2026-10-07): a magazine's afterword and its sign-off.
  | "periodical-ending"
  // ink sample redesign (2026-10-07): the scroll's colophon and seal.
  | "scroll-ending"
  // crayon sample redesign (2026-10-08): the next meeting and the contact cards over a veiled photograph.
  | "crayonbox-ending"
  // luxe sample redesign (2026-10-08): the invitation signed by the house.
  | "invitation-ending"
  // runway sample redesign (2026-10-08): the bow on a black stage.
  | "lineup-ending"
  // museum sample redesign (2026-10-08): the lights go down and one label stays lit.
  | "placard-ending"
  // stage sample redesign (2026-10-08): the last sentence alone on the black.
  | "keynote-ending"
  // lecture sample redesign (2026-10-08): homework under the lit school at night.
  | "chalkboard-ending"
  // profile theme (2026-10-12): the closing promise and the speaker's card.
  | "portrait-ending"
  // recap theme (2026-10-13): the commitment and the decisions to tick.
  | "account-ending"

// Wave 3（content）新增 id
export type ContentLayoutId =
  // editorial-verse wave: statement = whole-page verse, pull-quote =
  // centered quote + attribution + prose.
  | "statement"
  | "pull-quote"
  // speech-layouts wave: stat-hero = whole-page number.
  | "stat-hero"
  | "gauge-point"
  // brief sample redesign: the board's ordinary content page, its evidence
  // page, and its single-figure page. Theme-locked, never auto-picked.
  | "gauge-sheet"
  | "gauge-exhibit"
  | "gauge-figure"
  // bulletin sample redesign: the board's ordinary content page.
  // Theme-locked, never auto-picked.
  | "notice-sheet"
  // swiss sample redesign: the board's ordinary content page, its statement
  // page and its single-figure page. Theme-locked, never auto-picked.
  | "grid-sheet"
  | "grid-statement"
  | "grid-figure"
  | "panel-sheet"
  | "panel-figure"
  | "seal-sheet"
  | "seal-figure"
  // terminal sample redesign: the board's ordinary content page. Theme-locked.
  | "console-sheet"
  // memo sample redesign: the board's ordinary content page. Theme-locked.
  | "memo-sheet"
  // clinic sample redesign: the board's ordinary content page. Theme-locked.
  | "dossier-sheet"
  // almanac sample redesign: the board's ordinary content page. Theme-locked.
  | "yearbook-sheet"
  // homeroom sample redesign: the board's ordinary content page. Theme-locked.
  | "lesson-sheet"
  // ember sample redesign: the board's ordinary content page and its photograph page. Theme-locked.
  | "pitch-sheet"
  | "pitch-photo"
  // rally sample redesign: the board's ordinary content page and its one-line plan. Theme-locked.
  | "marquee-sheet"
  | "marquee-statement"
  // proposal theme: the board's ordinary content page. Theme-locked.
  | "binder-sheet"
  // thesis sample redesign: the board's ordinary content page. Theme-locked.
  | "manuscript-sheet"
  // journal sample redesign: the board's ordinary content page. Theme-locked.
  | "periodical-sheet"
  // journal sample redesign: the board's quotation page. Theme-locked.
  | "periodical-quote"
  // ink sample redesign: the board's ordinary content page. Theme-locked.
  | "scroll-sheet"
  // ink sample redesign: the board's quotation page. Theme-locked.
  | "scroll-quote"
  // crayon sample redesign: the board's ordinary content page. Theme-locked.
  | "crayonbox-sheet"
  // luxe sample redesign: the board's ordinary content page. Theme-locked.
  | "invitation-sheet"
  // runway sample redesign: the board's ordinary content page. Theme-locked.
  | "lineup-sheet"
  // museum sample redesign: the board's ordinary content page. Theme-locked.
  | "placard-sheet"
  // stage sample redesign: the board's ordinary content page. Theme-locked.
  | "keynote-sheet"
  // lecture sample redesign: the board's ordinary content page. Theme-locked.
  | "chalkboard-sheet"
  // bulletin kinds round (2026-10-09): the statement, fact and evidence
  // pages the notice board lacked. Theme-locked, never auto-picked.
  | "notice-statement"
  | "notice-figure"
  | "notice-exhibit"
  // profile theme (2026-10-12): the board's ordinary content page. Theme-locked.
  | "portrait-sheet"
  // recap theme (2026-10-13): the board's ordinary content page. Theme-locked.
  | "account-sheet"
