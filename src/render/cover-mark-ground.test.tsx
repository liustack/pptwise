// @vitest-environment node
//
// The cover's top-left mark (a legal classification, or the confidentiality
// mark) takes its ink from the ground it actually stands on.
//
// It used to measure its ink against the page's own background, or against
// a theme colour a face named for the spot. runway's cover paints its stage
// over the whole page and lays the mark on it, so on a page painted
// #777777 the mark came out black on the stage at 1.14:1. homeroom's cover
// named its primary for the spot, but its board is the primary shaded
// darker, and on a painted page the mark read 2.92:1 there. Five more cover
// faces off every built-in menu paint their primary under the corner a
// classification always takes, and set it in the page's dark ink on it.
import { beforeAll, describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { auditDeck } from "@/audit/deck-audit"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { corpusAssets, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS } from "../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"

const assets = {} as Record<"zh" | "en", CorpusAssets>
beforeAll(async () => {
  installNodePlatform()
  for (const id of ["zh", "en"] as const) assets[id] = await corpusAssets(LEXICONS[id])
})

const CLASSIFICATION = { organization: "华东区域运营中心", classification: "秘密★1年" }
const CONFIDENTIAL = { meta: { organization: "华东区域运营中心", confidentiality: "confidential" }, footer: { confidentiality: "footer" } }

/** The cover of `face` on `theme` with the deck's mark, on the page painted `ground` or on the theme's own. */
function cover(theme: string, face: string, mark: "classification" | "confidentiality", ground?: string): PptxIR {
  const lex = face === "lineup-cover" || face === "lesson-cover" ? nativeLexiconFor(theme) : LEXICONS.zh
  const base = layoutPage(face, lex, assets[lex.id as "zh" | "en"], theme, undefined)
  const slide = { ...base.slides[0]!, ...(ground ? { background: { kind: "color" as const, value: ground } } : {}) }
  const marked =
    mark === "classification"
      ? { ...base, meta: { ...base.meta, ...CLASSIFICATION } }
      : { ...base, meta: { ...base.meta, ...CONFIDENTIAL.meta }, footer: CONFIDENTIAL.footer }
  const v = validateIr({ ...marked, slides: [slide] })
  if (!v.ok) throw new Error(v.errors.map((e) => e.message).join("; "))
  return v.ir!
}

/** The cover mark's low-contrast findings: its words, its ink, the ground under it and the ratio. */
function markFindings(ir: PptxIR): string[] {
  const words = new Set([CLASSIFICATION.classification, "内部资料，请勿外传"])
  return auditDeck(ir)
    .findings.filter((f) => f.code === "low-contrast" && words.has(String((f.detail as { text?: string }).text)))
    .map((f) => {
      const d = f.detail as { text: string; fill: string; background: string; ratio: number }
      return `${d.text} ${d.fill} on ${d.background} ${d.ratio.toFixed(2)}:1`
    })
}

describe("the cover mark reads on the ground it stands on", () => {
  it.each([
    ["runway", "lineup-cover", "classification", "#777777"],
    ["runway", "lineup-cover", "classification", undefined],
    ["homeroom", "lesson-cover", "confidentiality", "#777777"],
    ["homeroom", "lesson-cover", "confidentiality", "#2E8B57"],
    ["brief", "fashion-masthead", "classification", undefined],
    ["brief", "header-band", "classification", undefined],
    ["brief", "left-anchor", "classification", undefined],
    ["brief", "show-headline", "classification", undefined],
    ["brief", "split-diagonal", "classification", "#777777"],
  ] as const)("%s %s, %s on %s", (theme, face, mark, ground) => {
    expect(markFindings(cover(theme, face, mark, ground))).toEqual([])
  })
})
