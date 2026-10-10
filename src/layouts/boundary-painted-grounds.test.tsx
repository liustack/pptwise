// @vitest-environment node
//
// A cover, chapter or ending page its author painted a colour that is not
// the theme's reads as well as the theme's own page. Painted #777777,
// ember's chapter set the act's numeral in the raw fire at 1.37:1, and
// proposal's chapter measured its number, its part name and its questions
// against the petrol it stands on at home rather than the paint under them
// (1.17:1 and 2.30:1). Both now take the source rules: the fire as type is
// held to the painted ground (`brandInkOnGround`), and the binder chapter's
// words read on the page they stand on (`binderText`, `readableOn`).
//
// Every registered boundary face is swept: each built-in theme's own cover,
// chapter and ending page in its own words, and every face no menu offers on
// brief, on the theme's own ground and on eight others.
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import { auditDeck } from "@/audit/deck-audit"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { contrastRatio } from "@/render/ink"
import { parseSvgRoot } from "@/render/serialize"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition } from "@/themes/definitions"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { corpusAssets, layoutFaceSlot, layoutPage, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../evals/gallery/corpus/native"
import { menuFaces } from "../../evals/gallery/matrix"

const GROUNDS = ["#777777", "#6B7B8C", "#7A7A7A", "#C04040", "#2E8B57", "#8A6FB0", "#FF00FF", "#00A0A0"]
const BOUNDARY = ["cover", "chapter", "ending"]

const assets = {} as Record<LanguageId, CorpusAssets>
beforeAll(async () => {
  installNodePlatform()
  for (const id of Object.keys(LEXICONS) as LanguageId[]) assets[id] = await corpusAssets(LEXICONS[id])
})

interface Route {
  theme: string
  face: string
  own: boolean
}

function routes(): Route[] {
  const out: Route[] = []
  for (const theme of CANONICAL_THEME_IDS) for (const [slot, face] of Object.entries(menuFaces(theme))) if (BOUNDARY.includes(slot)) out.push({ theme, face, own: true })
  const served = new Set(out.map((r) => r.face))
  for (const face of Object.keys(LAYOUT_REGISTRY).sort()) if (BOUNDARY.includes(layoutFaceSlot(face)) && !served.has(face)) out.push({ theme: "brief", face, own: false })
  return out
}

/** The face's gallery page, painted `ground` when one is given. */
function page({ theme, face, own }: Route, ground?: string): PptxIR {
  const lex = own ? nativeLexiconFor(theme) : LEXICONS.zh
  const base = layoutPage(face, lex, assets[lex.id], theme, undefined)
  const slide = { ...base.slides[0]!, ...(ground !== undefined ? { background: { kind: "color" as const, value: ground } } : {}) }
  const result = validateIr({ ...base, slides: [slide] })
  expect(result.errors, `${theme} ${face}`).toEqual([])
  return result.ir!
}

describe("a boundary page painted another colour reads as its own does", () => {
  it.each([undefined, ...GROUNDS])("every boundary face on %s", (ground) => {
    const low = routes().flatMap((route) =>
      auditDeck(page(route, ground))
        .findings.filter((f) => f.code === "low-contrast")
        .map((f) => `${route.theme} ${route.face}: ${JSON.stringify(f.detail)}`),
    )
    expect(low).toEqual([])
  })

  it("keeps ember's fire on the act's numeral on its own stage, and holds it to a painted one", () => {
    const route = { theme: "ember", face: getThemeDefinition("ember").menu.chapter.face, own: true }
    expect(route.face).toBe("pitch-chapter")
    const fire = getThemeDefinition("ember").style.colors.accent
    const stroke = (ground?: string) => parseSvgRoot(renderSlideSvg(page(route, ground), 0)).querySelector("[data-pitch-numeral]")!.getAttribute("stroke")!
    expect(stroke()).toBe(fire)
    const painted = stroke("#777777")
    expect(painted).not.toBe(fire)
    expect(contrastRatio(painted, "#777777")).toBeGreaterThanOrEqual(4.5)
  })
})
