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
 * The offer stays with the deck as it is now. Every later build under the
 * same theme hands back the same themes: read off disk while the pages they
 * were drawn from are unchanged, and drawn again from the current pages
 * once one of those changed (`manifest.json` keeps a hash of what they were
 * drawn from). A deck moved to another theme gets none: the user has chosen.
 *
 * Switching is still a name change in `deck.spec.json` and a rebuild: these
 * pages are a preview of that rebuild, not a second deck. They are written
 * under `alternatives/` in the deck's `.pptwise/` folder.
 */
import { createHash } from "node:crypto"
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { renderSlideSvg, validateIr } from "../api"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { BUILTIN_THEME_IDS, type PptxIR, type Slide } from "../ir"
import { getThemeDefinition, type ThemeDefinition } from "../themes/definitions"
import { themeShortlist } from "../themes/select"
import { VERSION } from "../version"

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
  /** How long this build spent on them, in milliseconds: drawing them, or reading back the ones still current. */
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

/** The pages an alternative may be drawn from: the first cover, and the first content pages written. */
function sourcePages(ir: PptxIR): { cover: { slide: Slide; index: number } | undefined; content: { slide: Slide; index: number }[] } {
  const coverIndex = ir.slides.findIndex((slide) => slide.type === "cover")
  const content = ir.slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.type === "content" && slide.placeholder !== true)
    .slice(0, CONTENT_PAGES_TRIED)
  return { cover: coverIndex === -1 ? undefined : { slide: ir.slides[coverIndex]!, index: coverIndex }, content }
}

/**
 * A hash of everything the alternatives of `ir` are drawn from: the pages
 * they may show, the deck around them (narrative, assets, brand, footer),
 * the bound theme's id and occasions, which pick the candidates, and the
 * engine that draws them. Equal hashes draw equal pages.
 */
export function alternativesSource(ir: PptxIR, bound: ThemeDefinition): string {
  const { cover, content } = sourcePages(ir)
  const slides = [...(cover ? [cover] : []), ...content].map(({ slide, index }) => ({ index, slide }))
  const input = { engine: VERSION, bound: { id: bound.id, occasions: bound.occasions ?? [] }, deck: { ...ir, slides } }
  return createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

/** The cover, when `theme` can draw it, and up to two content pages it can, preferring two different kinds. Undefined when it can draw no content page. */
function drawIn(ir: PptxIR, theme: ThemeDefinition): Drawn[] | undefined {
  const drawn: Drawn[] = []
  const { cover, content } = sourcePages(ir)
  if (cover !== undefined) {
    // A cover written for the bound theme's face (its own fill, components
    // or footnote) may not fit another's. The theme still shows on its
    // content pages, and the build after a switch names what to change.
    const svg = drawAlone(ir, cover.slide, theme)
    if (svg !== undefined) drawn.push({ index: cover.index, slide: cover.slide, svg })
  }
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
  const manifest: AlternativesManifest = {
    bound: ir.theme.id,
    source: alternativesSource(ir, bound),
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

/** `alternatives/manifest.json`. */
interface AlternativesManifest {
  /** The theme the deck was bound to when they were drawn. */
  bound: string
  /** {@link alternativesSource} of the deck they were drawn from. */
  source?: string
  slide: { width: number; height: number }
  themes: { id: string; label: string; pages: { page: number; id?: string; type: string; file: string }[] }[]
}

/**
 * The manifest an earlier build left, or undefined when there is none. One
 * this version cannot read is no manifest: the deck is offered afresh.
 */
async function readManifest(dir: string): Promise<AlternativesManifest | undefined> {
  let raw: string
  try {
    raw = await readFile(join(dir, "manifest.json"), "utf8")
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw e
  }
  try {
    const value = JSON.parse(raw) as Partial<AlternativesManifest>
    if (typeof value.bound !== "string" || !Array.isArray(value.themes)) return undefined
    return value as AlternativesManifest
  } catch {
    return undefined
  }
}

/** The alternatives a manifest lists, when every page file it names is still there. */
async function readBack(dir: string, manifest: AlternativesManifest, started: number): Promise<BuildAlternatives | undefined> {
  const themes: BuildAlternative[] = manifest.themes.map((theme) => ({
    theme: theme.id,
    name: theme.label,
    pages: theme.pages.map((page) => ({ page: page.page, ...(page.id !== undefined ? { id: page.id } : {}), type: page.type, file: join(dir, page.file) })),
  }))
  try {
    for (const theme of themes) for (const page of theme.pages) await access(page.file)
  } catch {
    return undefined
  }
  return { dir, themes, ms: Math.round(performance.now() - started) }
}

export interface OfferOptions {
  /** `--alternatives` (true) or `--no-alternatives` (false). */
  flag?: boolean
  /** Whether a deck never offered any gets them unasked: one bound to a built-in theme. */
  unasked: boolean
}

/**
 * The alternatives this build hands back, drawing them when it has to.
 * `--alternatives` always draws them, `--no-alternatives` never. Otherwise
 * a deck never offered any gets them when `unasked` allows. A deck offered
 * some gets the same themes again while it keeps the theme it had then:
 * read back while their pages are current, drawn again from the deck as it
 * is now when they are not. A deck moved to another theme gets none.
 */
export async function offerAlternatives(ir: PptxIR, bound: ThemeDefinition, workspaceDir: string, opts: OfferOptions): Promise<BuildAlternatives | undefined> {
  if (opts.flag === false) return undefined
  if (opts.flag === true) return writeBuildAlternatives(ir, bound, workspaceDir)
  const started = performance.now()
  const dir = join(workspaceDir, ALTERNATIVES_DIRNAME)
  const manifest = await readManifest(dir)
  if (manifest === undefined) return opts.unasked ? writeBuildAlternatives(ir, bound, workspaceDir) : undefined
  if (manifest.bound !== ir.theme.id || manifest.themes.length === 0) return undefined
  if (manifest.source === alternativesSource(ir, bound)) {
    const current = await readBack(dir, manifest, started)
    if (current !== undefined) return current
  }
  return writeBuildAlternatives(ir, bound, workspaceDir)
}
