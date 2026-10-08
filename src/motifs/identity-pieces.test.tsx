// @vitest-environment jsdom
/**
 * Three-tier decor roles. Structure is page chrome (foreground). Identity
 * is a midground mark whose color is the theme. Everything else recedes.
 */
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { resolveStyle } from "../themes"
import { MOTIFS } from "./index"
import type { MotifId } from "./types"
import {
  DECOR_ROLE_ATTR,
  IDENTITY_ATTR,
  isIdentityPaint,
  isStructurePaint,
  skipsMidgroundCeiling,
} from "./decor-budget"

const TYPES: Slide["type"][] = ["cover", "chapter", "content", "ending"]

/** Adjudicated structure pieces. Lifted into the foreground at the theme color. */
const STRUCTURE_BY_MOTIF: Partial<Record<MotifId, Partial<Record<Slide["type"], readonly string[]>>>> = {
  "gauge-motif": {
    cover: ["locator-corner"],
    chapter: ["locator-corner"],
    content: ["locator-corner"],
    ending: ["locator-corner"],
  },
  "swiss-motif": {
    cover: ["red-bar"],
    chapter: ["red-bar"],
    content: ["red-bar"],
    ending: ["red-bar"],
  },
  "memo-motif": { chapter: ["masthead"], content: ["masthead"], ending: ["masthead"] },
  // clinic's short heartbeat heads every page but the cover, which sets its
  // own across the page (2026-10 sample redesign). The folio joins it on a
  // content page of a deck that asks for one.
  "clinic-motif": { chapter: ["pulse"], content: ["pulse"], ending: ["pulse"] },
  // almanac's sprout heads every content page beside its section (2026-10
  // sample redesign); the cover and the close set their own, and the olive
  // chapter would hide it. The folio joins it on a content page of a deck
  // that asks for one.
  "almanac-motif": { content: ["sprout"] },
  // luxe's card stock frames every content page (2026-10 sample redesign);
  // the hallmark joins it on a deck that asks for footer marks. The v1 gilt
  // frame stays for a cover or an ending face that leaves it room.
  "luxe-motif": { cover: ["invitation"], content: ["stock"], ending: ["invitation"] },
  "vermilion-motif": { cover: ["gold-rules-foot"], content: ["gold-rules"], ending: ["gold-rules", "gold-rules-foot"] },
  // journal's masthead words and folio stand on a content page of a deck that
  // asks for footer marks (2026-10 sample redesign); the cover and the close
  // set their own, and the chapter page keeps clear.
  "corner-ornament-motif": { content: ["folio", "masthead"] },
  "folio-motif": { content: ["folio"] },
  // ink's scroll edges hang down every content page (2026-10 sample
  // redesign); the hall and the folio join them on a deck that asks for
  // footer marks, and the cover, the chapter and the close draw their own.
  "ink-motif": { content: ["edges"] },
  // runway's running order heads every content page (2026-10 sample
  // redesign): words and one hairline, structure rather than decoration. The
  // cover, the chapter pages and the bow set their own.
  "runway-motif": { content: ["masthead"] },
  "museum-motif": { content: ["hall"] },
  "stage-motif": { content: ["clicker"] },
  // lecture's blackboard frames every page in wood with its chalk ledge (2026-10
  // sample redesign): the board itself, photograph pages too.
  "lecture-motif": { cover: ["board"], chapter: ["board"], content: ["board"], ending: ["board"] },
  // ledger's status bar runs across the top of every page, like a market
  // terminal's title row (2026-10 sample redesign).
  "poster-motif": {
    cover: ["status-bar"],
    chapter: ["status-bar"],
    content: ["status-bar"],
    ending: ["status-bar"],
  },
}

/** Adjudicated identity pieces. Midground, original color, no intensity cap. */
const IDENTITY_BY_MOTIF: Partial<Record<MotifId, Partial<Record<Slide["type"], readonly string[]>>>> = {
  "crayonbox-motif": { content: ["crayonbox-stars", "crayonbox-sun"] },
  // bulletin's square steps are its mark, in the same blue as the bar under
  // every heading, so they keep their full colour on every page (2026-10
  // sample redesign).
  "bulletin-motif": { cover: ["ikb-steps"], chapter: ["ikb-steps"], content: ["ikb-steps"], ending: ["ikb-steps"] },
  // rally's confetti is thrown in the palette's four colours, which the
  // charts share, so it keeps its colour on every content page (2026-10
  // sample redesign). The cover, the sections and the close throw their own.
  "rally-motif": { content: ["confetti"] },
}

function slideOf(type: Slide["type"]): Slide {
  return { type, heading: "Heading", components: [] } as Slide
}

/**
 * A motif that is the deck's own footer (`folio-motif`, and journal's
 * masthead words and folio, `corner-ornament-motif`) only paints on a
 * content page of a deck that asks for footer marks, so the roster renders
 * it under `branding: "full"`, which still stands for the organization and
 * the confidentiality mark. Every other motif keeps the omitted posture.
 */
const FULL_BRANDING_MOTIFS: ReadonlySet<MotifId> = new Set(["folio-motif", "corner-ornament-motif"])

function irOf(theme: string, slide: Slide, motif?: MotifId): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    ...(motif && FULL_BRANDING_MOTIFS.has(motif) ? { branding: "full" } : {}),
    theme: { id: theme },
    meta: { date: "2026-07-15", organization: "CloudSeek" },
    assets: { images: {} },
    slides: [slide],
  } as unknown as PptxIR
}

function themeForMotif(id: MotifId): string {
  const map: Partial<Record<MotifId, string>> = {
    "ink-motif": "ink",
    "swiss-motif": "swiss",
    "luxe-motif": "luxe",
    "runway-motif": "runway",
    "museum-motif": "museum",
    "stage-motif": "stage",
    "vermilion-motif": "vermilion",
    "memo-motif": "memo",
    "clinic-motif": "clinic",
    "almanac-motif": "almanac",
    "corner-ornament-motif": "journal",
    "poster-motif": "ledger",
  }
  return map[id] ?? "brief"
}

function draw(id: MotifId, type: Slide["type"]) {
  const theme = themeForMotif(id)
  const tokens = resolveStyle(theme)
  const slide = slideOf(type)
  const defaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, defaultBg)
  const Motif = MOTIFS[id]
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <Motif ir={irOf(theme, slide, id)} slide={slide} ctx={ctx} />
    </svg>,
  )
  return parseSvgRoot(markup)
}

function pieceIds(root: Element, role: "structure" | "identity"): string[] {
  return Array.from(root.querySelectorAll(`[${DECOR_ROLE_ATTR}="${role}"]`))
    .map((el) => el.getAttribute("data-decor-piece") ?? el.tagName.toLowerCase())
    .sort()
}

function expectRoster(
  table: Partial<Record<MotifId, Partial<Record<Slide["type"], readonly string[]>>>>,
  role: "structure" | "identity",
) {
  const extra: string[] = []
  const missing: string[] = []
  for (const id of Object.keys(MOTIFS) as MotifId[]) {
    for (const type of TYPES) {
      const got = pieceIds(draw(id, type), role)
      const expected = [...(table[id]?.[type] ?? [])].sort()
      if (got.join() !== expected.join()) {
        const key = `${id} ${type}`
        if (got.length > expected.length) extra.push(`${key}: ${got.join(",") || "(none)"}`)
        else missing.push(`${key}: got ${got.join(",") || "(none)"}, want ${expected.join(",") || "(none)"}`)
      }
    }
  }
  expect(missing, missing.join(" | ")).toEqual([])
  expect(extra, extra.join(" | ")).toEqual([])
}

describe("decor piece role roster", () => {
  it("only the adjudicated structure pieces carry data-decor-role=structure", () => {
    expectRoster(STRUCTURE_BY_MOTIF, "structure")
  })

  it("only the adjudicated identity pieces carry data-decor-role=identity", () => {
    expectRoster(IDENTITY_BY_MOTIF, "identity")
  })

  it("structure pieces do not also carry data-identity", () => {
    for (const id of Object.keys(STRUCTURE_BY_MOTIF) as MotifId[]) {
      for (const type of TYPES) {
        const root = draw(id, type)
        for (const el of Array.from(root.querySelectorAll(`[${DECOR_ROLE_ATTR}="structure"]`))) {
          expect(el.getAttribute(IDENTITY_ATTR), `${id} ${type}`).toBeNull()
        }
      }
    }
  })

  it("identity pieces keep data-identity for the midground skip", () => {
    const root = draw("bulletin-motif", "content")
    const steps = root.querySelector('[data-decor-piece="ikb-steps"]')!
    expect(steps.getAttribute(DECOR_ROLE_ATTR)).toBe("identity")
    expect(steps.getAttribute(IDENTITY_ATTR)).toBe("true")
  })

  it("ledger's status bar is page chrome, on every page, and nothing else is", () => {
    for (const type of TYPES) {
      const root = draw("poster-motif", type)
      expect(pieceIds(root, "structure"), type).toEqual(["status-bar"])
      expect(pieceIds(root, "identity"), type).toEqual([])
      expect(root.querySelector('[data-decor-piece="baseline"]')).toBeNull()
    }
  })

  it("isIdentityPaint follows the nearest identity ancestor, not structure", () => {
    const root = parseSvgRoot(
      renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
          <g data-identity="true">
            <rect data-probe="in" x={0} y={0} width={10} height={10} fill="#C3272B" />
          </g>
          <g data-decor-role="structure">
            <rect data-probe="chrome" x={20} y={0} width={10} height={10} fill="#D7282F" />
          </g>
          <rect data-probe="out" x={40} y={0} width={10} height={10} fill="#C3272B" />
        </svg>,
      ),
    )
    expect(isIdentityPaint(root.querySelector('[data-probe="in"]')!)).toBe(true)
    expect(isIdentityPaint(root.querySelector('[data-probe="chrome"]')!)).toBe(false)
    expect(isStructurePaint(root.querySelector('[data-probe="chrome"]')!)).toBe(true)
    expect(skipsMidgroundCeiling(root.querySelector('[data-probe="chrome"]')!)).toBe(true)
    expect(isIdentityPaint(root.querySelector('[data-probe="out"]')!)).toBe(false)
    expect(skipsMidgroundCeiling(root.querySelector('[data-probe="out"]')!)).toBe(false)
  })
})
