// @vitest-environment node
//
// How many annotations image-annotate takes is the drawing's to say.
//
// Beside a lone picture the face numbers a few annotations around it, and
// its slot declares four. The declaration only ever warned (`density`), so
// a fifth passed validate and was left off the page with a mark the export
// refused. Beside an image_compare or a grid the face hands the page to its
// fallback, which sets the bullets as a list under the pictures, as many as
// the room left under them holds (on this page fewer than beside a lone
// picture, since the pictures take most of it). A device_mockup is one
// picture and is numbered around like one. No number in this test says how many:
// for each picture shape and each count, validate passes the page exactly
// when the page it draws loses nothing (`checkContentPagesDrawn`), so the
// limit is wherever the drawing puts it.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS } from "../../evals/gallery/corpus/lexicon"
import { droppedIn } from "./render-slide"
import { parseSvgRoot } from "./serialize"

let assets: CorpusAssets
beforeAll(async () => {
  installNodePlatform()
  assets = await corpusAssets(LEXICONS.zh)
})

const NOTES = ["结构件", "电池仓", "散热鳍片", "接口区", "铰链", "按键排", "屏幕边框", "底座"]
const MOST = NOTES.length

/** image-annotate's page with `picture` and the first `n` notes as its bullets. */
function page(picture: Slide["components"][number], n: number): PptxIR {
  const base = layoutPage("image-annotate", LEXICONS.zh, assets, "brief", "photo")
  const bullets = { type: "bullets", items: NOTES.slice(0, n) }
  return { ...base, slides: [{ ...base.slides[0]!, components: [picture, bullets] } as unknown as Slide] }
}

function picture(type: "image" | "image_compare" | "device_mockup" | "image_grid"): Slide["components"][number] {
  const built = COMPONENT_BUILDERS[type]!(LEXICONS.zh) as unknown as Record<string, unknown>
  return (type === "image_grid" ? { ...built, items: (built.items as unknown[]).slice(0, 2) } : built) as unknown as Slide["components"][number]
}

/** The most notes validate passes beside `shape`, holding validate's verdict to the drawing's at every count. */
function mostPassed(shape: Parameters<typeof picture>[0]): number {
  let most = 0
  for (let n = 1; n <= MOST; n++) {
    const ir = page(picture(shape), n)
    const drawn = renderSlideSvg(validateIr(ir, { allowDroppedContent: true }).ir!, 0)
    const loses = droppedIn(parseSvgRoot(drawn)).dropped > 0 || drawn.includes('data-truncated="1"')
    const v = validateIr(ir)
    expect(v.ok, `${shape} with ${n} notes: the page ${loses ? "loses part of it" : "draws whole"}`).toBe(!loses)
    if (v.ok) most = n
    else expect(v.errors.map((e) => e.message).join(" "), `${shape} with ${n} notes`).toMatch(/face "image-annotate"/)
  }
  return most
}

describe("image-annotate's annotations: validate passes what the page draws whole", () => {
  it("beside a lone picture, refuses the notes past what it numbers around it", () => {
    const lone = mostPassed("image")
    expect(lone).toBeGreaterThan(0)
    expect(lone).toBeLessThan(MOST)
    const v = validateIr(page(picture("image"), lone + 1))
    expect(v.errors).toEqual([expect.objectContaining({ path: "slides.0.components.1.items", message: expect.stringContaining(`draws ${lone} of the ${lone + 1} items in this page's bullets`) })])
  })

  it.each(["image_compare", "device_mockup", "image_grid"] as const)("beside an %s, passes exactly what the page draws", (shape) => {
    expect(mostPassed(shape)).toBeGreaterThan(0)
  })
})
