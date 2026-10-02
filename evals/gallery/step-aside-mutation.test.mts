// @vitest-environment node
//
// The step-aside, switched off.
//
// `cross-language-capacity.test.mts` holds an empty ratchet: no theme, no
// component, no language drops anything. That list was nine entries long
// before this, and every one of them was the same page — an English heading
// takes a second line, the face's body slot then hands the component less
// than it measured for itself, and the component declines inside a page that
// otherwise looks finished.
//
// An empty ratchet proves the nine are gone. It does not prove what closed
// them, and a green test that would stay green if the feature were deleted
// is not evidence of anything. So this file renders the same nine pages with
// `stepAside` stubbed out to always decline, and asserts the nine come back
// exactly as they were written down.
import { describe, expect, it, vi } from "vitest"
import type * as StepAside from "@/render/step-aside"

vi.mock("@/render/step-aside", async (importOriginal) => ({
  ...(await importOriginal<typeof StepAside>()),
  stepAside: () => null,
}))

const { renderSlideSvg } = await import("@/api")
const { installNodePlatform } = await import("@/platform/node")
const { CHART_VARIANTS, COMPONENT_BUILDERS, DEVICE_VARIANTS } = await import("./corpus/components")
const { componentPage, corpusAssets } = await import("./corpus/decks")
const { LEXICONS } = await import("./corpus/lexicon")

await installNodePlatform()

/**
 * Five of the nine, verbatim from the ratchet this change emptied: the pages
 * only the step-aside closes.
 */
const CLOSED_OVERFLOWS: readonly string[] = [
  "crayon · chart · bar · en: 1×component",
  "crayon · people_cards · en: 1×component",
  "crayon · rings · en: 1×component",
  "runway · people_cards · en: 1×component",
  "runway · rings · en: 1×component",
]

/**
 * The other four. A chart on a cartesian plot now draws a shorter plot
 * before its page loses it (`chartMinHeight`, `layoutContentFit`), and these
 * four fit crayon's band that way, so they never reach the step-aside.
 * Listed so that holding stays a claim the test makes, not one it forgot.
 */
const HELD_BY_CHART_FLOOR: readonly string[] = [
  "crayon · chart · area",
  "crayon · chart · bar horizontal",
  "crayon · chart · line",
  "crayon · chart · scatter",
]

const builders: Record<string, (typeof COMPONENT_BUILDERS)[string]> = {
  ...COMPONENT_BUILDERS,
  ...CHART_VARIANTS,
  ...DEVICE_VARIANTS,
}

async function dropsOn(themeId: string, id: string): Promise<string[]> {
  const lex = LEXICONS.en
  const assets = await corpusAssets(lex)
  const svg = renderSlideSvg(componentPage(id, builders[id]!, lex, assets, themeId), 0)
  return [...svg.matchAll(/data-dropped="(\d+)" data-dropped-kind="([a-z-]+)"/g)]
    .filter((m) => Number(m[1]) > 0)
    .map((m) => `${m[1]}×${m[2]}`)
}

describe("the nine overflows the step-aside closed", () => {
  it("the five only it closes come back when it always declines", { timeout: 300_000 }, async () => {
    const found: string[] = []
    for (const entry of CLOSED_OVERFLOWS) {
      const [themeId, componentId] = entry.split(" · ")
      const id = entry.slice(themeId!.length + 3, entry.indexOf(" · en:"))
      const drops = await dropsOn(themeId!, id)
      if (drops.length > 0) found.push(`${themeId} · ${id} · en: ${drops.join(", ")}`)
      expect(componentId).toBeDefined()
    }
    expect(found.sort()).toEqual([...CLOSED_OVERFLOWS].sort())
  })

  it("the four charts stay whole without it, drawn down to their floor", { timeout: 300_000 }, async () => {
    for (const entry of HELD_BY_CHART_FLOOR) {
      const [themeId] = entry.split(" · ")
      const id = entry.slice(themeId!.length + 3)
      expect(await dropsOn(themeId!, id), entry).toEqual([])
    }
  })
})
