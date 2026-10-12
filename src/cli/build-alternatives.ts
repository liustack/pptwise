/**
 * Other looks for a deck, drawn from its own pages: what `pptwise build`
 * shows beside the deck so the user can see the theme was a choice, and
 * switch with one sentence.
 *
 * A deck's first build that draws pages, or any build with
 * `--alternatives`, picks up to three other built-in themes from the same
 * shortlist `theme try` uses, keyed by the bound theme's occasions and the
 * deck's narrative strategy, and draws the deck's own cover and one or two
 * of its content pages in each. Pages are validated one at a time against
 * each theme, the way the theme wall draws a sample page, so a page a theme
 * cannot take is passed over rather than failing the build, and a theme
 * that can draw none of the content pages tried is passed over for the
 * next.
 *
 * Switching is still a name change in `deck.spec.json` and a rebuild: these
 * pages are a preview of that rebuild, not a second deck. They are written
 * under `alternatives/` in the deck's `.pptwise/` folder with a
 * `manifest.json`, and a later build without the flag leaves them alone, so
 * the offer is made once.
 */
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { renderSlideSvg, validateIr } from "../api"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { BUILTIN_THEME_IDS, type PptxIR, type Slide } from "../ir"
import { getThemeDefinition, type ThemeDefinition } from "../themes/definitions"
import { themeShortlist } from "../themes/select"

/** The folder under the deck's workspace folder the alternatives are written to. */
export const ALTERNATIVES_DIRNAME = "alternatives"

/** At most this many other themes are drawn. */
export const ALTERNATIVES_MAX = 3

/** At most this many of the deck's content pages are drawn per theme. */
const CONTENT_PAGES_MAX = 2

/** How many content pages are tried, in order, before a theme is given up on. */
const CONTENT_PAGES_TRIED = 6

export interface BuildAlternativePage {
  /** The page's 1-based number in the deck. */
  page: number
  id?: string
  type: string
  /** Absolute path of the SVG. */
  file: string
}

export interface BuildAlternative {
  /** The theme id to write into `spec.theme` to switch. */
  theme: string
  /** The theme's display name. */
  name: string
  pages: BuildAlternativePage[]
}

export interface BuildAlternatives {
  /** The folder holding the SVGs and `manifest.json`. */
  dir: string
  themes: BuildAlternative[]
  /** How long drawing them took, in milliseconds. */
  ms: number
}

/** The narrative strategy, or the named preset, the shortlist reads. */
function strategyOf(ir: PptxIR): string | undefined {
  const narrative = ir.narrative
  if (typeof narrative === "string") return narrative
  return typeof narrative?.strategy === "string" ? narrative.strategy : undefined
}

/**
 * The themes to try, nearest first: the shortlist for the bound theme's
 * occasions and the deck's strategy, then every other built-in in order,
 * so a shortlist whose themes cannot draw this deck still yields some.
 */
export function alternativeCandidates(ir: PptxIR, bound: ThemeDefinition): string[] {
  const shortlist = themeShortlist({ occasions: bound.occasions, strategy: strategyOf(ir) })
  const ordered = [...shortlist, ...BUILTIN_THEME_IDS.filter((id) => !shortlist.includes(id))]
  return ordered.filter((id) => id !== bound.id && id !== ir.theme.id)
}

/** One page of `ir` drawn alone in `theme`, or undefined when that theme cannot take it. */
function drawAlone(ir: PptxIR, slide: Slide, theme: ThemeDefinition): string | undefined {
  const raw = { ...ir, theme: { ...ir.theme, id: theme.id }, slides: [slide] }
  const v = validateIr(raw, { theme })
  if (!v.ok) return undefined
  return renderSlideSvg(v.ir!, 0, { theme })
}

function kindOf(slide: Slide): string | undefined {
  return slide.type === "content" ? slide.kind : undefined
}

interface Drawn {
  index: number
  slide: Slide
  svg: string
}

/** The cover, when `theme` can draw it, and up to two content pages it can, preferring two different kinds. Undefined when it can draw no content page. */
function drawIn(ir: PptxIR, theme: ThemeDefinition): Drawn[] | undefined {
  const drawn: Drawn[] = []
  const coverIndex = ir.slides.findIndex((slide) => slide.type === "cover")
  if (coverIndex !== -1) {
    // A cover written for the bound theme's face (its own fill, components
    // or footnote) may not fit another's. The theme still shows on its
    // content pages, and the build after a switch names what to change.
    const svg = drawAlone(ir, ir.slides[coverIndex]!, theme)
    if (svg !== undefined) drawn.push({ index: coverIndex, slide: ir.slides[coverIndex]!, svg })
  }
  const content = ir.slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.type === "content" && slide.placeholder !== true)
    .slice(0, CONTENT_PAGES_TRIED)
  const drawable: Drawn[] = []
  for (const { slide, index } of content) {
    const svg = drawAlone(ir, slide, theme)
    if (svg !== undefined) drawable.push({ index, slide, svg })
  }
  // The second page shows another kind when the deck has one to show.
  const first = drawable[0]
  const second = drawable.find((d) => d !== first && kindOf(d.slide) !== kindOf(first!.slide)) ?? drawable[1]
  const taken = [first, second].filter((d): d is Drawn => d !== undefined).slice(0, CONTENT_PAGES_MAX)
  taken.sort((a, b) => a.index - b.index)
  if (taken.length === 0) return undefined
  return [...drawn, ...taken]
}

/**
 * Draw the alternatives for `ir`, bound to `bound`, into
 * `<workspaceDir>/alternatives/`, replacing whatever an earlier run left
 * there. Pure apart from writing that folder.
 */
export async function writeBuildAlternatives(ir: PptxIR, bound: ThemeDefinition, workspaceDir: string): Promise<BuildAlternatives> {
  const started = performance.now()
  const dir = join(workspaceDir, ALTERNATIVES_DIRNAME)
  const themes: (BuildAlternative & { pageFiles: { name: string; svg: string }[] })[] = []
  for (const id of alternativeCandidates(ir, bound)) {
    if (themes.length >= ALTERNATIVES_MAX) break
    const theme = getThemeDefinition(id)
    const drawn = drawIn(ir, theme)
    if (drawn === undefined) continue
    const pageFiles = drawn.map((d) => ({ name: `${id}-${String(d.index + 1).padStart(2, "0")}.svg`, svg: d.svg }))
    themes.push({
      theme: id,
      name: theme.label ?? id,
      pages: drawn.map((d, i) => ({
        page: d.index + 1,
        ...(d.slide.id !== undefined ? { id: d.slide.id } : {}),
        type: d.slide.type ?? "content",
        file: join(dir, pageFiles[i]!.name),
      })),
      pageFiles,
    })
  }
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  for (const theme of themes) for (const page of theme.pageFiles) await writeFile(join(dir, page.name), page.svg)
  const ms = Math.round(performance.now() - started)
  const manifest = {
    bound: ir.theme.id,
    slide: { width: CANVAS_W_PX, height: CANVAS_H_PX },
    themes: themes.map((theme) => ({
      id: theme.theme,
      label: theme.name,
      pages: theme.pages.map((page, i) => ({ page: page.page, ...(page.id !== undefined ? { id: page.id } : {}), type: page.type, file: theme.pageFiles[i]!.name })),
    })),
  }
  await writeFile(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  return { dir, themes: themes.map(({ pageFiles: _files, ...theme }) => theme), ms }
}
