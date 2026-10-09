/**
 * Layout registry (W2 task 1, spec §3/§6/§8): an explicit, statically-checked
 * description of what the render chain's 202 standard layouts and 4
 * page-level image takeovers already draw. This is a metadata layer only.
 * It formalizes today's implicit page structure (layout JSX + the
 * FullSlideSvg takeover dispatch) into named `slots`, it does not change any
 * drawing code.
 *
 * **Aggregator, not author (src domain reorg wave 1, task T1d).** Every
 * individual `LayoutDefinition` used to live here as a literal Record entry.
 * Each one now lives beside the layout JSX it describes instead — an
 * `export const layoutDef: LayoutDefinition` at the bottom of the matching
 * `layouts/*.tsx` file, or one of 4 uniquely-named exports at the bottom
 * of `image-pages.tsx` for the takeovers (one file implements all 4, so they
 * can't share the uniform `layoutDef` name the 154 single-layout
 * files use) — so "take one layout away whole" is a single-file operation
 * instead of a two-file archaeology dig. This file's own job is now purely
 * computational aggregation: import every `layoutDef`, assemble the five
 * Records below (`{ [def.id]: def }`-style, preserving the key order the
 * pre-migration literals held — new members still go on the end, a
 * discipline that outlived the `weightedPickBySeed` lottery it once fed), merge them into
 * `LAYOUT_REGISTRY`, and keep every type and query function
 * (`getLayout`/`layoutsForSlideType`) that reads the result. Never a re-export relay
 * — every line below either constructs a Record or queries/validates one
 * (this wave's aggregator discipline).
 *
 * Source of truth for each definition's own content: the layout file it
 * now lives in, `.issues/notes/engineering-history.md`
 * (the W2 pre-flight inventory), plus a direct re-read of the layout file
 * itself — where the inventory's summary and the code disagreed, the code
 * won (see the W2 task report for the one confirmed case: image-annotate).
 *
 * Slot `accepts` convention used throughout every `layoutDef`:
 *  - `[]` (empty array): the slot is *not* fed by an authored component
 *    — it's derived straight from slide-level scalar fields (`slide.heading`,
 *    `slide.subheading`), `ir.meta.*` (organization/date/version/contact/
 *    copyright/confidentiality), or pure computed geometry (chapter-number
 *    watermarks, rail progress dots, decorative motifs inline in the
 *    layout file). There is nothing here for an author to place.
 *  - `"any"`: the slot renders whatever `Component`s it's handed, unfiltered
 *    (`SvgContent`'s body, bento's grid, stacked-poster's hero/strip).
 *  - a literal component-type list: the slot requires that specific component
 *    type (`image`, `bullets`) — used only by the 4 takeover layouts, which
 *    `Array.find` a specific component type out of `slide.components`.
 */

// Type-only import from the shared leaf tuple module (not `@/narrative`
// itself, which owns the nominal `Strategy` type this mirrors structurally)
// — W4 import-cycle precedent: `src/themes/definitions.ts` imports this
// registry (`getLayout`), so this registry importing `@/narrative` (which
// could plausibly grow a reason to read theme/layout data back some day)
// would risk the same narrative↔consumer cycle W3 already broke once by
// carving `src/ir/narrative-values.ts` (renamed from `scenario-values.ts` in
// the vocabulary-v4 rename, task 1) out as a dependency-free leaf.
// `Strategy` here and `@/narrative`'s own `Strategy` are the exact same
// literal union (derived from the identical tuple) — TypeScript's
// structural typing makes them freely interchangeable at every call site, so
// no cast is ever needed where the two meet (`layout-selection.ts`'s
// `resolveLayoutId`).
import type { DesignStory } from "@/design-story"
import type { STRATEGY_VALUES } from "@/ir/narrative-values"

// layoutDef imports (src domain reorg wave 1, task T1d): 154 layout files
// (one `layoutDef` each) plus image-pages.tsx's 4 uniquely named takeover
// exports, 158 bindings total. The original migration covered 33 layout
// files and 4 takeovers. Later content expansion and theme redesign waves
// grew the registry, mostly through pin-only cover, chapter, and ending faces.
// Grouped by family, each group in the exact
// order its former literal Record held (order feeds `layoutsForSlideType`'s
// `Object.values` walk below). `weightedPickBySeed` layout lottery is
// historical. Aliased to a
// family-prefixed camelCase name (mirrors each file's own name) since 133
// files all export the same bare `layoutDef`.
import { layoutDef as coverBannerTitle } from "./cover-banner-title"
import { layoutDef as coverPosterCenter } from "./cover-poster-center"
import { layoutDef as coverLeftAnchor } from "./cover-left-anchor"
import { layoutDef as coverConstellation } from "./cover-constellation"
import { layoutDef as coverEditorialMasthead } from "./cover-editorial-masthead"
import { layoutDef as coverToneAdaptiveHeader } from "./cover-tone-adaptive-header"
import { layoutDef as coverFashionMasthead } from "./cover-fashion-masthead"
import { layoutDef as coverSplitDiagonal } from "./cover-split-diagonal"
import { layoutDef as coverColophon } from "./cover-colophon"
import { layoutDef as coverInstitutionalBlock } from "./cover-institutional-block"
import { layoutDef as coverMemoHead } from "./cover-memo-head"
import { layoutDef as coverBoardHead } from "./cover-board-head"
import { layoutDef as coverVerdictIndex } from "./cover-verdict-index"
import { layoutDef as coverBandTitle } from "./cover-band-title"
import { layoutDef as coverHeaderBand } from "./cover-header-band"
import { layoutDef as coverPaperMasthead } from "./cover-paper-masthead"
import { layoutDef as coverHorizonWedge } from "./cover-horizon-wedge"
import { layoutDef as coverCornerWedge } from "./cover-corner-wedge"
import { layoutDef as coverIkbFieldCover } from "./cover-ikb-field-cover"
import { layoutDef as coverStatCover } from "./cover-stat-cover"
import { layoutDef as coverTypeRuleCover } from "./cover-type-rule-cover"
import { layoutDef as coverThesisPlateCover } from "./cover-thesis-plate-cover"
import { layoutDef as coverChalkBandCover } from "./cover-chalk-band-cover"
import { layoutDef as coverCapsuleOpenCover } from "./cover-capsule-open-cover"
import { layoutDef as coverIssueHeadCover } from "./cover-issue-head-cover"
import { layoutDef as coverVerticalTitleCover } from "./cover-vertical-title-cover"
import { layoutDef as coverInvitationPlateCover } from "./cover-invitation-plate-cover"
import { layoutDef as coverLookbookOpenCover } from "./cover-lookbook-open-cover"
import { layoutDef as coverRedHeadCover } from "./cover-red-head-cover"
import { layoutDef as coverConsoleCover } from "./cover-console-cover"
import { layoutDef as coverMemoCover } from "./cover-memo-cover"
import { layoutDef as coverDossierCover } from "./cover-dossier-cover"
import { layoutDef as coverYearbookCover } from "./cover-yearbook-cover"
import { layoutDef as coverLessonCover } from "./cover-lesson-cover"
import { layoutDef as coverPitchCover } from "./cover-pitch-cover"
import { layoutDef as coverMarqueeCover } from "./cover-marquee-cover"
import { layoutDef as coverBinderCover } from "./cover-binder-cover"
import { layoutDef as coverManuscriptCover } from "./cover-manuscript-cover"
import { layoutDef as coverPeriodicalCover } from "./cover-periodical-cover"
import { layoutDef as coverScrollCover } from "./cover-scroll-cover"
import { layoutDef as coverCrayonboxCover } from "./cover-crayonbox-cover"
import { layoutDef as coverInvitationCover } from "./cover-invitation-cover"
import { layoutDef as coverLineupCover } from "./cover-lineup-cover"
import { layoutDef as coverPlacardCover } from "./cover-placard-cover"
import { layoutDef as coverKeynoteCover } from "./cover-keynote-cover"
import { layoutDef as coverChalkboardCover } from "./cover-chalkboard-cover"
import { layoutDef as coverPledgeOpenCover } from "./cover-pledge-open-cover"
import { layoutDef as coverReportOpenCover } from "./cover-report-open-cover"
import { layoutDef as coverGaugeVerdict } from "./cover-gauge-verdict"
import { layoutDef as coverCrayonboxOpen } from "./cover-crayonbox-open"
import { layoutDef as coverShowHeadline } from "./cover-show-headline"

import { layoutDef as chapterMastheadChapter } from "./chapter-masthead-chapter"
import { layoutDef as chapterConstellationChapter } from "./chapter-constellation-chapter"
import { layoutDef as chapterRailChapter } from "./chapter-rail-chapter"
import { layoutDef as chapterBannerChapter } from "./chapter-banner-chapter"
import { layoutDef as chapterPosterChapter } from "./chapter-poster-chapter"
import { layoutDef as chapterRomanChapter } from "./chapter-roman-chapter"
import { layoutDef as chapterToneAdaptiveChapter } from "./chapter-tone-adaptive-chapter"
import { layoutDef as chapterFashionChapter } from "./chapter-fashion-chapter"
import { layoutDef as chapterVerseChapter } from "./chapter-verse-chapter"
import { layoutDef as chapterGhostRuleChapter } from "./chapter-ghost-rule-chapter"
import { layoutDef as chapterBlockNumeralChapter } from "./chapter-block-numeral-chapter"
import { layoutDef as chapterGhostSectionChapter } from "./chapter-ghost-section-chapter"
import { layoutDef as chapterEmberIndexChapter } from "./chapter-ember-index-chapter"
import { layoutDef as chapterStrokeIndexChapter } from "./chapter-stroke-index-chapter"
import { layoutDef as chapterActChapter } from "./chapter-act-chapter"
import { layoutDef as chapterFolioGhostChapter } from "./chapter-folio-ghost-chapter"
import { layoutDef as chapterLessonBoxChapter } from "./chapter-lesson-box-chapter"
import { layoutDef as chapterStickerNumeralChapter } from "./chapter-sticker-numeral-chapter"
import { layoutDef as chapterFascicleGhostChapter } from "./chapter-fascicle-ghost-chapter"
import { layoutDef as chapterVolumeSlipChapter } from "./chapter-volume-slip-chapter"
import { layoutDef as chapterGiltOrdinalChapter } from "./chapter-gilt-ordinal-chapter"
import { layoutDef as chapterLookRangeChapter } from "./chapter-look-range-chapter"
import { layoutDef as chapterSealNumeralChapter } from "./chapter-seal-numeral-chapter"
import { layoutDef as chapterConsoleChapter } from "./chapter-console-chapter"
import { layoutDef as chapterLessonChapter } from "./chapter-lesson-chapter"
import { layoutDef as chapterPitchChapter } from "./chapter-pitch-chapter"
import { layoutDef as chapterMarqueeChapter } from "./chapter-marquee-chapter"
import { layoutDef as chapterBinderChapter } from "./chapter-binder-chapter"
import { layoutDef as chapterManuscriptChapter } from "./chapter-manuscript-chapter"
import { layoutDef as chapterScrollChapter } from "./chapter-scroll-chapter"
import { layoutDef as chapterCrayonboxChapter } from "./chapter-crayonbox-chapter"
import { layoutDef as chapterInvitationChapter } from "./chapter-invitation-chapter"
import { layoutDef as chapterLineupChapter } from "./chapter-lineup-chapter"
import { layoutDef as chapterPlacardChapter } from "./chapter-placard-chapter"
import { layoutDef as chapterKeynoteChapter } from "./chapter-keynote-chapter"
import { layoutDef as chapterChalkboardChapter } from "./chapter-chalkboard-chapter"
import { layoutDef as chapterFieldBandChapter } from "./chapter-field-band-chapter"
import { layoutDef as chapterSubjectRuleChapter } from "./chapter-subject-rule-chapter"
import { layoutDef as chapterOneWordChapter } from "./chapter-one-word-chapter"
import { layoutDef as chapterChalkRuleChapter } from "./chapter-chalk-rule-chapter"
import { layoutDef as chapterDecimalIndexChapter } from "./chapter-decimal-index-chapter"
import { layoutDef as chapterIssueLineChapter } from "./chapter-issue-line-chapter"
import { layoutDef as chapterHallLabelChapter } from "./chapter-hall-label-chapter"
import { layoutDef as chapterGaugeSection } from "./chapter-gauge-section"
import { layoutDef as chapterCrayonboxSticker } from "./chapter-crayonbox-sticker"
import { layoutDef as chapterShowPlate } from "./chapter-show-plate"

import { layoutDef as endingMastheadEnding } from "./ending-masthead-ending"
import { layoutDef as endingConstellationEnding } from "./ending-constellation-ending"
import { layoutDef as endingRailEnding } from "./ending-rail-ending"
import { layoutDef as endingBannerEnding } from "./ending-banner-ending"
import { layoutDef as endingPosterEnding } from "./ending-poster-ending"
import { layoutDef as endingToneAdaptiveEnding } from "./ending-tone-adaptive-ending"
import { layoutDef as endingFashionEnding } from "./ending-fashion-ending"
import { layoutDef as endingActionPadEnding } from "./ending-action-pad-ending"
import { layoutDef as endingSignoffEnding } from "./ending-signoff-ending"
import { layoutDef as endingCloseWordEnding } from "./ending-close-word-ending"
import { layoutDef as endingAskEnding } from "./ending-ask-ending"
import { layoutDef as endingRuleCloseEnding } from "./ending-rule-close-ending"
import { layoutDef as endingPillCtaEnding } from "./ending-pill-cta-ending"
import { layoutDef as endingDefenseCloseEnding } from "./ending-defense-close-ending"
import { layoutDef as endingHomeworkCloseEnding } from "./ending-homework-close-ending"
import { layoutDef as endingReminderListEnding } from "./ending-reminder-list-ending"
import { layoutDef as endingAfterwordEnding } from "./ending-afterword-ending"
import { layoutDef as endingSealCloseEnding } from "./ending-seal-close-ending"
import { layoutDef as endingGiltWordEnding } from "./ending-gilt-word-ending"
import { layoutDef as endingWindowCloseEnding } from "./ending-window-close-ending"
import { layoutDef as endingDeliberationEnding } from "./ending-deliberation-ending"
import { layoutDef as endingConsoleEnding } from "./ending-console-ending"
import { layoutDef as endingMemoEnding } from "./ending-memo-ending"
import { layoutDef as endingDossierEnding } from "./ending-dossier-ending"
import { layoutDef as endingYearbookEnding } from "./ending-yearbook-ending"
import { layoutDef as endingLessonEnding } from "./ending-lesson-ending"
import { layoutDef as endingPitchEnding } from "./ending-pitch-ending"
import { layoutDef as endingMarqueeEnding } from "./ending-marquee-ending"
import { layoutDef as endingBinderEnding } from "./ending-binder-ending"
import { layoutDef as endingManuscriptEnding } from "./ending-manuscript-ending"
import { layoutDef as endingPeriodicalEnding } from "./ending-periodical-ending"
import { layoutDef as endingScrollEnding } from "./ending-scroll-ending"
import { layoutDef as endingCrayonboxEnding } from "./ending-crayonbox-ending"
import { layoutDef as endingInvitationEnding } from "./ending-invitation-ending"
import { layoutDef as endingLineupEnding } from "./ending-lineup-ending"
import { layoutDef as endingPlacardEnding } from "./ending-placard-ending"
import { layoutDef as endingKeynoteEnding } from "./ending-keynote-ending"
import { layoutDef as endingChalkboardEnding } from "./ending-chalkboard-ending"
import { layoutDef as endingScorecardEnding } from "./ending-scorecard-ending"
import { layoutDef as endingCarePlanEnding } from "./ending-care-plan-ending"
import { layoutDef as endingReleaseCloseEnding } from "./ending-release-close-ending"
import { layoutDef as endingNextLectureEnding } from "./ending-next-lecture-ending"
import { layoutDef as endingResolutionEnding } from "./ending-resolution-ending"
import { layoutDef as endingDecisionCloseEnding } from "./ending-decision-close-ending"
import { layoutDef as endingExitWordEnding } from "./ending-exit-word-ending"
import { layoutDef as endingGaugeNext } from "./ending-gauge-next"
import { layoutDef as endingCrayonboxTodo } from "./ending-crayonbox-todo"
import { layoutDef as endingShowFinale } from "./ending-show-finale"

import { layoutDef as contentNarrowColumn } from "./content-narrow-column"
import { layoutDef as contentTwoColumn } from "./content-two-column"
import { layoutDef as contentRailNumbered } from "./content-rail-numbered"
import { layoutDef as contentStackedPoster } from "./content-stacked-poster"
import { layoutDef as contentBentoPanel } from "./content-bento-panel"
import { layoutDef as contentToneAdaptiveContent } from "./content-tone-adaptive-content"
import { layoutDef as contentAsymmetricTriptych } from "./content-asymmetric-triptych"
import { layoutDef as contentQuietFrame } from "./content-quiet-frame"
import { layoutDef as contentSplitBand } from "./content-split-band"
import { layoutDef as contentQuoteStage } from "./content-quote-stage"
import { layoutDef as contentStatement } from "./content-statement"
import { layoutDef as contentPullQuote } from "./content-pull-quote"
import { layoutDef as contentStatHero } from "./content-stat-hero"
import { layoutDef as contentOneEvidence } from "./content-one-evidence"
import { layoutDef as contentGaugeStats } from "./content-gauge-stats"
import { layoutDef as contentGaugePoint } from "./content-gauge-point"
import { layoutDef as contentCrayonboxCards } from "./content-crayonbox-cards"
import { layoutDef as contentCrayonboxPoint } from "./content-crayonbox-point"
import { layoutDef as contentShowGallery } from "./content-show-gallery"
import { layoutDef as contentShowSpotlight } from "./content-show-spotlight"
import { layoutDef as contentShowStatement } from "./content-show-statement"
import { layoutDef as contentShowFigures } from "./content-show-figures"
import { layoutDef as contentGaugeSheet } from "./content-gauge-sheet"
import { layoutDef as contentGaugeExhibit } from "./content-gauge-exhibit"
import { layoutDef as contentGaugeFigure } from "./content-gauge-figure"
import { layoutDef as contentNoticeSheet } from "./content-notice-sheet"
import { layoutDef as contentGridSheet } from "./content-grid-sheet"
import { layoutDef as contentGridStatement } from "./content-grid-statement"
import { layoutDef as contentGridFigure } from "./content-grid-figure"
import { layoutDef as contentPanelSheet } from "./content-panel-sheet"
import { layoutDef as contentPanelFigure } from "./content-panel-figure"
import { layoutDef as contentSealSheet } from "./content-seal-sheet"
import { layoutDef as contentConsoleSheet } from "./content-console-sheet"
import { layoutDef as contentMemoSheet } from "./content-memo-sheet"
import { layoutDef as contentDossierSheet } from "./content-dossier-sheet"
import { layoutDef as contentYearbookSheet } from "./content-yearbook-sheet"
import { layoutDef as contentLessonSheet } from "./content-lesson-sheet"
import { layoutDef as contentPitchSheet } from "./content-pitch-sheet"
import { layoutDef as contentPitchPhoto } from "./content-pitch-photo"
import { layoutDef as contentMarqueeSheet } from "./content-marquee-sheet"
import { layoutDef as contentMarqueeStatement } from "./content-marquee-statement"
import { layoutDef as contentBinderSheet } from "./content-binder-sheet"
import { layoutDef as contentManuscriptSheet } from "./content-manuscript-sheet"
import { layoutDef as contentPeriodicalSheet } from "./content-periodical-sheet"
import { layoutDef as contentPeriodicalQuote } from "./content-periodical-quote"
import { layoutDef as contentScrollSheet } from "./content-scroll-sheet"
import { layoutDef as contentScrollQuote } from "./content-scroll-quote"
import { layoutDef as contentCrayonboxSheet } from "./content-crayonbox-sheet"
import { layoutDef as contentInvitationSheet } from "./content-invitation-sheet"
import { layoutDef as contentLineupSheet } from "./content-lineup-sheet"
import { layoutDef as contentPlacardSheet } from "./content-placard-sheet"
import { layoutDef as contentKeynoteSheet } from "./content-keynote-sheet"
import { layoutDef as contentChalkboardSheet } from "./content-chalkboard-sheet"
import { layoutDef as contentNoticeStatement } from "./content-notice-statement"
import { layoutDef as contentNoticeFigure } from "./content-notice-figure"
import { layoutDef as contentNoticeExhibit } from "./content-notice-exhibit"
import { layoutDef as contentSealFigure } from "./content-seal-figure"

import {
  imageSplitLayoutDef,
  imageTopLayoutDef,
  imageBottomLayoutDef,
  imageAnnotateLayoutDef,
} from "../render/image-pages"

export type Strategy = (typeof STRATEGY_VALUES)[number]

export type SlideType = "cover" | "chapter" | "content" | "ending"

/** The 20-word slot vocabulary: the union of every distinct visual region
 * observed across all 154 standard layouts and 4 takeovers (inventory's "建议 slot
 * 词汇表"). Not every word is used by every entry, and `aside` currently
 * has zero occurrences as a *slot* (it only exists today as a body
 * `arrangement` — see `Arrangement` below) — kept in the vocabulary because
 * the interface contract types it as a first-class slot name for future use. */
export type SlotName =
  | "kicker"
  | "heading"
  | "subheading"
  | "rule"
  | "body"
  | "aside"
  | "image"
  | "caption"
  | "hero"
  | "strip"
  | "grid"
  | "annotation"
  | "watermark"
  | "rail"
  | "meta"
  | "decor"
  // P1 variety wave, task 4 (content-pool expansion): the retired
  // side-highlight's persistent frame panel, plus asymmetric-triptych's
  // three body regions. `panel` is unused after that retirement, kept
  // like `aside` as a first-class slot name.
  | "panel"
  | "lead"
  | "top"
  | "bottom"


export interface LayoutSlot {
  name: SlotName
  /** component type names this slot accepts, or "any" */
  accepts: readonly string[] | "any"
  /** Authored content must provide at least one component accepted by this slot. */
  required?: true
  /** declarative editorial capacity — how many components this slot holds. W3's
   *  min(pacing editorial budget, layout capacity) gate is the consumer —
   *  absent = frame slot, not subject to counting. */
  capacity?: number
  /** Capacity counts components unless the renderer consumes items within one component. */
  capacityUnit?: "components" | "items"
  /**
   * How many items *inside* one accepted component this slot draws.
   *
   * `capacity` counts components. A boundary face that accepts one `bullets`
   * has `capacity: 1` and still needs to say how many of that block's items
   * fit on the page — `signoff-ending` draws four lines on a 44px rhythm,
   * `verdict-index` three numbered arguments. Every one of those faces used
   * to answer the question with a bare `items.slice(0, 3)` in its own render
   * code: a page authored with five bullets printed three and said nothing,
   * anywhere, about the two that never made it.
   *
   * Declaring the number here makes it checkable. `validate-core.ts`'s
   * `checkBoundaryItemCapacity` reads it and hard-errors on a boundary page
   * that exceeds it, naming the face and the limit, so the author gets a
   * signal to shorten the list rather than a slide that quietly holds less
   * than it was given.
   *
   * `undefined` means the slot makes no item-level promise.
   */
  itemCapacity?: number
  /** for image slots: today's two coexisting conventions (inventory §variant 速查) */
  selection?: "first" | "all"
}

/** Numeric parameter contract exported by a face. */
export interface LayoutNumberParam {
  type: "number"
  integer?: boolean
  min?: number
  max?: number
}

/** String parameter contract exported by a face. */
export interface LayoutStringParam {
  type: "string"
  values?: readonly string[]
  minLength?: number
  maxLength?: number
}

/** Boolean parameters have no range beyond their primitive type. */
export interface LayoutBooleanParam {
  type: "boolean"
}

export type LayoutParamDeclaration = LayoutNumberParam | LayoutStringParam | LayoutBooleanParam

/** A page-coordinate rectangle a face paints its own furniture into. */
export interface DecorKeepOutRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Where a cover face puts the shared top-left mark, see `LayoutDefinition.coverMark`. */
export interface CoverMarkAnchor {
  x: number
  y: number
  ground?: "primary" | "accent" | "surface"
}

export interface LayoutDefinition {
  id: string
  /**
   * The standard tier vs. the 4 page-level image takeovers.
   *
   * `"standard"` is the standard tier's fossilized spelling. The two words
   * merged into one vocabulary — a layout is the registry entry plus the JSX
   * that draws it — but this literal stays `"standard"` rather than being
   * renamed in place.
   */
  kind: "standard" | "takeover"
  /**
   * The face's design story: how it arranges attention, which moves it
   * serves, and the viewing distance it is drawn for. Public copy, the same
   * six fields a theme, a kind, and a component carry.
   *
   * Every face in this registry carries one, and `design-story.test.ts`
   * sweeps them with the themes, the kinds, and the components. The field
   * stays optional so a face can be added and its copy written in the same
   * change without the type fighting the order the work happens in. A theme's
   * sparse dressing (`layouts/sparse`) writes none of its own: it is keyed by
   * theme and face id, so it inherits the story of the face it dresses.
   */
  story?: DesignStory
  slideTypes: readonly SlideType[]
  slots: readonly LayoutSlot[]
  /**
   * Adjustable face parameters and their complete value boundaries. Theme
   * menu entries may set only names declared here, and `registerTheme`
   * validates every supplied value before installing the theme.
   */
  params?: Readonly<Record<string, LayoutParamDeclaration>>
  /**
   * Structural fact of the face: it leaves no room for the brand frame
   * (footer rule, meta, logo). A menu entry may additionally silence the
   * brand on a face that does have room; it can never paint one here.
   */
  branding?: "none"
  /**
   * Structural fact of a cover face about the cover's top-left mark
   * (`render/footer.tsx`'s `CoverMark`).
   *
   * - `"face"`: the face sets the confidentiality mark in a place of its own
   *   composition (a corner label, a meta row), reading the words from
   *   `coverConfidentiality` (`render/document-meta.ts`). The shared mark
   *   then stays off unless it carries a legal classification, which only
   *   ever goes top left.
   * - `{ x, y, ground? }`: the shared mark's baseline start on this face,
   *   when the default top-left spot would sit on the face's own furniture
   *   (a frame line, a band). `ground` names the theme color the face paints
   *   under that spot when it is not the page's own background (a full-bleed
   *   primary field), so the mark's ink is measured against what is really
   *   there.
   *
   * Omitted, the shared mark takes the default top-left spot.
   */
  coverMark?: "face" | CoverMarkAnchor
  /**
   * The page fields this face draws beyond its heading, subheading and
   * components: `kicker`, the short label over the heading, `fields`, the
   * label and value lines a document form prints (a memo's To and From),
   * `stamp`, a stamp pressed on the page, `tag`, a small tag set with the
   * heading that says what the page rests on, `ballot`, the boxes a
   * committee ticks beside each item, `years`, the strip of years a running
   * head draws with the page's own years lit, `stage`, the deck's course
   * drawn as a strip of pills with the page's own stage lit, and on a cover,
   * chapter or ending face `footnote` (a content face always has a place for
   * its source line). validate refuses a `kicker`, `fields`, `stamp`, `tag`,
   * `ballot`, `years` or `stage` on a face that does not list it, and a
   * boundary page's `footnote` likewise.
   */
  pageFields?: readonly ("kicker" | "footnote" | "fields" | "stamp" | "tag" | "ballot" | "years" | "stage")[]
  /**
   * Structural fact of a face that does not draw the page's `subheading`
   * with its heading, as every other face does. Omitted, the face draws it.
   *
   * - `"in-body"`: the face sets one text under its claim, and a body
   *   component fills it first (`statementLines`). The subheading takes
   *   that line only on a page whose body leaves it free, so validate
   *   refuses a subheading beside a component that fills it.
   * - `{ none }`: the face has no place for a subheading. validate refuses
   *   one, and `none` tells the author where to write it instead.
   */
  subheading?: "in-body" | { none: string }
  /**
   * Structural fact of a cover or chapter face: it draws its own page over a
   * photograph background (`background.kind: "asset"`).
   *
   * Such a page otherwise goes to the shared photo renderer (`ImageCoverPage`,
   * the `image-cover` route in `render/layout-selection.ts`), which sets the
   * heading in white over a dark scrim and draws nothing the face would: no
   * kicker, no component, none of the face's furniture. A face that declares
   * this keeps the page. The photograph is painted under it edge to edge with
   * no scrim of its own, the face lays whatever darkening it was drawn with
   * over it, and its slots and page fields stay open to the author.
   */
  drawsPhoto?: true
  /**
   * Structural fact of a content face: its artwork runs to the bottom edge
   * where the footer row would sit (a full-height bleed photo, its caption
   * bar), so the page carries no footer row, page number included. Narrower
   * than `branding: "none"`: the logo keeps its place.
   */
  footerRow?: "none"
  /**
   * Structural fact of the face: it paints its own full identity and the
   * theme motif must stay off. A menu entry's `decor` can silence a motif
   * on other faces, or swap which motif paints; it cannot force one here.
   */
  suppressMotif?: true
  /**
   * Structural fact of the face: it paints its own furniture inside these
   * page-coordinate rectangles, so a page-level motif must keep its marks
   * away from them.
   *
   * `suppressMotif` is the all-or-nothing neighbour of this field — it turns
   * the theme's whole motif off for a face that paints its own full identity.
   * A face that only *occupies a corner* needs the narrower statement: the
   * motif is still welcome, just not there. `rail-numbered` is the first
   * case (gallery visual review fix/gallery-verdict-round, item 5): its left
   * progress rail runs 4px from brief's locator corner, and two
   * structural marks that close together read as one botched line.
   *
   * A face states where it paints. How much clearance a mark needs is the
   * mark's own business — see `motifs/keep-out.ts`.
   */
  decorKeepOut?: readonly DecorKeepOutRect[]
  /**
   * This layout opens by painting its own full-bleed colour field over the
   * whole canvas, so the theme background underneath it is never seen —
   * `FullSlideSvg` (`../render/full-slide-svg.tsx`) skips `Background` entirely for
   * such a layout.
   *
   * Not an optimisation. Two full-bleed rects of different colours stacked on
   * the same canvas edge leave a visible defect: a browser clips every shape
   * to the SVG viewport, and that clip is antialiased whenever the mounted
   * slide's box does not land on whole device pixels (it almost never does).
   * The lower rect therefore survives in the boundary column at roughly a
   * fifth of its strength, and a cream page under a near-black field reads as
   * a pale one-to-two pixel line down the page edge — reported against
   * `ink`'s cover in the 2026-08-20 review. Painting only the field the
   * reader actually sees removes the colour that was leaking. See
   * `../lib/slide-edge.ts` for the other half of the same defect, on the
   * frame side of the SVG.
   *
   * `undefined` (most layouts) means the ordinary arrangement: `Background`
   * paints, the layout draws on top of it.
   */
  paintsOwnBackground?: boolean
  /**
   * Structural fact of the face: it picks its composition from the content
   * the page carries rather than drawing one fixed arrangement.
   *
   * A theme menu normally gives each content kind its own face, because two
   * kinds on one face read as the same page twice and a deck built from them
   * goes monotonous. A face that dispatches by content does not have that
   * problem: a ruled list, an options table, a row of phases and a team chart
   * all come out of it as different pages. Only a face that declares this may
   * be named by several kinds of one menu (`themes/builtin/menus.test.ts`).
   *
   * `gauge-sheet` is the case: it hands each content shape the brief board
   * composes by hand to one of the shared compositions (`layouts/compositions/`).
   */
  dispatch?: "content"
  /**
   * Structural fact of a content face: one of its compositions sets a
   * full-body component (a waterfall, a gantt) beside a companion of these
   * types, such as the figures a bridge or a calendar is read with.
   *
   * A full-body component owns the whole body band everywhere else, so
   * validate refuses it beside anything (`checkFullBodyExclusivity`). A face
   * that declares companions is the exception for exactly those types: the
   * page may hold one full-body component and companions of the declared
   * types, nothing else. Undefined means the face takes a full-body
   * component alone.
   */
  fullBodyCompanions?: readonly string[]
  /**
   * This face's own heading fit, declared rather than inlined.
   *
   * A face whose heading is the whole page — `stat-hero`'s numeral,
   * `statement`'s verse, `quote-stage`'s aphorism — has a measure, a size, a
   * line ceiling and a floor it does not want scattered through its render
   * code. Declaring them here lets the face spread them into its own
   * `fitHeadingLines` call (`...layoutDef.headingFit`) and lets a reader see
   * the page's typographic contract without reading the JSX.
   *
   * `fontFamily` is deliberately absent: it comes from the bound theme
   * through the render `ctx`, so it is not a property of the face.
   *
   * `undefined` means the face makes no declaration and fits its heading
   * however its render code sees fit.
   */
  headingFit?: {
    maxWidth: number
    fontSize: number
    maxLines?: number
    minPt?: number
    /** Passed through to `fitHeadingLines`. Default there is `true` (heading
     *  as bold). Editorial-verse layouts set `false` so validate's overflow
     *  check uses the same width model the render path does (weight 400–500). */
    bold?: boolean
    lineHeightRatio?: number
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Cover layouts (38 total: 19 auto-selectable and 19 pin-only).
// The board-cover-fidelity wave grew the group from 9 to 13 in 2026-08-22.
// It added institutional-block / memo-head / board-head / bill-head, four
// board constructions that were not in the pool. They were appended after
// colophon, following the position discipline every earlier pool growth used.
// Most covers still
// have no body slot. `verdict-index` is the exception: it declares
// `body accepts: ["bullets"]` and draws up to three numbered arguments.
// ─────────────────────────────────────────────────────────────────────────
const COVER_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [coverBannerTitle.id]: coverBannerTitle,
  [coverPosterCenter.id]: coverPosterCenter,
  [coverLeftAnchor.id]: coverLeftAnchor,
  [coverConstellation.id]: coverConstellation,
  [coverEditorialMasthead.id]: coverEditorialMasthead,
  [coverToneAdaptiveHeader.id]: coverToneAdaptiveHeader,
  [coverFashionMasthead.id]: coverFashionMasthead,
  [coverSplitDiagonal.id]: coverSplitDiagonal,
  // Theme-redesign wave (2026-08-18, cover pool 8 -> 9): appended at the end
  // of the cover group, same position discipline every earlier pool growth
  // used (image-lead-split / split-band / quote-stage each landed last in
  // their own family). Key insertion order used to feed a `weightedPickBySeed`
  // lottery. That lottery is historical. New members still go on the end.
  [coverColophon.id]: coverColophon,
  // Board-cover-fidelity wave (2026-08-22, cover pool 9 -> 13): appended at
  // the end of the cover group. Key insertion order used to feed a
  // `weightedPickBySeed` lottery. That lottery is historical. New members
  // still go on the end.
  [coverInstitutionalBlock.id]: coverInstitutionalBlock,
  [coverMemoHead.id]: coverMemoHead,
  [coverBoardHead.id]: coverBoardHead,
  // Board-cover-restore wave 1 (2026-08-22, cover pool 13 -> 19): appended
  // at the end of the cover group. Key insertion order used to feed a
  // `weightedPickBySeed` lottery. That lottery is historical. New members
  // still go on the end.
  [coverVerdictIndex.id]: coverVerdictIndex,
  [coverBandTitle.id]: coverBandTitle,
  [coverHeaderBand.id]: coverHeaderBand,
  [coverPaperMasthead.id]: coverPaperMasthead,
  [coverHorizonWedge.id]: coverHorizonWedge,
  [coverCornerWedge.id]: coverCornerWedge,
  [coverIkbFieldCover.id]: coverIkbFieldCover,
  [coverStatCover.id]: coverStatCover,
  [coverTypeRuleCover.id]: coverTypeRuleCover,
  [coverThesisPlateCover.id]: coverThesisPlateCover,
  [coverChalkBandCover.id]: coverChalkBandCover,
  [coverCapsuleOpenCover.id]: coverCapsuleOpenCover,
  [coverIssueHeadCover.id]: coverIssueHeadCover,
  [coverVerticalTitleCover.id]: coverVerticalTitleCover,
  // Wave 8 batch 3 (2026-08-23): luxe / runway / vermilion / almanac / clinic / arena board locks.
  [coverInvitationPlateCover.id]: coverInvitationPlateCover,
  [coverLookbookOpenCover.id]: coverLookbookOpenCover,
  [coverRedHeadCover.id]: coverRedHeadCover,
  [coverPledgeOpenCover.id]: coverPledgeOpenCover,
  [coverReportOpenCover.id]: coverReportOpenCover,
  [coverGaugeVerdict.id]: coverGaugeVerdict,
  [coverCrayonboxOpen.id]: coverCrayonboxOpen,
  [coverShowHeadline.id]: coverShowHeadline,
  // terminal sample redesign (2026-10-05).
  [coverConsoleCover.id]: coverConsoleCover,
  // memo sample redesign (2026-10-05).
  [coverMemoCover.id]: coverMemoCover,
  // clinic sample redesign (2026-10-05).
  [coverDossierCover.id]: coverDossierCover,
  // almanac sample redesign (2026-10-05).
  [coverYearbookCover.id]: coverYearbookCover,
  // homeroom sample redesign (2026-10-06).
  [coverLessonCover.id]: coverLessonCover,
  // ember sample redesign (2026-10-06).
  [coverPitchCover.id]: coverPitchCover,
  // rally sample redesign (2026-10-06).
  [coverMarqueeCover.id]: coverMarqueeCover,
  // proposal theme (2026-10-06).
  [coverBinderCover.id]: coverBinderCover,
  // thesis sample redesign (2026-10-06).
  [coverManuscriptCover.id]: coverManuscriptCover,
  // journal sample redesign (2026-10-07).
  [coverPeriodicalCover.id]: coverPeriodicalCover,
  // ink sample redesign (2026-10-07).
  [coverScrollCover.id]: coverScrollCover,
  // crayon sample redesign (2026-10-08).
  [coverCrayonboxCover.id]: coverCrayonboxCover,
  // luxe sample redesign (2026-10-08).
  [coverInvitationCover.id]: coverInvitationCover,
  // runway sample redesign (2026-10-08).
  [coverLineupCover.id]: coverLineupCover,
  // museum sample redesign (2026-10-08).
  [coverPlacardCover.id]: coverPlacardCover,
  // stage sample redesign (2026-10-08).
  [coverKeynoteCover.id]: coverKeynoteCover,
  // lecture sample redesign (2026-10-08).
  [coverChalkboardCover.id]: coverChalkboardCover,
}

// ─────────────────────────────────────────────────────────────────────────
// Chapter layouts (37 total: 8 auto-selectable and 29 pin-only).
// The original eight carry a chapter-number `watermark`. Later theme-specific
// faces may express the ordinal through a different named slot.
// Chapter layouts do not read components, so none has a body slot.
// ─────────────────────────────────────────────────────────────────────────
const CHAPTER_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [chapterMastheadChapter.id]: chapterMastheadChapter,
  [chapterConstellationChapter.id]: chapterConstellationChapter,
  [chapterRailChapter.id]: chapterRailChapter,
  [chapterBannerChapter.id]: chapterBannerChapter,
  [chapterPosterChapter.id]: chapterPosterChapter,
  [chapterRomanChapter.id]: chapterRomanChapter,
  [chapterToneAdaptiveChapter.id]: chapterToneAdaptiveChapter,
  [chapterFashionChapter.id]: chapterFashionChapter,
  [chapterVerseChapter.id]: chapterVerseChapter,
  [chapterGhostRuleChapter.id]: chapterGhostRuleChapter,
  [chapterBlockNumeralChapter.id]: chapterBlockNumeralChapter,
  [chapterGhostSectionChapter.id]: chapterGhostSectionChapter,
  [chapterEmberIndexChapter.id]: chapterEmberIndexChapter,
  [chapterStrokeIndexChapter.id]: chapterStrokeIndexChapter,
  [chapterActChapter.id]: chapterActChapter,
  [chapterFolioGhostChapter.id]: chapterFolioGhostChapter,
  [chapterLessonBoxChapter.id]: chapterLessonBoxChapter,
  [chapterStickerNumeralChapter.id]: chapterStickerNumeralChapter,
  [chapterFascicleGhostChapter.id]: chapterFascicleGhostChapter,
  [chapterVolumeSlipChapter.id]: chapterVolumeSlipChapter,
  [chapterGiltOrdinalChapter.id]: chapterGiltOrdinalChapter,
  [chapterLookRangeChapter.id]: chapterLookRangeChapter,
  [chapterSealNumeralChapter.id]: chapterSealNumeralChapter,
  [chapterFieldBandChapter.id]: chapterFieldBandChapter,
  [chapterSubjectRuleChapter.id]: chapterSubjectRuleChapter,
  [chapterOneWordChapter.id]: chapterOneWordChapter,
  [chapterChalkRuleChapter.id]: chapterChalkRuleChapter,
  [chapterDecimalIndexChapter.id]: chapterDecimalIndexChapter,
  [chapterIssueLineChapter.id]: chapterIssueLineChapter,
  [chapterHallLabelChapter.id]: chapterHallLabelChapter,
  [chapterGaugeSection.id]: chapterGaugeSection,
  [chapterCrayonboxSticker.id]: chapterCrayonboxSticker,
  [chapterShowPlate.id]: chapterShowPlate,
  // terminal sample redesign (2026-10-05).
  [chapterConsoleChapter.id]: chapterConsoleChapter,
  // homeroom sample redesign (2026-10-06).
  [chapterLessonChapter.id]: chapterLessonChapter,
  // ember sample redesign (2026-10-06).
  [chapterPitchChapter.id]: chapterPitchChapter,
  // rally sample redesign (2026-10-06).
  [chapterMarqueeChapter.id]: chapterMarqueeChapter,
  // proposal theme (2026-10-06).
  [chapterBinderChapter.id]: chapterBinderChapter,
  // thesis sample redesign (2026-10-06).
  [chapterManuscriptChapter.id]: chapterManuscriptChapter,
  // ink sample redesign (2026-10-07): a volume of the scroll opens beside its painting.
  [chapterScrollChapter.id]: chapterScrollChapter,
  // crayon sample redesign (2026-10-08): a part opens on a tilted block of its crayon.
  [chapterCrayonboxChapter.id]: chapterCrayonboxChapter,
  // luxe sample redesign (2026-10-08): a part opens under a veil inside a gilt frame.
  [chapterInvitationChapter.id]: chapterInvitationChapter,
  // runway sample redesign (2026-10-08): a part opens on a photograph or on its looks in a row.
  [chapterLineupChapter.id]: chapterLineupChapter,
  // museum sample redesign (2026-10-08): the doorway to the next hall, in a pool of warm light.
  [chapterPlacardChapter.id]: chapterPlacardChapter,
  // stage sample redesign (2026-10-08): an act of the talk opens over its photograph.
  [chapterKeynoteChapter.id]: chapterKeynoteChapter,
  // lecture sample redesign (2026-10-08): the board wiped for the next part of the lesson.
  [chapterChalkboardChapter.id]: chapterChalkboardChapter,
}

// ─────────────────────────────────────────────────────────────────────────
// Ending layouts (35 total: 7 auto-selectable and 28 pin-only).
// Sixteen endings declare a body slot for their own constrained closing-page
// content. The other 19 have no body slot.
// ─────────────────────────────────────────────────────────────────────────
const ENDING_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [endingMastheadEnding.id]: endingMastheadEnding,
  [endingConstellationEnding.id]: endingConstellationEnding,
  [endingRailEnding.id]: endingRailEnding,
  [endingBannerEnding.id]: endingBannerEnding,
  [endingPosterEnding.id]: endingPosterEnding,
  [endingToneAdaptiveEnding.id]: endingToneAdaptiveEnding,
  [endingFashionEnding.id]: endingFashionEnding,
  [endingActionPadEnding.id]: endingActionPadEnding,
  [endingSignoffEnding.id]: endingSignoffEnding,
  [endingCloseWordEnding.id]: endingCloseWordEnding,
  [endingAskEnding.id]: endingAskEnding,
  [endingRuleCloseEnding.id]: endingRuleCloseEnding,
  [endingPillCtaEnding.id]: endingPillCtaEnding,
  [endingDefenseCloseEnding.id]: endingDefenseCloseEnding,
  [endingHomeworkCloseEnding.id]: endingHomeworkCloseEnding,
  [endingReminderListEnding.id]: endingReminderListEnding,
  [endingAfterwordEnding.id]: endingAfterwordEnding,
  [endingSealCloseEnding.id]: endingSealCloseEnding,
  [endingGiltWordEnding.id]: endingGiltWordEnding,
  [endingWindowCloseEnding.id]: endingWindowCloseEnding,
  [endingDeliberationEnding.id]: endingDeliberationEnding,
  [endingScorecardEnding.id]: endingScorecardEnding,
  [endingCarePlanEnding.id]: endingCarePlanEnding,
  [endingReleaseCloseEnding.id]: endingReleaseCloseEnding,
  [endingNextLectureEnding.id]: endingNextLectureEnding,
  [endingResolutionEnding.id]: endingResolutionEnding,
  [endingDecisionCloseEnding.id]: endingDecisionCloseEnding,
  [endingExitWordEnding.id]: endingExitWordEnding,
  [endingGaugeNext.id]: endingGaugeNext,
  [endingCrayonboxTodo.id]: endingCrayonboxTodo,
  [endingShowFinale.id]: endingShowFinale,
  // terminal sample redesign (2026-10-05).
  [endingConsoleEnding.id]: endingConsoleEnding,
  // memo sample redesign (2026-10-05).
  [endingMemoEnding.id]: endingMemoEnding,
  // clinic sample redesign (2026-10-05).
  [endingDossierEnding.id]: endingDossierEnding,
  // almanac sample redesign (2026-10-05).
  [endingYearbookEnding.id]: endingYearbookEnding,
  // homeroom sample redesign (2026-10-06).
  [endingLessonEnding.id]: endingLessonEnding,
  // ember sample redesign (2026-10-06).
  [endingPitchEnding.id]: endingPitchEnding,
  // rally sample redesign (2026-10-06).
  [endingMarqueeEnding.id]: endingMarqueeEnding,
  // proposal theme (2026-10-06).
  [endingBinderEnding.id]: endingBinderEnding,
  // thesis sample redesign (2026-10-06).
  [endingManuscriptEnding.id]: endingManuscriptEnding,
  // journal sample redesign (2026-10-07).
  [endingPeriodicalEnding.id]: endingPeriodicalEnding,
  // ink sample redesign (2026-10-07): the scroll's colophon.
  [endingScrollEnding.id]: endingScrollEnding,
  // crayon sample redesign (2026-10-08): the next meeting and how to reach the school.
  [endingCrayonboxEnding.id]: endingCrayonboxEnding,
  // luxe sample redesign (2026-10-08): the invitation signed by the house.
  [endingInvitationEnding.id]: endingInvitationEnding,
  // runway sample redesign (2026-10-08): the bow on a black stage.
  [endingLineupEnding.id]: endingLineupEnding,
  // museum sample redesign (2026-10-08): the lights go down and one label stays lit.
  [endingPlacardEnding.id]: endingPlacardEnding,
  // stage sample redesign (2026-10-08): the last sentence alone on the black.
  [endingKeynoteEnding.id]: endingKeynoteEnding,
  // lecture sample redesign (2026-10-08): homework under the lit school at night.
  [endingChalkboardEnding.id]: endingChalkboardEnding,
}

// ─────────────────────────────────────────────────────────────────────────
// Content standard layouts (26 total: 9 auto-selectable and 17 pin-only).
// The quote-stage wave grew the group from 12 to 13 with quote-stage,
// pptwise's first `pinOnly` member (see {@link LayoutDefinition.pinOnly}):
// reachable only through an explicit `slide.layout` pin, never auto-picked,
// so it doesn't grow any theme's curated pool — "12 auto-selectable + 1
// pin-only", not a flat +1 (see that file's own composition-sketch header);
// content-layout expansion wave task T2 grew the auto-selectable count
// 11 -> 12 just before it — split-band, the pool's first *horizontal* split
// (a full-bleed header band over an ordinary body band) — see that file's
// own composition-sketch header for the capacity measurement that chose its
// ratio; task T1 grew this same family 10 -> 11 just before it —
// image-lead-split, the first layout whose column split is genuinely
// unequal — see that file's own composition-sketch header; P1 variety wave
// task 4 grew this same family 7 -> 10 before it, content having been the
// pool's thinnest page type, the C-investigation's own finding, dr/
// c-diversity.md) — the only family that reads `slide.components`, so
// every entry carries a `body` slot plus its own heading band, and declares
// `arrangements` (inventory decision #2: layouts that don't obey the
// author's arrangement still truthfully declare which arrangement(s) they
// honor, behavior unchanged).
//
// `body` slot `capacity` (W2 task 5 — filling the placeholder task 1 left
// here): declarative authoring-time metadata only, same convention as the
// `hero`/`strip`/`grid`/`annotation` slots below — consumed since W3 by the
// validate-layer `min(pacing editorial budget, layout capacity)` quality
// gate (ir-quality.ts via layout-selection.ts). Numbers are the
// geometry-honest per-layout component count, sourced from the pre-W3
// CAPACITY table's derivations (not invented fresh):
//   - single-stack layouts — narrow-column/rail-numbered/
//     tone-adaptive-content, plus stacked-poster's degrade path
//     (content-stacked-poster.tsx's own comment on its layoutDef already
//     establishes it behaves like the
//     other four "all" layouts once it falls back to SvgContent): 4,
//     mirroring the former `CAPACITY.maxBlocksPerSlide` (deleted in W3 — the editorial side now lives in PACING_BUDGETS) — audit/capacity.ts's flat,
//     theme-independent default (`floor(minRectH / perBlock)`, the shared
//     derivation for every linear-stack theme).
//   - two-column: 4 too — the arrangement splits components into 2 narrower
//     columns (`(rect.w - COLUMN_GAP) / 2`, layout.ts) but shares the same
//     content-height budget as the single-stack layouts, not a taller one,
//     so two columns doesn't earn a higher total than one.
//   - bento-panel: 6, matching this same layout's own `grid` slot
//     capacity below — not the flat default. `layoutBento`'s hard 6-cell
//     ceiling (bento-layout.ts: "the bento grid only ever has 6 cells") and
//     the former theme-keyed `CAPACITY.maxBlocksPerSlideOverrides.terminal = 6`
//     (deleted in W3 — this layout-keyed entry is its home now) both land on the
//     same number for the same non-linear grid geometry independently.
//     `body` is bento-panel's *degraded* single-stack rendering of the exact
//     same component sequence the grid would otherwise hold (see that
//     entry's own comment), so it shares the grid's number rather than a
//     lesser invented one.
//     Final semantics (W4, recorded once the full-set rollout made
//     bento-panel reachable from every theme, not just terminal): this capacity-6
//     ceiling never actually binds the `min(pacing editorial budget, layout
//     capacity)` density gate. `PACING_BUDGETS`'s loosest pacing
//     (`dense`) tops out at 5 components/slide — still under 6 — so every
//     pacing's own editorial budget wins the `min()` for this layout
//     (5/4/3 for dense/balanced/spacious, never 6). The number above is
//     bento-panel's true geometric ceiling and stays for documentation and
//     for any future pacing tier looser than 5, but no deck can reach it
//     through today's gate.
//   - asymmetric-triptych/quiet-frame (task 4's remaining layouts after
//     side-highlight retired): 4, the same flat single-stack default every
//     layout but bento-panel already carries — neither body's region exceeds
//     the pool's existing narrowest single-stack width (880px,
//     `narrow-column`'s `COLUMN_W`), so no new per-layout number is
//     warranted (each file's own composition-sketch header derives this
//     explicitly, not just asserts it).
//   - image-lead-split (task T1): body 4 too, and visual 1 — its 435px text
//     column is narrower than every other layout's own single-stack
//     column, but still wider than the pool's already-audited narrowest
//     single-stack region (asymmetric-triptych's 424px `top`/`bottom`
//     panels), so this doesn't warrant a new number either, nor tightening
//     any `audit/capacity.ts` floor — the file's own header derives this.
//   - split-band (task T2): body 4 too — its 400px (380px with a footnote)
//     body height is *shorter* than every other layout's own body
//     region (the pool's previous floor was width, not height; this is the
//     first layout whose heading band eats vertical rather than
//     horizontal budget), which is exactly why this task's own capacity
//     measurement (see the file's own composition-sketch header) tested
//     candidate ratios against realistic per-tier content *before* fixing
//     the geometry, instead of assuming the pool's flat 4 would still be
//     safe at a new, shorter height. It held at zero `data-dropped` for
//     ordinary content at every pacing tier, so 4 stays the declared
//     number — no `audit/capacity.ts` floor needs tightening either, by
//     the same "re-verified, not assumed" standard image-lead-split's own
//     entry above already established for a *width* floor.
//   - quote-stage (quote-stage wave, task T2): body 1 — not a flat-default
//     single-stack number like every entry above. This is the pool's first
//     `pinOnly` member (see {@link LayoutDefinition.pinOnly}): the body
//     slot is a small attribution/footnote *annotation* position below an
//     oversized heading, not a "承重" content region — 1 is a deliberate,
//     narrow authoring contract (at most one short attribution component),
//     not a geometric ceiling derived from column width like the other
//     entries' 4/6. Enforced by `ir-quality.ts`'s `density` warn
//     (min(pacing budget, this capacity) — the same generic gate every entry
//     here already feeds).
//
// This essay is what every content layout's own body-slot capacity
// comment means by "see registry.ts's CONTENT_LAYOUT_DEFS header for the
// derivation" (src domain reorg wave 1, task T1d — reworded from the
// pre-migration "see file header derivation" once each entry moved into its
// own layout file). It stays here, comparative across all 26, rather
// than traveling with any one entry.
// ─────────────────────────────────────────────────────────────────────────
const CONTENT_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [contentNarrowColumn.id]: contentNarrowColumn,
  [contentTwoColumn.id]: contentTwoColumn,
  [contentRailNumbered.id]: contentRailNumbered,
  [contentStackedPoster.id]: contentStackedPoster,
  [contentBentoPanel.id]: contentBentoPanel,
  [contentToneAdaptiveContent.id]: contentToneAdaptiveContent,
  [contentAsymmetricTriptych.id]: contentAsymmetricTriptych,
  [contentQuietFrame.id]: contentQuietFrame,
  [contentSplitBand.id]: contentSplitBand,
  [contentQuoteStage.id]: contentQuoteStage,
  [contentStatement.id]: contentStatement,
  [contentPullQuote.id]: contentPullQuote,
  [contentStatHero.id]: contentStatHero,
  [contentOneEvidence.id]: contentOneEvidence,
  [contentGaugeStats.id]: contentGaugeStats,
  [contentGaugePoint.id]: contentGaugePoint,
  [contentCrayonboxCards.id]: contentCrayonboxCards,
  [contentCrayonboxPoint.id]: contentCrayonboxPoint,
  [contentShowGallery.id]: contentShowGallery,
  [contentShowSpotlight.id]: contentShowSpotlight,
  [contentShowStatement.id]: contentShowStatement,
  [contentShowFigures.id]: contentShowFigures,
  // brief sample redesign (2026-10-02): the board's ordinary content page,
  // evidence page and single-figure page, all theme-locked.
  [contentGaugeSheet.id]: contentGaugeSheet,
  [contentGaugeExhibit.id]: contentGaugeExhibit,
  [contentGaugeFigure.id]: contentGaugeFigure,
  // bulletin sample redesign (2026-10-03): the board's ordinary content page,
  // theme-locked.
  [contentNoticeSheet.id]: contentNoticeSheet,
  // swiss sample redesign (2026-10-03): the board's ordinary content page,
  // its statement page and its single-figure page, theme-locked.
  [contentGridSheet.id]: contentGridSheet,
  [contentGridStatement.id]: contentGridStatement,
  [contentGridFigure.id]: contentGridFigure,
  // ledger sample redesign (2026-10-04): the board's ordinary content page
  // and its single-figure page, theme-locked.
  [contentPanelSheet.id]: contentPanelSheet,
  [contentPanelFigure.id]: contentPanelFigure,
  // vermilion sample redesign (2026-10-04): the board's ordinary content page
  // and its single-figure page, theme-locked.
  [contentSealSheet.id]: contentSealSheet,
  [contentSealFigure.id]: contentSealFigure,
  // terminal sample redesign (2026-10-05): the board's ordinary content page,
  // theme-locked.
  [contentConsoleSheet.id]: contentConsoleSheet,
  // memo sample redesign (2026-10-05): the board's ordinary content page,
  // theme-locked.
  [contentMemoSheet.id]: contentMemoSheet,
  // clinic sample redesign (2026-10-05): the board's ordinary content page,
  // theme-locked.
  [contentDossierSheet.id]: contentDossierSheet,
  // almanac sample redesign (2026-10-05): the board's ordinary content page,
  // theme-locked.
  [contentYearbookSheet.id]: contentYearbookSheet,
  // homeroom sample redesign (2026-10-06): the board's ordinary content page,
  // theme-locked.
  [contentLessonSheet.id]: contentLessonSheet,
  // ember sample redesign (2026-10-06): the board's ordinary content page
  // and its photograph page, theme-locked.
  [contentPitchSheet.id]: contentPitchSheet,
  [contentPitchPhoto.id]: contentPitchPhoto,
  // rally sample redesign (2026-10-06): the board's ordinary content page
  // and its one-line plan, theme-locked.
  [contentMarqueeSheet.id]: contentMarqueeSheet,
  [contentMarqueeStatement.id]: contentMarqueeStatement,
  // proposal theme (2026-10-06): the board's ordinary content page,
  // theme-locked.
  [contentBinderSheet.id]: contentBinderSheet,
  // thesis sample redesign (2026-10-06): the board's ordinary content page,
  // theme-locked.
  [contentManuscriptSheet.id]: contentManuscriptSheet,
  // journal sample redesign (2026-10-07): the board's ordinary content page,
  // theme-locked.
  [contentPeriodicalSheet.id]: contentPeriodicalSheet,
  // journal sample redesign (2026-10-07): the board's quotation page,
  // theme-locked.
  [contentPeriodicalQuote.id]: contentPeriodicalQuote,
  // ink sample redesign (2026-10-07): the board's ordinary content page,
  // theme-locked.
  [contentScrollSheet.id]: contentScrollSheet,
  // ink sample redesign (2026-10-07): the board's quotation page, a passage
  // set upright, theme-locked.
  [contentScrollQuote.id]: contentScrollQuote,
  // crayon sample redesign (2026-10-08): the board's ordinary content page,
  // theme-locked.
  [contentCrayonboxSheet.id]: contentCrayonboxSheet,
  // luxe sample redesign (2026-10-08): the board's ordinary content page,
  // theme-locked.
  [contentInvitationSheet.id]: contentInvitationSheet,
  // runway sample redesign (2026-10-08): the board's ordinary content page,
  // theme-locked.
  [contentLineupSheet.id]: contentLineupSheet,
  // museum sample redesign (2026-10-08): the board's ordinary content page,
  // theme-locked.
  [contentPlacardSheet.id]: contentPlacardSheet,
  // stage sample redesign (2026-10-08): the board's ordinary content page,
  // theme-locked.
  [contentKeynoteSheet.id]: contentKeynoteSheet,
  // lecture sample redesign (2026-10-08): the board's ordinary content page,
  // theme-locked.
  [contentChalkboardSheet.id]: contentChalkboardSheet,
  // bulletin kinds round (2026-10-09): the statement, fact and evidence
  // pages, theme-locked.
  [contentNoticeStatement.id]: contentNoticeStatement,
  [contentNoticeFigure.id]: contentNoticeFigure,
  [contentNoticeExhibit.id]: contentNoticeExhibit,
}

// ─────────────────────────────────────────────────────────────────────────
// Image takeover layouts (4). With the 57 standard content layouts above,
// the content page type has 61 registered entries. These are `slide.layout`
// ids for the page-level
// `image-split`/`image-top`/`image-bottom`/`image-annotate` takeovers
// (full-slide-svg.tsx's splitTakeover branch, keyed off `getLayout(slide.
// layout)?.kind === "takeover"` since W2 task 3 — originally 4 snake_case
// `slide.variant` values): bespoke full-page compositions that intercept
// *before* any layout runs, implemented by src/render/image-pages.tsx.
// `slideTypes` is written as `["content"]`, and task 3's applicability gate
// (api.ts `checkLayoutApplicability`) now enforces it as a validate hard
// error — before that gate existed, these ids were schema-legal on any
// slide type and a cover/chapter slide setting one got silently hijacked
// at render (the confirmed bug the inventory flagged; this registry entry
// used to just state the intended applicability without enforcing it).
// ─────────────────────────────────────────────────────────────────────────
const TAKEOVER_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [imageSplitLayoutDef.id]: imageSplitLayoutDef,
  [imageTopLayoutDef.id]: imageTopLayoutDef,
  [imageBottomLayoutDef.id]: imageBottomLayoutDef,
  [imageAnnotateLayoutDef.id]: imageAnnotateLayoutDef,
}

/** All 202 standard layouts and 4 takeover layouts, 206 entries keyed by id.
 *  `kind` still spells the standard tier `"standard"`, a wire-format fossil. See
 *  {@link LayoutDefinition.kind}. */
export const LAYOUT_REGISTRY: Record<string, LayoutDefinition> = {
  ...COVER_LAYOUT_DEFS,
  ...CHAPTER_LAYOUT_DEFS,
  ...ENDING_LAYOUT_DEFS,
  ...CONTENT_LAYOUT_DEFS,
  ...TAKEOVER_LAYOUT_DEFS,
}

/** Look up a single layout definition by id (layout or takeover). */
export function getLayout(id: string): LayoutDefinition | undefined {
  return LAYOUT_REGISTRY[id]
}

/** Every layout definition (layout or takeover) applicable to a slide type. */
export function layoutsForSlideType(t: SlideType): readonly LayoutDefinition[] {
  return Object.values(LAYOUT_REGISTRY).filter((layout) => layout.slideTypes.includes(t))
}
