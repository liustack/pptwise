import type { Component, PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { getPlatform } from "../platform/registry"
import { CANONICAL_THEME_IDS, THEME_LABELS, type CanonicalThemeId } from "../themes/index"
import type { ThemeDefinition } from "../themes/definitions"
import { resolveIrTheme } from "../themes/resolve-ir-theme"
import type { StyleColors } from "../themes/tokens"
import { parseTransform } from "../audit/svg-audit"
import { visibleImageBox } from "../lib/svg-image-box"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"

/**
 * Real rendered frame for one picture, in canvas px (0-1280 × 0-720 —
 * `../constants`'s `CANVAS_W_PX`/`CANVAS_H_PX`). This is the whole point of
 * this module (asset-brief plan, 裁定 1): it comes from parsing an actual
 * render pass's SVG output, never from hand-copying `image.tsx`'s
 * `w * 0.5`/`MAX_IMAGE_H` constants — those change independently of this
 * file, and a shadow copy would silently start lying the day they do.
 */
export interface AssetBriefFrame {
  x: number
  y: number
  w: number
  h: number
  /** e.g. "2:1" when w:h reduces to a small clean ratio, else "1.63:1". */
  aspect: string
}

export interface AssetBriefFit {
  mode: "cover" | "contain"
  /** One sentence: crop behavior + safe-zone guidance for a generator. */
  note: string
}

export interface AssetBriefPalette {
  /** Deduplicated theme hex values, in `StyleColors`' own field order. */
  hexes: string[]
  primary: string
  accent: string
}

export interface AssetBriefMood {
  /** `ThemeDefinition.tags` passed through as-is (empty for every one of
   *  the 13 builtins today — none has adopted this field yet — but a
   *  registered custom theme may set it). */
  tags: readonly string[]
  /** One sentence assembled from the theme's own label/motif — never a
   *  hand-written per-theme paragraph (asset-brief plan 裁定: "不新写 13 段
   *  文案"). */
  description: string
}

export interface AssetBriefPage {
  index: number
  id?: string
  type: Slide["type"]
  heading?: string
}

/**
 * What holds the picture: one of the four picture components, or the page's
 * background (`slides[].background` with `kind: "asset"`, or the theme's
 * default background for that page type when the page sets none).
 */
export type AssetBriefKind = "image" | "image_grid" | "image_compare" | "device_mockup" | "background"

export interface AssetBriefItem {
  page: AssetBriefPage
  asset_id: string
  /** `ir.assets.images[asset_id].alt` passed straight through (A11Y-01 alt
   *  chain wave, task 1). Omitted (not an empty string) when the asset has
   *  no `alt`, the same "don't fabricate a value that isn't there"
   *  discipline the rest of this file follows for `frame`/`suggested_pixels`. */
  alt?: string
  kind: AssetBriefKind
  /** The JSON path of the field that names the picture, such as
   *  `slides.2.components.0.items.1.asset_id`, or
   *  `theme.style.defaultBackgrounds.cover` for a page that falls back to
   *  the theme's default background. */
  field: string
  /** Which picture of a multi-picture component: `items[1]` of a grid,
   *  `left` or `right` of a comparison. Absent for a single picture. */
  slot?: string
  /** The words the deck sets beside this picture: a grid item's caption, a
   *  comparison side's label, a device's caption. */
  caption?: string
  /** No usable `src` in `ir.assets.images` for this `asset_id` — a picture
   *  still to source, not a defect (asset-brief plan 裁定 2). */
  missing: boolean
  /** `false` when the page's layout draws no picture here: a background the
   *  face does not draw, or a component an overflow guard left out. Still
   *  listed rather than dropped. `frame`/`suggested_pixels` are omitted in
   *  that case; there is no real geometry to report. */
  rendered: boolean
  frame?: AssetBriefFrame
  /** 2× the frame's own pixel dimensions — omitted alongside `frame` when `rendered` is false. */
  suggested_pixels?: { w: number; h: number }
  fit: AssetBriefFit
  palette: AssetBriefPalette
  mood: AssetBriefMood
  /** One English paragraph, paste-ready for an image-generation tool. */
  suggested_prompt: string
  /** True when the page names this `asset_id` in more than one frame: one
   *  picture fills each of them, so it has to suit every frame listed. Each
   *  item still reports its own frame. Omitted for a picture named once. */
  shared?: true
  /** Present iff `shared`: how many frames on this page name this `asset_id`. */
  occurrenceCount?: number
}

export interface AssetBrief {
  theme: string
  items: AssetBriefItem[]
}

/**
 * A 1×1 transparent PNG, the stand-in every picture of a page is drawn with
 * for the render-only pass below (asset-brief plan 裁定 2). Its own pixel
 * content is never inspected — only the `<image>` geometry the renderer
 * places it into matters.
 */
const DUMMY_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

interface RawImageFrame {
  x: number
  y: number
  w: number
  h: number
  preserveAspectRatio: string
}

/**
 * Every `<image>` element's *absolute* canvas geometry out of one rendered
 * slide's SVG markup, keyed by the `#<key>` fragment the render-only pass
 * appends to each stand-in `href`. The box is the part the picture paints:
 * a cropped or round picture is drawn whole and cut by a clip, and the clip
 * is its frame (`../lib/svg-image-box.ts`, which the export and the audit
 * read pictures through too).
 *
 * Parses via `DOMParser` behind the platform seam (`getPlatform().domParser
 * ?? globalThis.DOMParser`) and accumulates `<g transform>` with the same
 * `parseTransform` the audit uses, so this stays usable in a browser and in
 * Node without importing either DOM directly (iron rule 3).
 */
function extractImageFrames(markup: string): Map<string, RawImageFrame[]> {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) {
    throw new Error(
      'DOMParser unavailable — in Node, call installNodePlatform() from "@liustack/pptwise/node" first (the pptwise CLI does this automatically)',
    )
  }
  const doc = new Parser().parseFromString(markup, "image/svg+xml")
  const byKey = new Map<string, RawImageFrame[]>()

  const visit = (el: Element, ox: number, oy: number, os: number) => {
    const { dx, dy, scale } = parseTransform(el)
    const ax = ox + os * dx
    const ay = oy + os * dy
    const as = os * scale
    if (el.tagName.toLowerCase() === "image") {
      const href = el.getAttribute("href") ?? ""
      const hashAt = href.indexOf("#")
      if (hashAt !== -1) {
        const key = href.slice(hashAt + 1)
        const box = visibleImageBox(el)
        const frame: RawImageFrame = {
          x: ax + as * box.x,
          y: ay + as * box.y,
          w: as * box.w,
          h: as * box.h,
          preserveAspectRatio: el.getAttribute("preserveAspectRatio") ?? "xMidYMid meet",
        }
        const list = byKey.get(key)
        if (list) list.push(frame)
        else byKey.set(key, [frame])
      }
    }
    for (const child of Array.from(el.children)) visit(child, ax, ay, as)
  }
  visit(doc.documentElement, 0, 0, 1)
  return byKey
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y !== 0) [x, y] = [y, x % y]
  return x || 1
}

/**
 * "2:1" when `w/h` lands within 1% of a small `n:d` ratio (`d` up to 12 —
 * covers every whole/half/thirds ratio this renderer's fixed slot math
 * produces, e.g. 613×307's 1.9967 ≈ 2/1), else a 2-decimal "1.63:1" fallback.
 * `w`/`h` are already-rounded canvas px, so false near-misses from float
 * noise (not real ratio ambiguity) are the only thing the tolerance guards
 * against.
 */
function formatAspect(w: number, h: number): string {
  if (h <= 0 || w <= 0) return `${w}:${h}`
  const ratio = w / h
  const TOL = 0.01
  for (let d = 1; d <= 12; d++) {
    const n = Math.round(ratio * d)
    if (n >= 1 && Math.abs(ratio - n / d) <= TOL) {
      const g = gcd(n, d)
      return `${n / g}:${d / g}`
    }
  }
  return `${ratio.toFixed(2)}:1`
}

function toFrame(raw: RawImageFrame): AssetBriefFrame {
  const w = Math.round(raw.w)
  const h = Math.round(raw.h)
  return { x: Math.round(raw.x), y: Math.round(raw.y), w, h, aspect: formatAspect(w, h) }
}

/** The fit the page drew the picture with: `meet` letterboxes, `slice` and a crop's clip fill the frame. */
function drawnFit(raw: RawImageFrame | undefined, declared: "cover" | "contain"): "cover" | "contain" {
  if (!raw) return declared
  return /\bmeet\b/.test(raw.preserveAspectRatio) ? "contain" : "cover"
}

/** Whether a frame covers nearly the whole slide, so the page's words are set over it. */
function fullBleed(frame: AssetBriefFrame | undefined): boolean {
  return frame !== undefined && frame.w * frame.h >= 0.9 * CANVAS_W_PX * CANVAS_H_PX
}

function buildFit(mode: "cover" | "contain", aspect: string | undefined, kind: AssetBriefKind, frame: AssetBriefFrame | undefined): AssetBriefFit {
  const extra =
    kind === "background" && fullBleed(frame)
      ? " The page's words are set over this picture behind a scrim: keep the subject clear of the text block and the area behind the heading calm."
      : kind === "background"
        ? " The page draws this picture in its own panel beside the words."
        : kind === "device_mockup"
          ? " The frame is a device screen: use a real screenshot of the product, never a generated picture of an interface."
          : ""
  if (mode === "cover") {
    return {
      mode,
      note:
        (aspect
          ? `Cover crop (xMidYMid slice): generate close to ${aspect} to avoid any crop — otherwise the renderer center-crops to fill the frame, so keep essential subject matter within the center safe zone.`
          : `Cover crop (xMidYMid slice): the renderer center-crops to fill the frame — keep essential subject matter centered.`) + extra,
    }
  }
  return {
    mode,
    note:
      (aspect
        ? `Contain fit (xMidYMid meet): the renderer letterboxes to show the whole image inside the frame with no crop — match ${aspect} to avoid empty margins.`
        : `Contain fit (xMidYMid meet): the renderer letterboxes to show the whole image inside the frame with no crop.`) + extra,
  }
}

/**
 * Dedupe theme identity colors into a flat hex list, in `StyleColors`' own
 * field order — deliberately excludes `chartPalette`/`accentPool` (data-viz
 * and multi-accent-cycling pools respectively, not the theme's core
 * identity a photo brief should pull from).
 */
function buildPalette(colors: StyleColors): AssetBriefPalette {
  const candidates = [colors.bg, colors.surface, colors.panel, colors.primary, colors.accent, colors.text, colors.muted, colors.border]
  const hexes = [...new Set(candidates.filter((c): c is string => Boolean(c)))]
  return { hexes, primary: colors.primary, accent: colors.accent }
}

function themeLabel(id: string): string {
  return (CANONICAL_THEME_IDS as readonly string[]).includes(id) ? THEME_LABELS[id as CanonicalThemeId] : id
}

function humanizeMotif(motif: string): string {
  return motif.replace(/-motif$/, "").replace(/-/g, " ")
}

/**
 * One assembled sentence from the theme's own already-declared label/tags/
 * motif — never a hand-written per-theme paragraph set (asset-brief plan's
 * own explicit constraint).
 */
function buildMood(themeId: string, themeDef: ThemeDefinition): AssetBriefMood {
  const label = themeLabel(themeId)
  const tagPhrase = themeDef.tags.length > 0 ? ` (${themeDef.tags.join(", ")})` : ""
  const motifPhrase = themeDef.motif ? ` with a ${humanizeMotif(themeDef.motif)} decorative motif` : ""
  return { tags: themeDef.tags, description: `${label} theme${tagPhrase}${motifPhrase}.` }
}

function buildPrompt(mood: AssetBriefMood, palette: AssetBriefPalette, frame: AssetBriefFrame | undefined, fit: AssetBriefFit): string {
  const supporting = palette.hexes.filter((h) => h !== palette.primary && h !== palette.accent)
  const paletteText = `Color palette: primary ${palette.primary}, accent ${palette.accent}${supporting.length > 0 ? `, supporting tones ${supporting.join(", ")}` : ""}.`
  const compositionText = frame
    ? `Compose for a ${frame.aspect} frame. ${fit.note}`
    : `Frame geometry unavailable — this image slot was not rendered under the deck's currently selected layout; generate at a versatile aspect ratio and verify placement once a layout renders it.`
  return `${mood.description} ${paletteText} ${compositionText}`
}

/** One picture a page names, before rendering. */
interface PictureRef {
  slideIndex: number
  asset_id: string
  kind: AssetBriefKind
  field: string
  slot?: string
  caption?: string
  declaredFit: "cover" | "contain"
  /** The fragment its stand-in carries in the render-only pass. */
  key: string
}

/**
 * Every picture of one slide, in the order the slide names them (its
 * background first), with each one's field rewritten in `slide` to a key of
 * its own. A copy of the slide is passed in and changed here, never the
 * caller's.
 */
function collectSlidePictures(
  slide: Slide,
  slideIndex: number,
  theme: ThemeDefinition,
  stand: Record<string, { src: string }>,
): PictureRef[] {
  const refs: PictureRef[] = []
  const keyFor = (n: number) => `brief-${slideIndex}-${n}`
  const take = (ref: Omit<PictureRef, "key" | "slideIndex">, rewrite?: (key: string) => void) => {
    const key = keyFor(refs.length)
    refs.push({ ...ref, slideIndex, key })
    if (rewrite) {
      rewrite(key)
      stand[key] = { src: `${DUMMY_PNG_DATA_URI}#${key}` }
    } else {
      // The theme's own default background names its picture by id, and the
      // theme is not this function's to rewrite: the stand-in goes in under
      // that id. No component keeps it, because each was given its own key.
      stand[ref.asset_id] = { src: `${DUMMY_PNG_DATA_URI}#${key}` }
    }
  }
  if (slide.background !== undefined) {
    const background = slide.background
    if (background.kind === "asset") {
      take(
        { asset_id: background.asset_id, kind: "background", field: `slides.${slideIndex}.background.asset_id`, declaredFit: background.fit ?? "cover" },
        (key) => (background.asset_id = key),
      )
    }
  } else {
    const fallback = theme.style.defaultBackgrounds[slide.type]
    if (fallback.kind === "asset") {
      take({ asset_id: fallback.asset_id, kind: "background", field: `theme.style.defaultBackgrounds.${slide.type}`, declaredFit: fallback.fit ?? "cover" })
    }
  }
  slide.components.forEach((component: Component, ci) => {
    const base = `slides.${slideIndex}.components.${ci}`
    if (component.type === "image") {
      take({ asset_id: component.asset_id, kind: "image", field: `${base}.asset_id`, declaredFit: component.fit }, (key) => (component.asset_id = key))
    } else if (component.type === "device_mockup") {
      take(
        { asset_id: component.asset_id, kind: "device_mockup", field: `${base}.asset_id`, declaredFit: "cover", ...(component.caption ? { caption: component.caption } : {}) },
        (key) => (component.asset_id = key),
      )
    } else if (component.type === "image_grid") {
      component.items.forEach((item, ii) => {
        take(
          {
            asset_id: item.asset_id,
            kind: "image_grid",
            field: `${base}.items.${ii}.asset_id`,
            slot: `items[${ii}]`,
            declaredFit: "cover",
            ...(item.caption ? { caption: item.caption } : {}),
          },
          (key) => (item.asset_id = key),
        )
      })
    } else if (component.type === "image_compare") {
      for (const side of ["left", "right"] as const) {
        const half = component[side]
        take(
          { asset_id: half.asset_id, kind: "image_compare", field: `${base}.${side}.asset_id`, slot: side, declaredFit: "cover", caption: half.label },
          (key) => (half.asset_id = key),
        )
      }
    }
  })
  return refs
}

/**
 * Build an image brief for every picture frame in a deck: each `image`,
 * every item of an `image_grid`, both sides of an `image_compare`, the
 * screen of a `device_mockup`, and each page's background picture (its own,
 * or the theme's default for that page type). For each: the real rendered
 * frame (from an actual render pass — see `extractImageFrames`), the fit the
 * page draws it with and a safe-zone note, suggested generation pixels (2×
 * the frame), the resolved theme's palette/mood, and a paste-ready English
 * `suggested_prompt`. Pure function of `ir` (same input → same output) — like
 * `auditDeck`, it never mutates its argument and never touches the
 * filesystem or network. The brand logo is not a picture to source and is
 * not listed.
 *
 * Every picture a slide names is drawn with the same 1×1 stand-in under a
 * key of its own, in an in-memory copy of the slide used only for this
 * pass: the field that names it is rewritten to that key, and the stand-in's
 * `href` carries the key as its fragment. Each rendered `<image>` then says
 * exactly which picture it is, also when two fields name one `asset_id`.
 * `missing` is decided from the real `ir.assets.images`, before any of this.
 * A field whose key no `<image>` carries is a picture the page's layout does
 * not draw (`rendered: false`). When a layout draws one picture twice, the
 * larger frame is the one reported.
 */
export function buildAssetBrief(ir: PptxIR, opts?: { theme?: ThemeDefinition }): AssetBrief {
  const themeDef = resolveIrTheme(ir, opts?.theme)
  const palette = buildPalette(themeDef.style.colors)
  const mood = buildMood(ir.theme.id, themeDef)

  const items: AssetBriefItem[] = []
  ir.slides.forEach((original, slideIndex) => {
    const slide = structuredClone(original)
    const stand: Record<string, { src: string }> = {}
    const refs = collectSlidePictures(slide, slideIndex, themeDef, stand)
    if (refs.length === 0) return
    const slides = ir.slides.slice()
    slides[slideIndex] = slide
    const renderIr: PptxIR = { ...ir, slides, assets: { images: { ...ir.assets.images, ...stand } } }
    const frames = extractImageFrames(renderSlideSvg(renderIr, slideIndex, { theme: themeDef }))
    const page: AssetBriefPage = { index: slideIndex, id: original.id, type: original.type, heading: original.heading }
    const named = new Map<string, number>()
    for (const ref of refs) named.set(ref.asset_id, (named.get(ref.asset_id) ?? 0) + 1)
    for (const ref of refs) {
      const occurrences = named.get(ref.asset_id)!
      const raws = frames.get(ref.key) ?? []
      const raw = raws.reduce<RawImageFrame | undefined>((best, next) => (best === undefined || next.w * next.h > best.w * best.h ? next : best), undefined)
      const frame = raw ? toFrame(raw) : undefined
      const fit = buildFit(drawnFit(raw, ref.declaredFit), frame?.aspect, ref.kind, frame)
      const alt = ir.assets.images[ref.asset_id]?.alt
      items.push({
        page,
        asset_id: ref.asset_id,
        ...(alt !== undefined ? { alt } : {}),
        kind: ref.kind,
        field: ref.field,
        ...(ref.slot !== undefined ? { slot: ref.slot } : {}),
        ...(ref.caption !== undefined ? { caption: ref.caption } : {}),
        missing: !ir.assets.images[ref.asset_id]?.src,
        rendered: frame !== undefined,
        ...(frame ? { frame, suggested_pixels: { w: frame.w * 2, h: frame.h * 2 } } : {}),
        fit,
        palette,
        mood,
        suggested_prompt: buildPrompt(mood, palette, frame, fit),
        ...(occurrences > 1 ? { shared: true as const, occurrenceCount: occurrences } : {}),
      })
    }
  })

  return { theme: ir.theme.id, items }
}
