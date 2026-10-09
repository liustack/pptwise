// @vitest-environment node
//
// A heatmap ramp used to have a dead zone: a cell fill with relative
// luminance about 0.183 to 0.194 had no ink that read on it, because
// `readableOn` chose between white and the near-black `#0A0E14` and both
// fall just under 4.5:1 there. `heatmap.tsx` bent the ramp around it, and a
// theme whose whole surface to primary path sat inside the band could not
// be bent out, so every value on it was reported `low-contrast`.
//
// `readableOn` now falls back to pure black where neither of the pair
// reads, and black clears 4.5:1 on every ground in that band. The two
// confined themes the review built are kept here, run through a real
// `registerTheme`, `renderSlideSvg` and `auditDeck`: every value cell on
// them now reads, with a realistic `colors.text` (brief's `#051C2C`), and
// the straddling control stays clean.
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { auditDeck } from "../audit/deck-audit"
import { installNodePlatform } from "../platform/node"
import { registerTheme, __resetRegisteredThemes } from "../themes/definitions"
import type { ThemeFile } from "../themes/schema"

beforeAll(() => {
  installNodePlatform()
})

afterEach(() => {
  __resetRegisteredThemes()
})

/** A minimal registerable theme whose (surface, primary) pair is the only
 * thing that varies across the cases below — every other token is a
 * realistic value borrowed from a real shipped theme (`brief`'s own
 * `text`), not an artificially extreme one, so the reconstruction is
 * faithful to what a real `registerTheme` caller's token set would
 * actually look like. */
function confinedTheme(id: string, surface: string, primary: string) {
  return {
    version: 2 as const,
    id,
    style: {
      id,
      colors: {
        bg: "#FFFFFF",
        surface,
        primary,
        accent: "#AA00FF",
        text: "#051C2C", // brief's own colors.text — a realistic dark ink, not pure #000000
        muted: "#051C2C",
        chartPalette: [primary, "#AA00FF"],
      },
      fonts: { heading: ["Arial"], body: ["Arial"] },
      defaultBackgrounds: {
        cover: { kind: "color" as const, value: "#FFFFFF" },
        chapter: { kind: "color" as const, value: "#FFFFFF" },
        content: { kind: "color" as const, value: "#FFFFFF" },
        ending: { kind: "color" as const, value: "#FFFFFF" },
      },
    },
    brand: {},
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "banner-chapter" },
      content: { data: { face: "narrow-column" } },
      ending: { face: "banner-ending" },
    },
  } satisfies ThemeFile
}

const HEATMAP_SLIDE: Slide = {
  type: "content",
  kind: "data",
  heading: "Deadzone probe",
  components: [
    {
      type: "heatmap",
      x_labels: ["a", "b", "c", "d", "e"],
      y_labels: ["row"],
      values: [[0, 25, 50, 75, 100]],
      show_values: true,
    },
  ],
} as Slide

function deckFor(themeId: string): PptxIR {
  return {
    version: "5",
    filename: "heatmap-deadzone-fixture",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: [HEATMAP_SLIDE],
  } as PptxIR
}

describe("heatmap values on a ramp inside the old dead zone", () => {
  it("a theme confined to the band (surface and primary one hex unit apart, both inside it) reads on every value cell", () => {
    registerTheme(confinedTheme("deadzone-adjacent", "#787878", "#797979"))
    const report = auditDeck(deckFor("deadzone-adjacent")) as { findings: { code: string; detail?: { text?: string } }[] }
    const cellFindings = report.findings.filter(
      (f) => f.code === "low-contrast" && ["0", "25", "50", "75", "100"].includes(f.detail?.text ?? ""),
    )
    expect(cellFindings).toEqual([])
  })

  it("a theme flat inside the band (surface === primary) reads on every value cell", () => {
    registerTheme(confinedTheme("deadzone-flat", "#787878", "#787878"))
    const report = auditDeck(deckFor("deadzone-flat")) as { findings: { code: string; detail?: { text?: string } }[] }
    const cellFindings = report.findings.filter(
      (f) => f.code === "low-contrast" && ["0", "25", "50", "75", "100"].includes(f.detail?.text ?? ""),
    )
    expect(cellFindings).toEqual([])
  })

  it("control: a theme whose ramp straddles the band passes clean", () => {
    registerTheme(confinedTheme("deadzone-control", "#767676", "#7b7b7b"))
    const report = auditDeck(deckFor("deadzone-control")) as { findings: { code: string; detail?: { text?: string } }[] }
    const cellFindings = report.findings.filter(
      (f) => f.code === "low-contrast" && ["0", "25", "50", "75", "100"].includes(f.detail?.text ?? ""),
    )
    expect(cellFindings).toEqual([])
  })
})
