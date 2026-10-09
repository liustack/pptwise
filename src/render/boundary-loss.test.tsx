import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { validateIr } from "../validate-core"
import { prefixOf } from "../layouts/text-room"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "../layouts/registry"
import { installNodePlatform } from "../platform/node"
import { CANONICAL_THEME_IDS } from "../themes"
import { getThemeDefinition, type ThemeDefinition } from "../themes/definitions"
import { cutLines } from "./cut-fields"
import { drawSlide } from "./render-slide"

/**
 * A cover, chapter or ending subheading validate passes is one its face
 * draws whole, and one it refuses is one the face would cut or leave off,
 * on every registered boundary face. The room the message quotes is a
 * prefix of the subheading itself: the face draws that much whole, and one
 * character or word more it does not.
 */

beforeAll(() => {
  installNodePlatform()
})

type BoundaryType = "cover" | "chapter" | "ending"

const HEADING = { zh: "下半年的三件事", en: "Next steps" }
const SUBHEADING = {
  zh: "面向二〇二七年的增长路线：同店增长、会员体系改造、供应链协同与门店考核调整，试点覆盖华东三个区域共四十二家门店，再往后看还要把会员体系和供应链一起改造升级",
  en: "A roadmap for twenty twenty seven covering same store growth, a rebuilt membership program, supply chain coordination and new store measures across every region we serve",
}

const BOUNDARY_FACES = Object.values(LAYOUT_REGISTRY).filter((layout) => (["cover", "chapter", "ending"] as const).some((type) => layout.slideTypes.includes(type)))

/** The built-in theme whose menu offers the face, or brief with the face swapped in. */
function homeTheme(face: LayoutDefinition, type: BoundaryType): ThemeDefinition {
  const home = CANONICAL_THEME_IDS.map((id) => getThemeDefinition(id)).find((theme) => theme.menu[type].face === face.id)
  const base = home ?? getThemeDefinition("brief")
  return { ...base, menu: { ...base.menu, [type]: home ? base.menu[type] : { face: face.id } } }
}

function deck(theme: ThemeDefinition, type: BoundaryType, lang: "zh" | "en", subheading: string): PptxIR {
  return {
    version: "5",
    filename: "boundary-loss.pptx",
    theme: { id: theme.id },
    meta: {},
    assets: { images: {} },
    slides: [{ type, heading: HEADING[lang], subheading, components: [] } as Slide],
  } as PptxIR
}

/** Whether the drawing loses the subheading: a cut line from it, or more dropped than the page without it. */
function drawnLoses(ir: PptxIR, theme: ThemeDefinition): boolean {
  const slide = ir.slides[0]!
  const drawn = drawSlide(ir, slide, 0, theme)
  if (cutLines(drawn.root, slide).some((line) => line.field === "subheading")) return true
  if (drawn.dropped === 0) return false
  const bare = { ...slide } as Record<string, unknown>
  delete bare.subheading
  return drawn.dropped > drawSlide(ir, bare as unknown as Slide, 0, theme).dropped
}

describe("validate refuses a boundary subheading its face would not set whole", () => {
  it.each(BOUNDARY_FACES.map((face) => [face.id, face] as const))("%s", (_id, face) => {
    const type = (["cover", "chapter", "ending"] as const).find((t) => face.slideTypes.includes(t))!
    const theme = homeTheme(face, type)
    for (const lang of ["zh", "en"] as const) {
      const ir = deck(theme, type, lang, SUBHEADING[lang])
      const result = validateIr(ir, { theme })
      const refused = result.errors.filter((e) => e.path === "slides.0.subheading")
      // A face with no place for a subheading at all says so before anything is drawn.
      if (refused.some((e) => /has no place for a subheading/.test(e.message))) continue
      expect(result.errors.filter((e) => e.path !== "slides.0.subheading"), `${lang}: only the subheading is refused`).toEqual([])
      const loses = drawnLoses(ir, theme)
      expect(refused.length > 0, `${lang}: validate refuses ${refused.length > 0}, the drawing loses it ${loses}`).toBe(loses)
      if (!loses) continue
      const said = /holds the first (\d+) \("[^"]*"\) of this \w+ subheading's (\d+) (characters|words)/.exec(refused[0]!.message)
      expect(said, refused[0]!.message).not.toBeNull()
      const held = Number(said![1])
      expect(held).toBeLessThan(Number(said![2]))
      expect(drawnLoses(deck(theme, type, lang, prefixOf(SUBHEADING[lang], held)), theme), `${lang}: ${held} drawn whole`).toBe(false)
      expect(drawnLoses(deck(theme, type, lang, prefixOf(SUBHEADING[lang], held + 1)), theme), `${lang}: ${held + 1} drawn lost`).toBe(true)
      expect(validateIr(deck(theme, type, lang, prefixOf(SUBHEADING[lang], held)), { theme }).ok, `${lang}: ${held} passes`).toBe(true)
    }
  })

  it("quotes the part of the subheading the face holds", () => {
    const crayon = getThemeDefinition("crayon")
    const result = validateIr(deck(crayon, "ending", "zh", SUBHEADING.zh), { theme: crayon })
    expect(result.errors).toEqual([
      {
        path: "slides.0.subheading",
        page: 1,
        message:
          'face "crayonbox-ending" holds the first 38 ("面向二〇二七年的增长路线：同店增长、会员体系改造、供应链协同与门店考核调整，") of this ending subheading\'s 77 characters, so the face would leave it off the page. Shorten the subheading. (a deck project\'s spec writes it as the page\'s summary)',
      },
    ])
  })
})

describe("validate refuses a boundary heading that takes the room the rest of the page needs", () => {
  const crayon = getThemeDefinition("crayon")
  const cards = [
    { icon: "phone", title: "班主任", text: "电话 138 0000 0000" },
    { icon: "mail", title: "教务处", text: "邮箱 jw@school.cn" },
    { icon: "users", title: "家委会", text: "每周三下午" },
  ]
  const LONG = "下次课我们一起把复习计划落到每一天的作业里"
  const ending = (heading: string): PptxIR =>
    ({
      version: "5",
      filename: "crowding.pptx",
      theme: { id: "crayon" },
      meta: {},
      assets: { images: {} },
      slides: [{ type: "ending", heading, components: [{ type: "icon_cards", items: cards }] }],
    }) as PptxIR
  const dropped = (ir: PptxIR) => drawSlide(ir, ir.slides[0]!, 0, crayon).dropped

  it("refuses crayonbox-ending's two-line title over three contact cards, quoting the heading that keeps them", () => {
    expect(dropped(ending(LONG))).toBeGreaterThan(0)
    const result = validateIr(ending(LONG), { theme: crayon })
    expect(result.errors).toEqual([
      {
        path: "slides.0.heading",
        page: 1,
        message:
          'face "crayonbox-ending" draws this page\'s icon_cards only under a shorter heading: it holds them under the first 14 ("下次课我们一起把复习计划落到") of this ending heading\'s 21 characters, and a longer heading takes the room they stand in, so the face would leave them off. Shorten the heading, or take the icon_cards off this page.',
      },
    ])
    expect(validateIr(ending(prefixOf(LONG, 14)), { theme: crayon }).ok).toBe(true)
    expect(dropped(ending(prefixOf(LONG, 14)))).toBe(0)
    expect(dropped(ending(prefixOf(LONG, 15)))).toBeGreaterThan(0)
  })
})
