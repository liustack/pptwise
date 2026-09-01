import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  BODY_FONT_FLOOR_PT,
  BODY_FONT_FLOOR_PX,
  META_FONT_FLOOR_PT,
  META_FONT_FLOOR_PX,
  PT_PER_PX,
  ptToPx,
  pxToPt,
} from "../constants"
import { ABSOLUTE_READABLE_FONT_FLOOR_PX, FONT_FLOOR_PX, floorForRole } from "./font-floors"

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..")
const SKIP = /\.test\.(ts|tsx)$/
const MIN_LITERAL = /(?:minFontSize|minPt):\s*(\d+(?:\.\d+)?)|(?:MIN_FONT(?:_SIZE)?|[A-Z0-9_]+MIN_FONT(?:_SIZE)?)\s*=\s*(\d+(?:\.\d+)?)/g

// Runway show follows an explicitly approved editorial scale whose labels,
// captions, and metadata intentionally sit below the general 16px floor.
// Rendered nodes carry `data-font-floor-exempt="show-spec"`, while the L1
// gallery and show layout tests verify that the exemption is scoped to those
// exact nodes. Keep this as an exact multiset so a new low floor cannot hide
// behind a file-wide exception.
const SHOW_SPEC_UNDER_FLOOR = [
  "layouts/chapter-show-plate.tsx: minFontSize: 14",
  "layouts/content-show-figures.tsx: minFontSize: 15",
  "layouts/content-show-figures.tsx: minFontSize: 14",
  "layouts/content-show-figures.tsx: minFontSize: 15",
  "layouts/content-show-gallery.tsx: minFontSize: 15",
  "layouts/content-show-gallery.tsx: minFontSize: 14",
  "layouts/content-show-gallery.tsx: minFontSize: 12",
  "layouts/content-show-spotlight.tsx: minFontSize: 14",
  // The picture's own caption, on the show scale's caption size — it used to
  // share the kicker line with `insight_panel.title` and lose to it.
  "layouts/content-show-spotlight.tsx: minFontSize: 14",
  "layouts/content-show-spotlight.tsx: minFontSize: 12",
  "layouts/content-show-statement.tsx: minFontSize: 15",
  "layouts/cover-show-headline.tsx: minFontSize: 14",
  "layouts/cover-show-headline.tsx: minFontSize: 12",
  "layouts/cover-show-headline.tsx: minFontSize: 13",
  "layouts/cover-show-headline.tsx: minFontSize: 13",
  "layouts/ending-show-finale.tsx: minFontSize: 14",
  "layouts/ending-show-finale.tsx: minFontSize: 14",
] as const
const SHOW_SPEC_UNDER_FLOOR_SET = new Set<string>(SHOW_SPEC_UNDER_FLOOR)

function walk(dir: string, files: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "__fixtures__" || name === "node_modules") continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.(ts|tsx)$/.test(name) && !SKIP.test(name)) files.push(full)
  }
}

describe("type floors on the 1280×720 canvas", () => {
  it("maps 12pt footnotes and 18pt body onto exact canvas px", () => {
    expect(PT_PER_PX).toBe(0.75)
    expect(ptToPx(META_FONT_FLOOR_PT)).toBe(16)
    expect(ptToPx(BODY_FONT_FLOOR_PT)).toBe(24)
    expect(META_FONT_FLOOR_PX).toBe(16)
    expect(BODY_FONT_FLOOR_PX).toBe(24)
    expect(pxToPt(META_FONT_FLOOR_PX)).toBe(12)
    expect(pxToPt(BODY_FONT_FLOOR_PX)).toBe(18)
  })

  it("gives body/heading 18pt and every other readable role 12pt", () => {
    expect(floorForRole("body")).toBe(24)
    expect(floorForRole("heading")).toBe(24)
    expect(floorForRole("label")).toBe(16)
    expect(floorForRole("card-sub")).toBe(16)
    expect(floorForRole("meta")).toBe(16)
    expect(floorForRole("footnote")).toBe(16)
    expect(floorForRole("caption")).toBe(16)
    expect(floorForRole("tick")).toBe(16)
    expect(floorForRole("badge")).toBe(16)
    expect(floorForRole("decor")).toBe(0)
    expect(ABSOLUTE_READABLE_FONT_FLOOR_PX).toBe(FONT_FLOOR_PX.meta)
  })

  it("keeps production shrink floors at or above the 12pt readable floor", () => {
    const files: string[] = []
    walk(SRC, files)
    const hits: string[] = []
    const adjudicatedShowHits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, "utf8")
      for (const match of text.matchAll(MIN_LITERAL)) {
        const raw = match[1] ?? match[2]
        if (raw == null) continue
        const value = Number(raw)
        if (value < META_FONT_FLOOR_PX) {
          const hit = `${file.replace(SRC + "/", "")}: ${match[0]}`
          if (SHOW_SPEC_UNDER_FLOOR_SET.has(hit)) adjudicatedShowHits.push(hit)
          else hits.push(hit)
        }
      }
    }
    expect(adjudicatedShowHits).toEqual(SHOW_SPEC_UNDER_FLOOR)
    expect(hits).toEqual([])
  })
})
