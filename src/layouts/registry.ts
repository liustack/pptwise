/**
 * Layout registry (W2 task 1, spec §3/§6/§8): an explicit, statically-checked
 * description of what the render chain's 105 standard layouts and 2
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
 *    type (`image`, `bullets`) — used only by the takeover layouts, which
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
import type { Component } from "@/ir"
import type { STRATEGY_VALUES } from "@/ir/narrative-values"
import type { HeadingSet } from "./heading-set"
import type { CompositionId, CompositionSetting } from "./compositions/shared"
import type { FaceParams } from "./face-params"
import type { ComponentCtx } from "../components/types"

// layoutDef imports (src domain reorg wave 1, task T1d): 113 layout files
// (one `layoutDef` each) plus image-pages.tsx's 2 uniquely named takeover
// exports, 115 bindings total. The original migration covered 33 layout
// files and 4 takeovers. Later content expansion and theme redesign waves
// grew the registry, and the faces no built-in theme menu used were deleted.
// Grouped by family, each group in the exact
// order its former literal Record held (order feeds `layoutsForSlideType`'s
// `Object.values` walk below). `weightedPickBySeed` layout lottery is
// historical. Aliased to a
// family-prefixed camelCase name (mirrors each file's own name) since 105
// files all export the same bare `layoutDef`.
import { layoutDef as coverInstitutionalBlock } from "./cover-institutional-block"
import { layoutDef as coverIkbFieldCover } from "./cover-ikb-field-cover"
import { layoutDef as coverStatCover } from "./cover-stat-cover"
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
import { layoutDef as coverPortraitCover } from "./cover-portrait-cover"
import { layoutDef as coverAccountCover } from "./cover-account-cover"
import { layoutDef as coverGaugeVerdict } from "./cover-gauge-verdict"

import { layoutDef as chapterBlockNumeralChapter } from "./chapter-block-numeral-chapter"
import { layoutDef as chapterGhostSectionChapter } from "./chapter-ghost-section-chapter"
import { layoutDef as chapterFascicleGhostChapter } from "./chapter-fascicle-ghost-chapter"
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
import { layoutDef as chapterPortraitChapter } from "./chapter-portrait-chapter"
import { layoutDef as chapterAccountChapter } from "./chapter-account-chapter"
import { layoutDef as chapterFieldBandChapter } from "./chapter-field-band-chapter"
import { layoutDef as chapterSubjectRuleChapter } from "./chapter-subject-rule-chapter"
import { layoutDef as chapterDecimalIndexChapter } from "./chapter-decimal-index-chapter"
import { layoutDef as chapterIssueLineChapter } from "./chapter-issue-line-chapter"
import { layoutDef as chapterGaugeSection } from "./chapter-gauge-section"

import { layoutDef as endingSignoffEnding } from "./ending-signoff-ending"
import { layoutDef as endingCloseWordEnding } from "./ending-close-word-ending"
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
import { layoutDef as endingPortraitEnding } from "./ending-portrait-ending"
import { layoutDef as endingAccountEnding } from "./ending-account-ending"
import { layoutDef as endingResolutionEnding } from "./ending-resolution-ending"
import { layoutDef as endingGaugeNext } from "./ending-gauge-next"

import { layoutDef as contentStatement } from "./content-statement"
import { layoutDef as contentPullQuote } from "./content-pull-quote"
import { layoutDef as contentStatHero } from "./content-stat-hero"
import { layoutDef as contentGaugePoint } from "./content-gauge-point"
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
import { layoutDef as contentPortraitSheet } from "./content-portrait-sheet"
import { layoutDef as contentAccountSheet } from "./content-account-sheet"
import { layoutDef as contentSealFigure } from "./content-seal-figure"

import {
  imageSplitLayoutDef,
  imageTopLayoutDef,
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
  /**
   * The fewest items *inside* one accepted component this slot draws: a
   * ticker of at least two figures, a line-up of at least three looks. The
   * IR schema lets some of those blocks hold fewer, and the face used to
   * leave such a block off with a mark that only the export read.
   * `checkBoundaryItemCapacity` refuses a block with fewer, naming the
   * floor. The face's own drawing reads the same number.
   *
   * `undefined` means the slot draws as few as the schema allows.
   */
  itemMinimum?: number
  /**
   * What the face needs of an accepted block beyond its type and its count,
   * said to the author: a year scale whose every date is a year. Returns
   * why the face would leave `block` (or part of it) off, or undefined when
   * it draws it whole. The face's drawing asks the same function, and
   * `checkBoundaryBlockShape` refuses the page with the reason.
   */
  declines?: (block: Component) => string | undefined
  /**
   * The face sets the page's heading in this slot's first item row when the
   * page carries a `bullets` block, the way it sets a heading written as the
   * list itself, so a page with both has one row fewer for its items.
   * `slotItemRoom` (`./boundary-content.ts`) is the count the face draws and
   * validate holds a page to.
   */
  headingRow?: true
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
}

/** The signature drawings a content face offers (`LayoutDefinition.compositions`). */
export interface FaceCompositions {
  setting: CompositionSetting
  offer: readonly CompositionId[]
  subheading?: "declines"
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
   * - `{ x, y }`: the shared mark's baseline start on this face, when the
   *   default top-left spot would sit on the face's own furniture (a frame
   *   line, a band).
   *
   * Omitted, the shared mark takes the default top-left spot.
   */
  coverMark?: "face" | CoverMarkAnchor
  /**
   * The colour this cover face paints under the shared top-left mark: at its
   * own `coverMark` spot, or at the default corner, which a legal
   * classification takes on every face. The mark's ink is measured against
   * it (`CoverMark`, `render/footer.tsx`). Read from the face's own inks, the
   * same call its drawing makes, so it is what is really there on any page:
   * a stage, a board shaded from the primary, a full-bleed primary field. A
   * page painted a colour of the author's own changes the page's ground and
   * not the face's own bands, and a mark measured against the page stood on
   * the band at 1.14:1. Omitted, the face paints nothing there and the mark
   * stands on the page's own ground.
   */
  coverMarkGround?: (ctx: ComponentCtx) => string
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
   * - `{ none, beside: "bullets" }`: the face has no place for a
   *   subheading on a page that carries bullets, whose list moves the
   *   words the subheading would take into the heading. validate refuses
   *   one there.
   */
  subheading?: "in-body" | { none: string; beside?: "bullets" }
  /**
   * The theme's signature drawings this content face offers its body
   * (`compositions/`), in the setting it sets them in, or a function of the
   * menu entry's params for a face whose params decide. `offer` is the list
   * the face hands `compose`. `subheading: "declines"` says a page with a
   * subheading is set by the ordinary renderer instead, as the face's own
   * code does. `pptwise inspect` prints the recipes of what it offers, and
   * `pptwise build` checks each page against them (`./signature.ts`).
   */
  compositions?: FaceCompositions | ((params: FaceParams) => FaceCompositions | undefined)
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
   * On a cover, chapter or ending face the declaration is also what validate
   * reads to refuse a heading the face would cut (`./heading-set.ts`): a
   * face that declares it sets its heading with `fitHeadingLines` over these
   * numbers, scaled by the theme's `typeScale`. A boundary face that sets its
   * heading any other way declares `headingSet` as well.
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
  /**
   * A cover, chapter or ending face's own heading fit, for a face that does
   * not set its heading with `fitHeadingLines` over `headingFit` alone: a
   * memo's clause-breaking fit, a tracked or vertical title, a title box
   * that moves with what else the page carries. It reads the page the way the
   * face's drawing does and says whether the heading comes out whole, cut or
   * declined. validate refuses a page whose heading would not come out whole
   * (`./heading-set.ts`).
   */
  headingSet?: HeadingSet
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
  // Theme-redesign wave (2026-08-18, cover pool 8 -> 9): appended at the end
  // of the cover group, same position discipline every earlier pool growth
  // used (image-lead-split / split-band / quote-stage each landed last in
  // their own family). Key insertion order used to feed a `weightedPickBySeed`
  // lottery. That lottery is historical. New members still go on the end.
  // Board-cover-fidelity wave (2026-08-22, cover pool 9 -> 13): appended at
  // the end of the cover group. Key insertion order used to feed a
  // `weightedPickBySeed` lottery. That lottery is historical. New members
  // still go on the end.
  [coverInstitutionalBlock.id]: coverInstitutionalBlock,
  // Board-cover-restore wave 1 (2026-08-22, cover pool 13 -> 19): appended
  // at the end of the cover group. Key insertion order used to feed a
  // `weightedPickBySeed` lottery. That lottery is historical. New members
  // still go on the end.
  [coverIkbFieldCover.id]: coverIkbFieldCover,
  [coverStatCover.id]: coverStatCover,
  // Wave 8 batch 3 (2026-08-23): luxe / runway / vermilion / almanac / clinic / arena board locks.
  [coverRedHeadCover.id]: coverRedHeadCover,
  [coverGaugeVerdict.id]: coverGaugeVerdict,
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
  // profile theme (2026-10-12).
  [coverPortraitCover.id]: coverPortraitCover,
  // recap theme (2026-10-13).
  [coverAccountCover.id]: coverAccountCover,
}

// ─────────────────────────────────────────────────────────────────────────
// Chapter layouts (37 total: 8 auto-selectable and 29 pin-only).
// The original eight carry a chapter-number `watermark`. Later theme-specific
// faces may express the ordinal through a different named slot.
// Chapter layouts do not read components, so none has a body slot.
// ─────────────────────────────────────────────────────────────────────────
const CHAPTER_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [chapterBlockNumeralChapter.id]: chapterBlockNumeralChapter,
  [chapterGhostSectionChapter.id]: chapterGhostSectionChapter,
  [chapterFascicleGhostChapter.id]: chapterFascicleGhostChapter,
  [chapterSealNumeralChapter.id]: chapterSealNumeralChapter,
  [chapterFieldBandChapter.id]: chapterFieldBandChapter,
  [chapterSubjectRuleChapter.id]: chapterSubjectRuleChapter,
  [chapterDecimalIndexChapter.id]: chapterDecimalIndexChapter,
  [chapterIssueLineChapter.id]: chapterIssueLineChapter,
  [chapterGaugeSection.id]: chapterGaugeSection,
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
  // profile theme (2026-10-12): the next part of the talk on white paper.
  [chapterPortraitChapter.id]: chapterPortraitChapter,
  // recap theme (2026-10-13): the part's number, title and what it covers.
  [chapterAccountChapter.id]: chapterAccountChapter,
}

// ─────────────────────────────────────────────────────────────────────────
// Ending layouts (35 total: 7 auto-selectable and 28 pin-only).
// Sixteen endings declare a body slot for their own constrained closing-page
// content. The other 19 have no body slot.
// ─────────────────────────────────────────────────────────────────────────
const ENDING_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [endingSignoffEnding.id]: endingSignoffEnding,
  [endingCloseWordEnding.id]: endingCloseWordEnding,
  [endingDeliberationEnding.id]: endingDeliberationEnding,
  [endingResolutionEnding.id]: endingResolutionEnding,
  [endingGaugeNext.id]: endingGaugeNext,
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
  // profile theme (2026-10-12): the closing promise and the speaker's card.
  [endingPortraitEnding.id]: endingPortraitEnding,
  // recap theme (2026-10-13): the commitment and the decisions to tick.
  [endingAccountEnding.id]: endingAccountEnding,
}

// ─────────────────────────────────────────────────────────────────────────
// Content standard layouts (39 total). The only family that reads
// `slide.components`, so every entry carries a `body` slot plus its own
// heading band, and declares `arrangements` (inventory decision #2: layouts
// that don't obey the author's arrangement still truthfully declare which
// arrangement(s) they honor, behavior unchanged).
//
// `body` slot `capacity` is declarative authoring-time metadata, consumed by
// the validate-layer `min(pacing editorial budget, layout capacity)` quality
// gate (ir-quality.ts via layout-selection.ts). The ordinary single-stack
// number is 4, the former `CAPACITY.maxBlocksPerSlide` (deleted in W3, the
// editorial side now lives in PACING_BUDGETS): audit/capacity.ts's flat,
// theme-independent default (`floor(minRectH / perBlock)`). A layout whose
// body region differs from the audited single-stack one measures its own
// number and says so in its own header, so any other capacity is a measured
// contract, never a guess. A single-figure face whose body is one figure
// declares 1.
//
// This note is what every content layout's own body-slot capacity comment
// means by "see registry.ts's CONTENT_LAYOUT_DEFS header for the
// derivation" (src domain reorg wave 1, task T1d).
// ─────────────────────────────────────────────────────────────────────────
const CONTENT_LAYOUT_DEFS: Record<string, LayoutDefinition> = {
  [contentStatement.id]: contentStatement,
  [contentPullQuote.id]: contentPullQuote,
  [contentStatHero.id]: contentStatHero,
  [contentGaugePoint.id]: contentGaugePoint,
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
  // profile theme (2026-10-12): the board's ordinary content page,
  // theme-locked.
  [contentPortraitSheet.id]: contentPortraitSheet,
  // recap theme (2026-10-13): the board's ordinary content page,
  // theme-locked.
  [contentAccountSheet.id]: contentAccountSheet,
}

// ─────────────────────────────────────────────────────────────────────────
// Image takeover layouts (2). With the 41 standard content layouts above,
// the content page type has 43 registered entries. These are `slide.layout`
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
}

/** All 113 standard layouts and 2 takeover layouts, 115 entries keyed by id.
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
