// @vitest-environment node
//
// The stress decks held to zero low-contrast findings on every theme.
//
// The gallery's L1 grades contrast, but the gallery's content is ordinary,
// and two defects only showed under the stress decks' extreme content. In
// `new_components_stress` a verdict's marked run reached the page in the
// tone's raw amber or green, 2.42:1 to just under 3:1 on thirteen light
// themes. In `diagram` an eight-node flowchart squeezed to the 12pt floor
// pushed its labels' tops onto the incoming arrow in the exported deck, on
// six themes. Both decks run here on every canonical theme, through the same
// `auditDeck` `pptwise audit` runs, with no allowlist.
import { beforeAll, describe, expect, it } from "vitest"
import { installNodePlatform } from "../platform/node"
import { CANONICAL_THEME_IDS } from "../themes"
import { auditDeck } from "./deck-audit"
import { STRESS_DECKS } from "./stress-fixtures"

beforeAll(() => {
  installNodePlatform()
})

const DECKS = ["new_components_stress", "diagram"] as const

describe("the stress decks read against what they are painted on", () => {
  for (const name of DECKS) {
    for (const themeId of CANONICAL_THEME_IDS) {
      it(`${name} / ${themeId}`, () => {
        const deck = STRESS_DECKS[name]!
        const report = auditDeck({ ...deck, theme: { ...deck.theme, id: themeId } })
        const contrast = report.findings.filter((f) => f.code === "low-contrast")
        expect(contrast.map((f) => `p${f.page} ${f.message}`)).toEqual([])
      })
    }
  }
})
