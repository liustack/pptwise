// @vitest-environment node
//
// A theme's skin of `statement` or `pull-quote` sets the claim and the small
// context line over a quote at its own size on its own measure. Four
// statement skins (ink, ledger, luxe, memo) cut a claim too long for their
// one or two lines with no mark, and seven pull-quote skins (ink, journal,
// ledger, luxe, memo, stage, thesis) set the context line at full length
// whatever it held, so a long one ran off the page; ink's Chinese quote ran
// its context and attribution columns past the foot. These skins are reached
// by the built-in menus that offer the face, and by a theme copy that keeps a
// built-in id for the rest. Each line now stands whole on the page, or the
// skin hands the page to the shared face, which marks what it cuts.
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "../../platform/node"
import { BUILTIN_THEME_FILES, type CanonicalThemeId } from "../../themes"
import { compileBuiltinTheme } from "../../themes/definitions"
import { slideToSvgMarkup } from "../../render/render-slide"
import { parseSvgRoot } from "../../render/serialize"
import { cutLines } from "../../render/cut-fields"
import { stripEmphasis } from "../../render/emphasis"
import { truncationSources } from "../../ir/truncation-tiers"
import { auditSvgMarkup } from "../../audit/svg-audit"
import { FACES } from "./registry"

beforeAll(() => {
  installNodePlatform()
})

const LONG = {
  zh: "试点覆盖华东三个区域共四十二家门店，统计口径为二〇二五年第三季度至二〇二六年第二季度的同店销售额与客单价，剔除新开店与闭店影响后仍为正",
  en: "Pilot covered forty-two stores across three eastern regions, measured on same-store sales and ticket size from Q3 2025 to Q2 2026, excluding openings and closures",
}
const CLAIM = {
  zh: "同店增速回到正区间，而且这一次不是靠促销拉起来的，是复购率和客单价一起抬上来的结果",
  en: "Same-store growth is back above zero, and this time it came from repeat visits and ticket size rather than discounts",
}
const SHORT = { zh: "同店增速回正", en: "Growth is back" }

type Face = "statement" | "pull-quote"
const KIND: Record<Face, string> = { statement: "statement", "pull-quote": "quote" }

function pages(face: Face, lang: "zh" | "en"): { name: string; slide: Slide }[] {
  const base = { type: "content", kind: KIND[face] }
  const quote = (text: string, attribution?: string) => [{ type: "blockquote", text, ...(attribution ? { attribution } : {}) }]
  const list =
    face === "statement"
      ? [{ name: "a claim longer than the skin's lines", slide: { ...base, heading: CLAIM[lang], components: [] } }]
      : [
          { name: "a long heading over the quote", slide: { ...base, heading: CLAIM[lang], components: quote(SHORT[lang]) } },
          { name: "a long subheading over the quote", slide: { ...base, heading: SHORT[lang], subheading: LONG[lang], components: quote(SHORT[lang]) } },
          { name: "a long attribution", slide: { ...base, heading: SHORT[lang], components: quote(SHORT[lang], LONG[lang]) } },
        ]
  return list as unknown as { name: string; slide: Slide }[]
}

function skinned(face: Face): CanonicalThemeId[] {
  return Object.entries(FACES)
    .filter(([, faces]) => faces?.[face] !== undefined)
    .map(([id]) => id as CanonicalThemeId)
}

const plain = (text: string) => stripEmphasis(text).replace(/\s+/gu, "")

for (const face of ["statement", "pull-quote"] as const) {
  describe(`${face} skins under long authored lines`, () => {
    for (const id of skinned(face)) {
      const file = BUILTIN_THEME_FILES[id]
      const theme = compileBuiltinTheme({
        ...file,
        menu: { ...file.menu, content: { ...file.menu.content, [KIND[face]]: { face } } },
      })
      for (const lang of ["zh", "en"] as const) {
        for (const { name, slide } of pages(face, lang)) {
          it(`${id} ${lang}: ${name} stands whole on the page or is marked cut`, () => {
            const ir = { version: "5", filename: "x.pptx", theme: { id }, meta: {}, assets: { images: {} }, slides: [slide] } as unknown as PptxIR
            const markup = slideToSvgMarkup(ir, slide, 0, theme)
            expect(auditSvgMarkup(markup)).toEqual([])
            const root = parseSvgRoot(markup)
            const onPage = plain(root.textContent ?? "")
            const cut = new Set(cutLines(root, slide).map((line) => line.field))
            const lost = truncationSources(slide)
              .filter((source) => source.tier === "hard" && !onPage.includes(plain(source.text)) && !cut.has(source.field))
              .map((source) => source.field)
            expect(lost).toEqual([])
          })
        }
      }
    }
  })
}
