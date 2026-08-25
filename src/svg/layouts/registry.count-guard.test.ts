import { describe, expect, it } from "vitest"
import { LAYOUT_REGISTRY, type SlideType } from "./registry"

/**
 * This is a guard, not a lookup. If an intentional registry change breaks it,
 * recount first, then update the count comments in `registry.ts`,
 * `image-pages.tsx`, `src/themes/definitions.ts`, and `registry.test.ts`.
 * Also update `docs/concepts.md`, `docs/architecture.md`,
 * `docs/selection-and-seed.md`, `docs/ir.md`, `docs/ir.zh-CN.md`,
 * `docs/themes.md`, `docs/themes.zh-CN.md`, `docs/deck-projects.md`,
 * and `AGENTS.md`.
 */
const COUNT_DRIFT_MESSAGE =
  "LAYOUT_REGISTRY counts changed. Recount it, then update registry.ts count comments, docs/concepts.md, docs/architecture.md, docs/themes.md, docs/themes.zh-CN.md, docs/deck-projects.md, and AGENTS.md."

const SLIDE_TYPES = ["cover", "chapter", "ending", "content"] as const satisfies readonly SlideType[]

describe("LAYOUT_REGISTRY count guard", () => {
  const definitions = Object.values(LAYOUT_REGISTRY)

  it("pins the registry, standard-layout, and takeover totals", () => {
    expect(definitions, COUNT_DRIFT_MESSAGE).toHaveLength(127)
    expect(
      definitions.filter((definition) => definition.kind === "archetype"),
      COUNT_DRIFT_MESSAGE,
    ).toHaveLength(123)
    expect(
      definitions.filter((definition) => definition.kind === "takeover"),
      COUNT_DRIFT_MESSAGE,
    ).toHaveLength(4)
  })

  it("pins the pin-only total", () => {
    expect(
      definitions.filter((definition) => definition.pinOnly === true),
      COUNT_DRIFT_MESSAGE,
    ).toHaveLength(80)
  })

  it("pins registered and auto-selectable totals by slide type", () => {
    const counts = Object.fromEntries(
      SLIDE_TYPES.map((slideType) => {
        const registered = definitions.filter((definition) => definition.slideTypes.includes(slideType))
        const autoSelectable = registered.filter(
          (definition) => definition.kind === "archetype" && definition.pinOnly !== true,
        )
        return [slideType, { registered: registered.length, autoSelectable: autoSelectable.length }]
      }),
    )

    expect(counts, COUNT_DRIFT_MESSAGE).toEqual({
      cover: { registered: 36, autoSelectable: 19 },
      chapter: { registered: 35, autoSelectable: 8 },
      ending: { registered: 33, autoSelectable: 7 },
      content: { registered: 23, autoSelectable: 9 },
    })
  })
})
