/**
 * Runs the matrix through the real render chain and writes the page files
 * plus `manifest.json`.
 *
 * "Real render chain" is load-bearing, not a nicety. The promotional images
 * for this project are meant to be taken from whatever passes review here,
 * so the moment these pages come from a simplified or prettified path, both
 * the review conclusions and the promotional images stop meaning anything.
 * Hence: `validateIr` then `renderSlideSvg`, the same two calls the CLI's
 * own `render`/`preview` make, with no gallery-specific rendering branch
 * anywhere.
 *
 * A page that fails to render is recorded as a skipped entry carrying its
 * error, never dropped. A silent gap in a coverage table is how a review
 * ends up signing off on something nobody saw.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { renderSlideSvg, validateIr } from "@/api"
import type { DesignStory } from "@/design-story"
import { componentStory } from "@/ir/components/stories"
import { getThemeDefinition } from "@/themes/definitions"
import { CANVAS_H_PX, CANVAS_W_PX } from "@/constants"
import { auditDeck } from "@/audit/deck-audit"
import { BAND_IDS, menuFaces, UNSERVED_SECTION, type BandId, type Job } from "./matrix"
import { pruneGalleryDir } from "./prune"

export interface ManifestPage {
  readonly id: string
  /** Theme id, or `"unserved"` for the appendix section. */
  readonly section: string
  readonly sectionLabel: string
  readonly band: BandId
  readonly subject: string
  /** Menu slot, on `face` pages only. */
  readonly slot?: string
  /** Component id, on `component` pages only. */
  readonly component?: string
  /**
   * The face that drew this page, on the `face` and `deck` bands. The review
   * page's 按版式 axis is exactly the set of pages carrying it — see `Job.face`
   * for why the component band stays out.
   */
  readonly face?: string
  /** The menu slot that routed this page to `face`: a content kind or a boundary type. */
  readonly faceSlot?: string
  readonly language: string
  readonly languageLabel: string
  readonly theme: string
  readonly page: number
  readonly pageCount: number
  readonly slideType: string
  readonly heading: string
  /** Path to this page's SVG, relative to the manifest. Absent when skipped. */
  readonly file?: string
  readonly width: number
  readonly height: number
  /** Set when the page could not be produced — the reason is shown in the gallery. */
  readonly skipped?: string
  /**
   * What the deterministic auditor already knows about this page.
   *
   * Carried into the gallery so a human pass is spent on taste rather than
   * on re-deriving things the machine measured better — nobody should be
   * eyeballing a contrast ratio. The first review round produced several
   * notes the auditor could have supplied verbatim.
   */
  readonly findings?: readonly { code: string; message: string }[]
  /**
   * Fingerprint of this page's rendered markup.
   *
   * Verdicts are keyed by page id and persist across runs, which is what
   * lets a review span several sittings. The cost is that a page whose
   * defect has since been fixed keeps its old "rework" and its old note,
   * and nothing said so — the 2026-08-16 round handed back eight verdicts
   * describing bugs that had already been fixed, and reading them cost a
   * full round of re-diagnosis before the pages themselves were checked.
   * Comparing this against the hash recorded alongside the verdict is what
   * tells a live judgement from a stale one.
   *
   * Kept alongside `fingerprint` so verdicts recorded before the two-part
   * split still have something to compare against — see `verdictFreshness`.
   */
  readonly hash: string
  /** The same page, hashed in two halves. See `splitPaint`. */
  readonly fingerprint: PageFingerprint
}

/** One theme's whole review, or the appendix. The gallery's top-level unit. */
export interface ManifestSection {
  readonly id: string
  readonly label: string
  /** One line saying what this section is here to answer. */
  readonly blurb: string
  readonly pages: readonly string[]
  /**
   * This theme's whole menu, slot → face, in `FACE_SLOTS` order. The review
   * page prints it as the section's skeleton strip.
   *
   * Read from the theme rather than from the pages this run happened to
   * render, so `--only=deck` still shows the menu it drew from. Absent on the
   * appendix, which is a pile of faces no menu offers, not a theme.
   */
  readonly menu?: Readonly<Record<string, string>>
}

/** A stripe inside every section: sample deck, menu faces, component skins. */
export interface ManifestBand {
  readonly id: BandId
  readonly label: string
  readonly question: string
}

export interface Manifest {
  /**
   * 3 was the theme-first cut: `tables` gone, every page naming its `section`
   * and `band` instead. A v2 reader could not be salvaged by a fallback —
   * the axis it grouped by no longer existed — so that bump fenced it out.
   *
   * 4 adds `face`/`faceSlot` to pages and `menu` to sections, all optional
   * and all additive: a v3 reader still reads a v4 file correctly. The number
   * moves anyway because a manifest outlives the code that wrote it, and a
   * reader that finds no faces should be able to tell "this build predates
   * the face axis" from "these pages have no face".
   *
   * 5 adds `stories`, on the same terms and for the same reason: an empty
   * card is not the same statement as no card at all.
   */
  readonly manifestVersion: typeof MANIFEST_VERSION
  readonly generator: string
  readonly pptwiseVersion: string
  readonly generatedAt: string
  readonly slide: { readonly width: number; readonly height: number }
  /** Themes in registry order, appendix last. */
  readonly sections: readonly ManifestSection[]
  /** Always in `BAND_IDS` order. */
  readonly bands: readonly ManifestBand[]
  /** Section order × band order × natural order inside the band. */
  readonly pages: readonly ManifestPage[]
  /**
   * The design story of every theme and component this build shows, keyed by
   * namespaced object id (`theme:swiss`, `component:bullets`). Objects whose
   * copy is unwritten are simply absent.
   *
   * A flat map rather than a field on each section, because a component is
   * not a section — it is a group the review page derives — and one shape for
   * both keeps the design card, and its translation table, reading from a
   * single key space.
   */
  readonly stories: Readonly<Record<string, DesignStory>>
}

const BAND_META: Record<BandId, { label: string; question: string }> = {
  deck: {
    label: "样张",
    question: "十页一副真实的牌面（封面/章节/七页内容/结尾）——这套主题拿去讲，观众看到的是这个样子，好不好看？",
  },
  face: {
    label: "骨架全脸",
    question: "这套主题菜单上的每一张脸，用它自己的皮渲一页——这套主题的骨相成不成立？",
  },
  aside: {
    label: "让位页",
    question: "把这张脸装不下的内容交给共享页画一遍——退位之后，主题的底、纹样、品牌与强调色还在不在？",
  },
  component: {
    label: "组件皮肤",
    question: "37 个组件（chart 拆成九张图）穿上这套主题的皮各一页——每个组件在这套皮下画出来能不能看？",
  },
}

/**
 * One line per section, built from what the section actually contains rather
 * than hand-written per theme: 24 hand-written blurbs would go stale the
 * first time a menu changed, and a stale blurb is worse than a count.
 */
function sectionBlurb(id: string, pages: readonly ManifestPage[]): string {
  if (id === UNSERVED_SECTION) {
    return `没有任何主题菜单点过的 ${pages.length} 张注册版式，统一穿 ${pages[0]?.theme ?? "brief"} 的皮各渲一页——它们还站不站得住？`
  }
  const counts = BAND_IDS.map((band) => ({ band, n: pages.filter((p) => p.band === band).length })).filter((b) => b.n > 0)
  return counts.map(({ band, n }) => `${BAND_META[band].label} ${n} 页`).join(" · ")
}

/**
 * The manifest schema this build writes and reads.
 *
 * Bumping it fences out every older file, on purpose. A gallery directory
 * outlives the code that wrote it, and the whole reason the number exists is
 * so a reader can tell "this build predates design cards" from "these
 * objects have no story" — which it can only do if something actually looks.
 */
export const MANIFEST_VERSION = 5

/**
 * Read a manifest off disk, or refuse it.
 *
 * Every caller that opens a gallery directory goes through here. A blind
 * cast would let a stale directory through and quietly drop whatever the
 * older file has no field for, which is exactly the failure the version
 * number is supposed to prevent.
 */
export function decodeManifest(raw: unknown, source: string): Manifest {
  const version = (raw as { manifestVersion?: unknown } | null)?.manifestVersion
  if (version !== MANIFEST_VERSION) {
    throw new Error(
      `${source} is a version ${String(version)} gallery manifest and this build reads version ${MANIFEST_VERSION}. Re-render it with \`pnpm gallery\` (or \`pnpm evals:gallery\`) before reading it again.`,
    )
  }
  return raw as Manifest
}

/** The component behind a gallery group id, variant suffix and all removed. */
export function componentTypeOf(groupId: string): string {
  return groupId.split(" · ")[0] ?? groupId
}

export interface RenderResult {
  readonly manifest: Manifest
  /** Page id → SVG markup, kept in memory for the HTML builder to inline. */
  readonly svgs: ReadonlyMap<string, string>
}

/** Small, stable, non-cryptographic fingerprint — this detects change, not tampering. */
function fingerprint(markup: string): string {
  let h = 2166136261
  for (let i = 0; i < markup.length; i++) {
    h ^= markup.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export interface PageFingerprint {
  /** The markup with every paint value blanked — shape, text and type only. */
  readonly geometry: string
  /** Only the paint values, in document order — exactly what the shape half drops. */
  readonly color: string
}

/** A page that never rendered has nothing to fingerprint. */
const EMPTY_FINGERPRINT: PageFingerprint = { geometry: "", color: "" }

/**
 * Attributes that carry paint rather than shape.
 *
 * Deliberately a list of what this renderer actually emits (`fill`, `stroke`,
 * `opacity`, `fill-opacity`, `stroke-opacity`, `stop-color`, plus
 * `data-contrast-tier`, which records which ink a contrast escalation picked)
 * with room for the obvious siblings. `stroke-width`, `stroke-dasharray` and
 * the whole font family stay out of it: a thicker rule moves ink, a redder one
 * does not.
 */
const PAINT_ATTR =
  /(\s)(fill-opacity|stroke-opacity|stop-opacity|flood-opacity|stop-color|flood-color|lighting-color|data-contrast-tier|fill|stroke|opacity|color)="([^"]*)"/g

/**
 * Split one page's markup into a shape half and a paint half.
 *
 * A theme redesign rewrites every color in the corpus and moves no layout,
 * which under a single whole-markup hash invalidated every verdict at once:
 * the 2026-08-19 round came back with seven of thirty judgements marked stale
 * that a human then re-made by hand, all of them about geometry that had not
 * moved. Hashing the two halves separately is what lets a re-run say "only
 * the paint changed" and keep those judgements alive.
 *
 * The attribute *name* stays in the shape half and only its value is blanked,
 * so a recolor that adds paint where there was none still reads as a shape
 * change — it is one.
 *
 * Known limit: this is a string transform over markup, so a slide whose own
 * *text* contains something shaped like `fill="red"` (a code component
 * quoting SVG) has that text counted as paint. Both halves still come from
 * the same bytes, so nothing can read as unchanged when it changed — the
 * worst case is a content edit reported as a recolor.
 */
export function splitPaint(markup: string): PageFingerprint {
  const paint: string[] = []
  const shape = markup.replace(PAINT_ATTR, (_m, space: string, name: string, value: string) => {
    paint.push(`${name}=${value}`)
    return `${space}${name}=""`
  })
  return { geometry: fingerprint(shape), color: fingerprint(paint.join(";")) }
}

/**
 * How much of a recorded verdict still applies to the page as it renders now.
 *
 * Self-contained on purpose: `html.ts` ships this function's own source into
 * the review page instead of restating the rule there, so what the reviewer
 * sees and what is tested here cannot drift apart. No module references, no
 * TS-only constructs — the same discipline `src/audit/browser-audit.ts`
 * documents for its own in-page function.
 *
 * `entry` is a stored verdict, `page` is its manifest entry as rendered now.
 */
export function verdictFreshness(
  entry: { hash?: string; geo?: string; col?: string } | undefined,
  page: { hash?: string; fingerprint?: { geometry: string; color: string } } | undefined,
): "fresh" | "recolored" | "stale" {
  if (!entry || !page) return "fresh"
  const now = page.fingerprint
  // A verdict recorded before the split carries one whole-markup hash and no
  // way to tell a recolor from a redraw. It keeps the old all-or-nothing rule
  // rather than being quietly upgraded to a claim its data cannot support.
  if (!entry.geo || !now || !now.geometry) {
    if (!entry.hash || !page.hash) return "fresh"
    return entry.hash === page.hash ? "fresh" : "stale"
  }
  if (entry.geo !== now.geometry) return "stale"
  return entry.col === now.color ? "fresh" : "recolored"
}

export function renderMatrix(jobs: readonly Job[], outDir: string, pptwiseVersion: string): RenderResult {
  const pagesDir = join(outDir, "pages")
  mkdirSync(pagesDir, { recursive: true })

  const pages: ManifestPage[] = []
  const svgs = new Map<string, string>()
  const auditCache = new Map<unknown, Map<number, { code: string; message: string }[]>>()
  const auditErrors: string[] = []

  for (const job of jobs) {
    const base: Omit<ManifestPage, "file" | "skipped" | "hash" | "fingerprint"> = {
      id: job.id,
      section: job.section,
      sectionLabel: job.sectionLabel,
      band: job.band,
      subject: job.subject,
      ...(job.slot !== undefined ? { slot: job.slot } : {}),
      ...(job.component !== undefined ? { component: job.component } : {}),
      ...(job.face !== undefined ? { face: job.face } : {}),
      ...(job.faceSlot !== undefined ? { faceSlot: job.faceSlot } : {}),
      language: job.language,
      languageLabel: job.languageLabel,
      theme: job.theme,
      page: job.page,
      pageCount: job.pageCount,
      slideType: job.slideType,
      heading: job.heading,
      width: CANVAS_W_PX,
      height: CANVAS_H_PX,
    }

    // Validate through the public entry point, exactly as the CLI does — a
    // corpus page that the product would reject must not reach the review
    // as if it were a legitimate render.
    const v = validateIr(job.ir)
    if (!v.ok) {
      pages.push({
        ...base,
        hash: "",
        fingerprint: EMPTY_FINGERPRINT,
        skipped: `IR rejected: ${v.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
      })
      continue
    }

    let svg: string
    try {
      svg = renderSlideSvg(v.ir!, job.slideIndex)
    } catch (error) {
      pages.push({
        ...base,
        hash: "",
        fingerprint: EMPTY_FINGERPRINT,
        skipped: `render threw: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }

    const file = `pages/${job.id}.svg`
    writeFileSync(join(outDir, file), svg, "utf8")
    svgs.set(job.id, svg)

    // `auditDeck` works per deck, so audit each one once and index its
    // findings by page rather than re-auditing for every slide.
    let deckFindings = auditCache.get(job.ir)
    if (!deckFindings) {
      deckFindings = new Map<number, { code: string; message: string }[]>()
      try {
        for (const f of auditDeck(v.ir!).findings) {
          const list = deckFindings.get(f.page) ?? []
          list.push({ code: f.code, message: f.message })
          deckFindings.set(f.page, list)
        }
      } catch (error) {
        // An auditor failure must not cost the reviewer the page itself —
        // but it must not pass for a clean bill of health either. A silently
        // empty findings column is worse than none at all, because it reads
        // as "the machine checked and found nothing".
        auditErrors.push(`${job.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
      auditCache.set(job.ir, deckFindings)
    }
    const findings = deckFindings.get(job.slideIndex + 1) ?? []

    pages.push({
      ...base,
      file,
      hash: fingerprint(svg),
      fingerprint: splitPaint(svg),
      ...(findings.length > 0 ? { findings } : {}),
    })
  }

  // Sections in first-appearance order, which is the job order: themes as the
  // registry sorts them, appendix last.
  const sectionIds: string[] = []
  for (const p of pages) if (!sectionIds.includes(p.section)) sectionIds.push(p.section)
  const sections: ManifestSection[] = sectionIds.map((id) => {
    const own = pages.filter((p) => p.section === id)
    return {
      id,
      label: own[0]!.sectionLabel,
      blurb: sectionBlurb(id, own),
      pages: own.map((p) => p.id),
      ...(id === UNSERVED_SECTION ? {} : { menu: menuFaces(id) }),
    }
  })
  const bands: ManifestBand[] = BAND_IDS.filter((id) => pages.some((p) => p.band === id)).map((id) => ({
    id,
    label: BAND_META[id].label,
    question: BAND_META[id].question,
  }))

  const stories: Record<string, DesignStory> = {}
  for (const section of sections) {
    if (section.id === UNSERVED_SECTION) continue
    const story = getThemeDefinition(section.id).story
    if (story) stories[`theme:${section.id}`] = story
  }
  // A component group id may name one drawing of a component rather than the
  // component itself (`chart · pie`, `device_mockup · phone`). The story
  // belongs to the component, so the variant is dropped on the way in and the
  // review page drops it again on the way out.
  for (const type of new Set(pages.flatMap((p) => (p.component === undefined ? [] : [componentTypeOf(p.component)])))) {
    const story = componentStory(type)
    if (story) stories[`component:${type}`] = story
  }

  const manifest: Manifest = {
    manifestVersion: MANIFEST_VERSION,
    generator: "pptwise gallery",
    pptwiseVersion,
    generatedAt: new Date().toISOString(),
    slide: { width: CANVAS_W_PX, height: CANVAS_H_PX },
    sections,
    bands,
    pages,
    stories,
  }

  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

  // Prune AFTER the writes, never before. Wiping pages/ first would blank a
  // previous good gallery if this run crashed mid-render. `--only=face`
  // into a dir that already has deck pages: this run's files are the source
  // of truth, so the other bands' leftovers go away. That is intended.
  pruneGalleryDir(pagesDir, new Set(pages.filter((p) => p.file).map((p) => `${p.id}.svg`)))

  if (auditErrors.length > 0) {
    throw new Error(
      `the deck auditor failed on ${auditErrors.length} page(s), so the gallery's findings column would be misleadingly empty:\n  ${auditErrors.slice(0, 5).join("\n  ")}`,
    )
  }

  return { manifest, svgs }
}
