// @vitest-environment jsdom
/**
 * Three-tier decor roles. Structure is page chrome (foreground). Identity
 * is a midground mark whose color is the theme. Everything else recedes.
 */
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { resolveStyle } from "../../themes"
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
  "swiss-motif": {
    cover: ["red-bar"],
    chapter: ["red-bar"],
    content: ["red-bar"],
    ending: ["red-bar"],
  },
  "memo-motif": { chapter: ["masthead"], content: ["masthead"], ending: ["masthead"] },
  "luxe-motif": { cover: ["invitation"], ending: ["invitation"] },
  "vermilion-motif": { content: ["gold-rules"], ending: ["gold-rules"] },
  "corner-ornament-motif": { content: ["masthead"], ending: ["masthead"] },
}

/** Adjudicated identity pieces. Midground, original color, no intensity cap. */
const IDENTITY_BY_MOTIF: Partial<Record<MotifId, Partial<Record<Slide["type"], readonly string[]>>>> = {
  "ink-motif": { content: ["seal"] },
  "pulse-motif": { cover: ["heartbeat"] },
}

function slideOf(type: Slide["type"]): Slide {
  return { type, heading: "Heading", components: [] } as Slide
}

function irOf(theme: string, slide: Slide): PptxIR {
  return {
    version: "4",
    filename: "x.pptx",
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
    "vermilion-motif": "vermilion",
    "memo-motif": "memo",
    "heritage-motif": "heritage",
    "playbill-motif": "playbill",
    "arena-motif": "arena",
    "pulse-motif": "pulse",
    "corner-ornament-motif": "journal",
    "poster-motif": "insight",
  }
  return map[id] ?? "consulting"
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
      <Motif ir={irOf(theme, slide)} slide={slide} ctx={ctx} />
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
    const root = draw("ink-motif", "content")
    const seal = root.querySelector('[data-decor-piece="seal"]')!
    expect(seal.getAttribute(DECOR_ROLE_ATTR)).toBe("identity")
    expect(seal.getAttribute(IDENTITY_ATTR)).toBe("true")
  })

  it("heritage, playbill, and arena motifs mark neither structure nor identity", () => {
    for (const id of ["heritage-motif", "playbill-motif", "arena-motif"] as const) {
      for (const type of TYPES) {
        expect(pieceIds(draw(id, type), "structure"), `${id} ${type} structure`).toEqual([])
        expect(pieceIds(draw(id, type), "identity"), `${id} ${type} identity`).toEqual([])
      }
    }
  })

  it("poster baseline is ordinary decor, not an exemption", () => {
    for (const type of ["cover", "content", "ending"] as const) {
      const root = draw("poster-motif", type)
      expect(pieceIds(root, "structure"), type).toEqual([])
      expect(pieceIds(root, "identity"), type).toEqual([])
      expect(root.querySelector('[data-decor-piece="baseline"]')).not.toBeNull()
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
