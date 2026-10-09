// @vitest-environment node
//
// A heading validate passes on a cover, chapter or ending page leaves the
// rest of the page as much room as the shortest heading would. Every
// registered boundary face, with each block its slots accept at every
// length the corpus writes, under the longest heading validate passes: the
// page drops no more than under the heading's first character or word.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR } from "@/ir"
import { componentJsonSchema } from "@/ir/json-schema"
import { installNodePlatform } from "@/platform/node"
import { CANONICAL_THEME_IDS } from "@/themes"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, layoutFaceSlot, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"
import { menuFaces } from "../../evals/gallery/matrix"
import { droppedIn } from "./render-slide"
import { parseSvgRoot } from "./serialize"

const LONG = {
  zh: Array.from("同店增速回到正区间而且这一次不是靠促销拉起来的是复购率和客单价一起抬上来的结果我们建议把明年的第一目标定为同店增长并为此调整门店考核与新品节奏"),
  en: "Same store growth is back above zero and this time it came from repeat visits and ticket size rather than discounts so we propose making same store growth the first target".split(" "),
}

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

const dropped = (ir: PptxIR) => droppedIn(parseSvgRoot(renderSlideSvg(ir, 0))).dropped

const assets = {} as Record<LanguageId, CorpusAssets>
beforeAll(async () => {
  installNodePlatform()
  for (const id of Object.keys(LEXICONS) as LanguageId[]) assets[id] = await corpusAssets(LEXICONS[id])
})

const homes = new Map<string, string>()
for (const theme of CANONICAL_THEME_IDS) for (const [slot, face] of Object.entries(menuFaces(theme))) if (!homes.has(face) && ["cover", "chapter", "ending"].includes(slot)) homes.set(face, theme)
const FACES = Object.keys(LAYOUT_REGISTRY)
  .sort()
  .filter((id) => ["cover", "chapter", "ending"].includes(layoutFaceSlot(id)))

describe("a boundary heading validate passes leaves the rest of the page its room", () => {
  it.each(FACES)("%s", (face) => {
    const theme = homes.get(face) ?? "brief"
    const lex = homes.has(face) ? nativeLexiconFor(theme) : LEXICONS.zh
    const base = layoutPage(face, lex, assets[lex.id], theme, undefined)
    const page = base.slides[0]!
    const variants = [page.components]
    for (const slot of LAYOUT_REGISTRY[face]!.slots) {
      if (slot.accepts === "any" || slot.accepts.length === 0) continue
      if (page.components.some((c) => slot.accepts.includes(c.type))) continue
      for (const type of slot.accepts) {
        const full = COMPONENT_BUILDERS[type]!(lex) as unknown as Record<string, unknown>
        for (const block of [full, plainBlock(type, full)]) {
          const key = ["items", "milestones"].find((k) => Array.isArray(block[k]))
          const n = key ? (block[key] as unknown[]).length : 1
          for (let i = 1; i <= n; i++) variants.push([...page.components, (key ? { ...block, [key]: (block[key] as unknown[]).slice(0, i) } : block) as never])
        }
      }
    }
    const words = lex.id === "en" ? LONG.en : LONG.zh
    const at = (components: typeof page.components, n: number): PptxIR => ({ ...base, slides: [{ ...page, components, heading: words.slice(0, n).join(lex.id === "en" ? " " : "") }] })
    for (const components of variants) {
      const short = validateIr(at(components, 1))
      if (!short.ok) continue
      const floor = dropped(short.ir!)
      for (let n = 2; n <= words.length; n++) {
        const result = validateIr(at(components, n))
        if (!result.ok) break
        expect(dropped(result.ir!), `${components.map((c) => c.type).join("+")}: heading of ${n}`).toBeLessThanOrEqual(floor)
      }
    }
  })
})
