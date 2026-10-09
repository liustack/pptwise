// @vitest-environment node
//
// A face that turns a block away for holding too few items says so in
// validate, with its floor, before anything is drawn.
//
// The IR schema sets how few items a block may hold, and some faces draw
// fewer than that: stat-cover's ticker wants two figures where kpi_cards
// may hold one, lineup-chapter's line-up three looks where image_grid may
// hold two. Such a block passed validate and was left off with a mark only
// the export read. Every registered face is swept here with each list
// block it accepts, from the corpus, at every length the schema allows: a
// length the face leaves off where a longer prefix of the same block draws
// whole is a count the face turns away, and validate must refuse it.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { componentJsonSchema } from "@/ir/json-schema"
import { installNodePlatform } from "@/platform/node"
import { droppedIn } from "@/render/render-slide"
import { parseSvgRoot } from "@/render/serialize"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition, type ThemeDefinition } from "@/themes/definitions"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, layoutFaceSlot, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS } from "../../evals/gallery/corpus/lexicon"
import { LAYOUT_REGISTRY } from "./registry"

let assets: CorpusAssets
beforeAll(async () => {
  installNodePlatform()
  assets = await corpusAssets(LEXICONS.zh)
})

/** `block` with only the properties its schema requires, on the block and on each item of its lists. */
function plainBlock(type: string, block: Record<string, unknown>): Record<string, unknown> {
  const schema = componentJsonSchema(type) as { required?: string[]; properties?: Record<string, { items?: { required?: string[] } }> }
  const required = new Set(schema.required ?? [])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(block)) {
    if (!required.has(key)) continue
    const itemRequired = schema.properties?.[key]?.items?.required
    out[key] =
      Array.isArray(value) && itemRequired !== undefined
        ? value.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).filter(([field]) => itemRequired.includes(field))))
        : value
  }
  return out
}

/** The built-in theme that offers the face, or brief, with the face put in its slot. */
function themeFor(face: string, slot: string): ThemeDefinition {
  const boundary = ["cover", "chapter", "ending"].includes(slot)
  const home =
    CANONICAL_THEME_IDS.map((id) => getThemeDefinition(id)).find((theme) =>
      boundary ? theme.menu[slot as "cover"].face === face : Object.values(theme.menu.content ?? {}).some((entry) => (entry as { face?: string }).face === face),
    ) ?? getThemeDefinition("brief")
  return boundary
    ? { ...home, menu: { ...home.menu, [slot]: { face } } }
    : ({ ...home, menu: { ...home.menu, content: { ...home.menu.content, [slot]: { face } } } } as ThemeDefinition)
}

const FACES = Object.keys(LAYOUT_REGISTRY).sort()

describe("validate refuses a block with fewer items than its face draws", () => {
  it.each(FACES)("%s", (face) => {
    const slot = layoutFaceSlot(face)
    const boundary = ["cover", "chapter", "ending"].includes(slot)
    const theme = themeFor(face, slot)
    const lex = LEXICONS.zh
    const types = new Set<string>()
    for (const s of LAYOUT_REGISTRY[face]!.slots) for (const type of s.accepts === "any" ? Object.keys(COMPONENT_BUILDERS) : s.accepts) types.add(type)
    for (const type of types) {
      const full = COMPONENT_BUILDERS[type]?.(lex) as unknown as Record<string, unknown> | undefined
      if (!full) continue
      for (const block of [full, plainBlock(type, full)]) {
        const key = ["items", "milestones"].find((k) => Array.isArray(block[k]))
        if (!key) continue
        const list = block[key] as unknown[]
        const schema = componentJsonSchema(type) as { properties?: Record<string, { minItems?: number }> }
        const min = schema.properties?.[key]?.minItems ?? 1
        const page = (n: number): PptxIR =>
          ({
            version: "5",
            filename: "item-floor.pptx",
            theme: { id: theme.id },
            meta: {},
            assets,
            slides: [{ ...(boundary ? { type: slot } : { type: "content", kind: slot }), heading: "下一步", components: [{ ...block, [key]: list.slice(0, n) }] } as Slide],
          }) as PptxIR
        // What the face draws at each length, validate set aside.
        const drawn = new Map<number, boolean>()
        for (let n = min; n <= list.length; n++) {
          const result = validateIr(page(n), { theme })
          const ir = result.ir ?? (result.errors.every((e) => e.path.startsWith("slides.0")) ? page(n) : undefined)
          if (!ir) continue
          try {
            drawn.set(n, droppedIn(parseSvgRoot(renderSlideSvg(ir, 0, { theme }))).dropped === 0)
          } catch {
            // A page the schema refuses cannot be drawn: nothing to say about its length.
          }
        }
        for (const [n, whole] of drawn) {
          if (whole || ![...drawn].some(([m, ok]) => m > n && ok)) continue
          const result = validateIr(page(n), { theme })
          expect(result.ok, `${type} of ${n}: the face leaves it off, a longer one it draws, and validate passes it`).toBe(false)
        }
      }
    }
  })

  it("names the floor", () => {
    const ledger = getThemeDefinition("ledger")
    const ir = {
      version: "5",
      filename: "item-floor.pptx",
      theme: { id: "ledger" },
      meta: {},
      assets: { images: {} },
      slides: [{ type: "cover", heading: "二季度经营复盘", components: [{ type: "kpi_cards", items: [{ label: "续约率", value: "91%" }] }] }],
    } as PptxIR
    expect(ledger.menu.cover.face).toBe("stat-cover")
    expect(validateIr(ir, { theme: ledger }).errors).toEqual([
      {
        path: "slides.0.components",
        page: 1,
        message: 'face "stat-cover" draws a "kpi_cards" block of at least 2 items, and this "cover" page has 1 — add one more or move it to a content slide',
      },
    ])
  })
})
