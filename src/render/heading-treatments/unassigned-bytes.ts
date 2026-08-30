import { createHash } from "node:crypto"
import { renderSlideSvg } from "../../api"
import type { PptxIR, Slide } from "../../ir"
import { __resetRegisteredThemes } from "../../themes/definitions"
import { registerTestTheme } from "../../themes/test-fixtures"

/**
 * Unassigned-theme heading-treatment byte-nail matrix. Shared by the
 * colocated test and `scripts/write-unassigned-bytes.mts`. Call
 * `installNodePlatform()` before `computeHeadingUnassignedPages`.
 */

export const UNASSIGNED = [
  "classroom",
  "swiss",
  "stage",
  "memo",
  "crayon",
  "ember",
  "runway",
  "pulse",
] as const

export const KEEP_NATIVE_WITHOUT_CHAPTER = [
  "consulting",
  "tech",
  "playbill",
  "enterprise",
  "arena",
] as const

export const LAYOUTS = [
  "two-column",
  "bento-panel",
  "tone-adaptive-content",
  "narrow-column",
  "rail-numbered",
] as const

export const HEADING_UNASSIGNED_CAPTURED_AT = "three-layer depth contract"
export const HEADING_UNASSIGNED_ALGORITHM = "sha256"

export const HEADING_UNASSIGNED_BYTES_URL = new URL(
  "./__fixtures__/unassigned-bytes.json",
  import.meta.url,
)

const HEADING = "算法团队的迭代节奏与业务预期存在落差"
const SUB = "工作区席位订阅业务的增长质量与下半年投入方向"
const CHAPTER = "增长战略"

function deck(theme: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "heading-byte-nail.pptx",
    theme: { id: theme },
    meta: { organization: "pptwise" },
    assets: { images: {} },
    slides,
  } as PptxIR
}

function content(opts: { heading?: string; subheading?: string }): Slide {
  return {
    type: "content",
    kind: "points",
    heading: opts.heading,
    subheading: opts.subheading,
    components: [{ type: "paragraph", text: "正文占位，用来钉头区几何。" }],
  }
}

function sha(svg: string): string {
  return createHash("sha256").update(svg).digest("hex")
}

export function computeHeadingUnassignedPages(): Record<string, string> {
  __resetRegisteredThemes()
  const pages: Record<string, string> = {}

  for (const theme of UNASSIGNED) {
    for (const layout of LAYOUTS) {
      const themeId = registerTestTheme(`heading-${theme}-${layout}`, theme, {
        content: { points: layout },
      })
      const withChapter: Slide[] = [
        { type: "chapter", heading: CHAPTER, components: [] } as Slide,
        content({ heading: HEADING }),
        content({ heading: HEADING, subheading: SUB }),
        content({ heading: undefined }),
      ]
      const irChapter = deck(themeId, withChapter)
      pages[`${theme}|${layout}|title-only|chapter`] = sha(renderSlideSvg(irChapter, 1))
      pages[`${theme}|${layout}|title-sub|chapter`] = sha(renderSlideSvg(irChapter, 2))
      pages[`${theme}|${layout}|no-title|chapter`] = sha(renderSlideSvg(irChapter, 3))

      const noChapter: Slide[] = [
        content({ heading: HEADING }),
        content({ heading: HEADING, subheading: SUB }),
        content({ heading: undefined }),
      ]
      const irNone = deck(themeId, noChapter)
      pages[`${theme}|${layout}|title-only|none`] = sha(renderSlideSvg(irNone, 0))
      pages[`${theme}|${layout}|title-sub|none`] = sha(renderSlideSvg(irNone, 1))
      pages[`${theme}|${layout}|no-title|none`] = sha(renderSlideSvg(irNone, 2))
    }
  }

  for (const theme of KEEP_NATIVE_WITHOUT_CHAPTER) {
    for (const layout of LAYOUTS) {
      const themeId = registerTestTheme(`heading-${theme}-${layout}`, theme, {
        content: { points: layout },
      })
      const noChapter: Slide[] = [
        content({ heading: HEADING }),
        content({ heading: HEADING, subheading: SUB }),
        content({ heading: undefined }),
      ]
      const irNone = deck(themeId, noChapter)
      pages[`${theme}|${layout}|title-only|none`] = sha(renderSlideSvg(irNone, 0))
      pages[`${theme}|${layout}|title-sub|none`] = sha(renderSlideSvg(irNone, 1))
      pages[`${theme}|${layout}|no-title|none`] = sha(renderSlideSvg(irNone, 2))
    }
  }

  __resetRegisteredThemes()
  return pages
}
