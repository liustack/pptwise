/**
 * What a deck's footer prints, resolved once from the IR, and where each
 * piece of the content-page row sits.
 *
 * This module decides text and geometry only. It draws nothing (the SVG lives
 * in `./footer.tsx`) and imports nothing from the render tree, so validation
 * can ask the same question the renderer asks (does the row the author
 * wrote fit on one line?) without pulling React or the layout registry in.
 *
 * The rules themselves are documented on the schema (`ir/footer.ts`). In
 * short: no `footer`, no marks, except that `branding: "full"` keeps the
 * footer it always drew. Every text is the author's or `meta`'s own.
 */
import type { Footer, Meta, PptxIR } from "@/ir"
import { confidentialityLabel, deckWritesChinese } from "../lib/conf-labels"
import { measureTextUnits } from "../lib/svg-text-layout"
import { FOOTER_DIVIDER_Y } from "./branding-geometry"

/** The marks a deck prints, with every text already resolved. */
export interface DeckFooter {
  pageNumber: boolean
  organization: string | null
  label: string | null
  notice: string | null
  draft: string | null
  /** The confidentiality mark and where it goes. `"footer"` also covers the cover. */
  confidentiality: { text: string; placement: "footer" | "cover" } | null
  /** A legal classification, printed on the cover only, top left. */
  classification: string | null
}

/** A deck, or a page, that prints no footer marks at all. */
export const NO_FOOTER_MARKS: DeckFooter = {
  pageNumber: false,
  organization: null,
  label: null,
  notice: null,
  draft: null,
  confidentiality: null,
  classification: null,
}

/**
 * What `branding: "full"` without a `footer` has always meant for the
 * content-page row: the organization and the confidentiality mark, for
 * whichever of the two the deck's `meta` carries. The version and the date
 * it used to repeat on every page stay on the cover and ending meta rows,
 * where `"full"` still paints them. Real decks almost never repeat either on
 * every page.
 */
function legacyFullFooter(meta: Meta): Footer {
  return {
    ...(meta.organization?.trim() ? { organization: true } : {}),
    ...(meta.confidentiality && meta.confidentiality !== "public" && !meta.classification?.trim()
      ? { confidentiality: "footer" as const }
      : {}),
  }
}

function trimmed(text: string | undefined): string | null {
  const value = text?.trim()
  return value ? value : null
}

/** Resolve the deck's footer marks. Pure: the same IR always gives the same marks. */
export function resolveDeckFooter(ir: Pick<PptxIR, "footer" | "branding" | "meta" | "slides">): DeckFooter {
  const { meta } = ir
  const footer = ir.footer ?? (ir.branding === "full" ? legacyFullFooter(meta) : {})
  const level = meta.confidentiality
  const confText =
    footer.confidentiality && level ? confidentialityLabel(level, deckWritesChinese(ir)) : null
  return {
    pageNumber: footer.page_number === true,
    organization: footer.organization ? trimmed(meta.organization) : null,
    label: trimmed(footer.label),
    notice: trimmed(footer.notice),
    draft: trimmed(footer.draft),
    confidentiality: confText && footer.confidentiality ? { text: confText, placement: footer.confidentiality } : null,
    classification: trimmed(meta.classification),
  }
}

/** The confidentiality words due on the cover, or null. Both placements put the mark on the cover. */
export function coverConfidentialityText(footer: DeckFooter): string | null {
  if (footer.classification) return null
  return footer.confidentiality?.text ?? null
}

// ── The content-page row ──────────────────────────────────────────────────
//
// One quiet line along the bottom of a content page, aligned with the type
// area most faces use (x96 to x1184). Left: organization, label, notice.
// Right: draft mark and confidentiality, then the page number in the corner.
// 16px is the meta floor (12pt, PowerPoint's own footer size), drawn in the
// meta ink tier. A hairline above it at the footer divider separates it from
// the page, and only when the row carries words: a lone page number needs no
// rule over it.

export const FOOTER_X1 = 96
export const FOOTER_X2 = 1184
export const FOOTER_RULE_Y = FOOTER_DIVIDER_Y
/** Baseline of the row. A 16px line in a 24px box starting at y676. */
export const FOOTER_BASELINE = 694
export const FOOTER_FONT_SIZE = 16
/** Between the left and right groups, and between the right group and the page number. */
const GROUP_GAP = 32
const NUMBER_GAP = 24
const SEPARATOR = " · "

export interface FooterRowItems {
  left: string | null
  right: string | null
  pageNumber: boolean
}

/** The row's text groups. `omitOrganization` is set when the theme's motif prints the organization elsewhere on the page. */
export function footerRowItems(footer: DeckFooter, opts: { omitOrganization?: boolean } = {}): FooterRowItems {
  const left = [opts.omitOrganization ? null : footer.organization, footer.label, footer.notice]
    .filter((text): text is string => text !== null)
    .join(SEPARATOR)
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null]
    .filter((text): text is string => text !== null)
    .join(SEPARATOR)
  return { left: left || null, right: right || null, pageNumber: footer.pageNumber }
}

/** True when a content page carries a footer row at all. */
export function footerRowWanted(items: FooterRowItems): boolean {
  return items.left !== null || items.right !== null || items.pageNumber
}

/** True when the row carries words, which is when it earns its rule. */
export function footerRowHasText(items: FooterRowItems): boolean {
  return items.left !== null || items.right !== null
}

function widthPx(text: string, fontFamily: string | undefined): number {
  return measureTextUnits(text, { fontFamily }) * FOOTER_FONT_SIZE
}

export interface FooterRowLayout {
  left: { text: string; x: number; maxWidth: number } | null
  right: { text: string; x: number; maxWidth: number } | null
  pageNumber: { text: string; x: number } | null
}

/**
 * Place the row for the page at `pageIndex` in a deck of `pageCount` pages.
 * The page number keeps room for the deck's widest number, so the right
 * group does not move when PowerPoint renumbers a page from 9 to 10.
 */
export function footerRowLayout(
  items: FooterRowItems,
  pageIndex: number,
  pageCount: number,
  fontFamily: string | undefined,
): FooterRowLayout {
  const numberRoom = items.pageNumber ? widthPx(String(Math.max(pageCount, pageIndex + 1)), fontFamily) + NUMBER_GAP : 0
  const rightX = FOOTER_X2 - numberRoom
  const rightWidth = items.right ? widthPx(items.right, fontFamily) : 0
  const leftMax = rightX - FOOTER_X1 - (items.right ? rightWidth + GROUP_GAP : 0)
  return {
    left: items.left ? { text: items.left, x: FOOTER_X1, maxWidth: leftMax } : null,
    right: items.right ? { text: items.right, x: rightX, maxWidth: rightX - FOOTER_X1 } : null,
    pageNumber: items.pageNumber ? { text: String(pageIndex + 1), x: FOOTER_X2 } : null,
  }
}

/**
 * Validation's half of the row: the words an author asked for must fit on
 * one line at the footer's size. A footer never trims an author's own text
 * to make room, so a row that does not fit is an error to fix at the source
 * (a shorter label or notice), not a line cut short on the page.
 *
 * Only a written `footer` is held to it. A deck that relies on the older
 * reading of `branding: "full"` validated before footers were checked, and
 * keeps validating: its row is fitted at render time and marked
 * `data-truncated` in the rare case an organization name is too long.
 */
export function footerFitIssues(
  ir: Pick<PptxIR, "footer" | "branding" | "meta" | "slides">,
  fontFamily?: string,
): { path: string; message: string }[] {
  if (ir.footer === undefined) return []
  const footer = resolveDeckFooter(ir)
  const items = footerRowItems(footer)
  if (!footerRowHasText(items)) return []
  const pageCount = ir.slides.length
  const layout = footerRowLayout(items, Math.max(0, pageCount - 1), pageCount, fontFamily)
  const leftWidth = layout.left ? widthPx(layout.left.text, fontFamily) : 0
  if (layout.left && leftWidth > layout.left.maxWidth) {
    const parts = [
      footer.organization ? "meta.organization" : null,
      footer.label ? "footer.label" : null,
      footer.notice ? "footer.notice" : null,
    ].filter(Boolean)
    return [
      {
        path: ir.footer?.label ? "footer.label" : ir.footer?.notice ? "footer.notice" : "footer",
        message: `the footer line (${parts.join(" + ")}) is about ${Math.ceil(leftWidth)}px wide and the page has room for ${Math.floor(layout.left.maxWidth)}px at the bottom. Shorten footer.label or footer.notice`,
      },
    ]
  }
  if (layout.right && widthPx(layout.right.text, fontFamily) > layout.right.maxWidth) {
    return [
      {
        path: "footer.draft",
        message: "the footer's draft and confidentiality marks do not fit on one line at the bottom of the page. Shorten footer.draft",
      },
    ]
  }
  return []
}
