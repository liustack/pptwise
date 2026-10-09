/**
 * How a cover, chapter or ending face sets the page's heading, asked without
 * drawing the page.
 *
 * A content face that cannot hold its heading gives the page to the
 * step-aside sheet. A boundary face has no page to give: it either cuts the
 * heading's tail and marks the cut (`data-truncated`), or declines the page
 * (`data-dropped`) so the export refuses the deck. Either way the author
 * learned of it late, after a render, and was never told how long a heading
 * the face takes. validate asks here instead (`checkBoundaryHeadingFit`,
 * `../validate-core.ts`): the face answers with the same fit its drawing
 * runs, so a heading validate passes is one the face sets whole, and one it
 * refuses is one the face would cut or decline.
 *
 * A face answers in one of two ways:
 *
 * - `headingFit` alone (`./registry.ts`): the face sets its heading with
 *   `fitHeadingLines` over exactly those numbers, scaled by the theme's
 *   `typeScale`. That is most faces, and the declaration is the whole answer.
 * - `headingSet`: the face sets its heading some other way (a memo's fit
 *   that breaks on a clause, a tracked line, a box that moves with what else
 *   the page carries), so it hands over that fit itself.
 *
 * `heading-set.test.tsx` holds every answer to the face's real drawing: the
 * longest heading validate passes renders whole, and one step longer is cut
 * or declined.
 */
import type { ComponentCtx } from "../components/types"
import { fitSvgLine } from "../lib/svg-text-layout"
import { isChineseText } from "../lib/text-script"
import { fitEmphasisHeading, stripEmphasis } from "../render/emphasis"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"

/** What a face's heading fit reads off the render context: the deck's fonts, the theme's shape tokens and the deck's figure style. */
export type HeadingCtx = Pick<ComponentCtx, "fonts" | "shape" | "figures">

/** The page a face is asked about: what its drawing is handed, with only the part of the context a heading fit reads. */
export interface HeadingPage extends Pick<SvgTemplateProps, "ir" | "slide" | "index" | "params" | "page"> {
  ctx: HeadingCtx
}

/**
 * How a heading comes out on a face: set whole, set with its tail cut
 * (`data-truncated`), or declined with the page refused at export
 * (`data-dropped`).
 */
export type HeadingVerdict = "whole" | "cut" | "declined"

/** A face's own heading fit, answered as a verdict. Reads the page the way the face's drawing does. */
export type HeadingSet = (page: HeadingPage) => HeadingVerdict

/** The numbers `LayoutDefinition.headingFit` declares. */
export type HeadingFitNumbers = NonNullable<LayoutDefinition["headingFit"]>

/** "cut" for a fitted layout that cut its text, "whole" for one that did not. */
export function cutOrWhole(layout: { truncated: boolean }): HeadingVerdict {
  return layout.truncated ? "cut" : "whole"
}

/**
 * The verdict of `fitHeadingLines` over `fit` for `text`. `scaled: false` for
 * a face that sets its heading at its own size whatever the theme's
 * `typeScale` says.
 */
export function fitVerdict(text: string | undefined, fit: HeadingFitNumbers, ctx: HeadingCtx, scaled = true): HeadingVerdict {
  return cutOrWhole(fitEmphasisHeading(text, { ...fit, fontFamily: ctx.fonts.heading, ...(scaled ? { typeScale: ctx.shape?.typeScale } : {}) }))
}

/**
 * The verdict of `fitSvgLine` over `line` in the heading face, for a face that
 * sets its heading on one line, shrinking it to `minFontSize` before it cuts.
 */
export function lineVerdict(text: string, line: { maxWidth: number; fontSize: number; minFontSize: number; bold?: boolean }, ctx: HeadingCtx): HeadingVerdict {
  return cutOrWhole(fitSvgLine(text, { ...line, fontFamily: ctx.fonts.heading }))
}

/**
 * How `layout` sets the page's heading, or undefined when the face declares
 * neither a fit nor a set.
 */
export function headingVerdict(layout: LayoutDefinition, page: HeadingPage): HeadingVerdict | undefined {
  if (layout.headingSet) return layout.headingSet(page)
  if (layout.headingFit) return fitVerdict(page.slide.heading, layout.headingFit, page.ctx)
  return undefined
}

/**
 * Plain headings validate lengthens to find how much a face holds: one in
 * Chinese with no punctuation to break on, one in English of ordinary words.
 * What a face holds of these is what `headingRoom` reports.
 */
const ROOM_ZH = Array.from(
  "同店增速回到正区间而且这一次不是靠促销拉起来的是复购率和客单价一起抬上来的结果我们建议把明年的第一目标定为同店增长并为此调整门店考核与新品节奏试点覆盖华东三个区域共四十二家门店再往后看还要把会员体系和供应链一起改造",
)
const ROOM_EN =
  "Same store growth is back above zero and this time it came from repeat visits and ticket size rather than discounts so we propose making same store growth the first target for next year and changing how stores are measured across every region we serve".split(
    " ",
  )

/** How long a heading the face sets whole on this page, and how long this one is, in the heading's own script. */
export interface HeadingRoom {
  /** The longest plain heading in this script the face sets whole. */
  limit: number
  /** This page's heading, counted the same way. */
  count: number
  /** What `limit` and `count` count: "Chinese characters" or "words". */
  unit: string
}

/**
 * How long a heading `layout` sets whole on `slide`, counted in the script
 * the heading is written in: Chinese characters for a Chinese heading,
 * words for any other. Found by lengthening a plain heading one step at a
 * time on this same page until the face stops setting it whole.
 */
export function headingRoom(layout: LayoutDefinition, page: HeadingPage): HeadingRoom {
  const plain = stripEmphasis(page.slide.heading ?? "").trim()
  const chinese = isChineseText(plain)
  const units = chinese ? ROOM_ZH : ROOM_EN
  const text = (n: number) => (chinese ? units.slice(0, n).join("") : units.slice(0, n).join(" "))
  let limit = 0
  for (let n = 1; n <= units.length; n++) {
    if (headingVerdict(layout, withHeading(page, text(n))) !== "whole") break
    limit = n
  }
  const count = chinese ? Array.from(plain.replace(/\s+/g, "")).length : plain.split(/\s+/).filter(Boolean).length
  return { limit, count, unit: chinese ? "Chinese characters" : "words" }
}

/** `page` with its slide's heading replaced, in the deck as well as on the page. */
export function withHeading(page: HeadingPage, heading: string): HeadingPage {
  const slide = { ...page.slide, heading }
  return { ...page, slide, ir: { ...page.ir, slides: page.ir.slides.map((s, i) => (i === page.index ? slide : s)) } }
}
