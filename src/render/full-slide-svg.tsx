import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"
import type { BackgroundSpec, Component, PptxIR, Slide } from "@/ir"
import { PACING_BUDGETS, resolveNarrative, type NarrativeProfile } from "@/narrative"
import type { StyleTokens } from "../themes/tokens"
import { resolveStyle } from "../themes"
import { CANVAS_W_PX, CANVAS_H_PX } from "../constants"
import { resolveFontStack } from "./fonts"
import type { ComponentCtx } from "../components/types"
import type { SvgTemplateProps } from "../layouts/types"
import { Background } from "./background"
import { Branding } from "./branding"
import { SlideDecor } from "./slide-decor"
import { getTakeoverRenderer, ImageCoverPage } from "./image-pages"
import { gradientBands } from "./gradient-bands"
import { COVER_LAYOUTS } from "../layouts/index-cover"
import { CHAPTER_LAYOUTS } from "../layouts/index-chapter"
import { CONTENT_LAYOUTS } from "../layouts/index-content"
import { ENDING_LAYOUTS } from "../layouts/index-ending"
import { MOTIFS } from "../motifs"
import { getThemeDefinition } from "../themes/definitions"
import { resolveEffectiveFace } from "./layout-selection"
import { partitionSvgDepth, type SvgDepthLayers } from "./depth-contract/partition"
import { enforceMidgroundContract, resolveMidgroundBackground } from "./depth-contract/safety"
import { resolvePageRenderContext } from "./page-context"

/**
 * Reduce a `BackgroundSpec` to one representative hex color — a color spec
 * is already one; a gradient's `from` stop stands in for the whole band
 * (every built-in gradient goes dark→darker or light→lighter, so which
 * stop is picked never changes an ink decision made off it); an asset spec
 * (a photo) has no single true color, so callers get `surfaceFallback`
 * instead (mirrors the pre-existing `autoScrimColor` computation below,
 * which this function now backs).
 *
 * Exported (W4 fix round) so layout tests can build a `ComponentCtx`
 * whose `defaultBg` matches a theme's *true* `defaultBackgrounds[slideType]`
 * — required whenever the theme under test gives that slide type a
 * different default than its own `colors.bg` (only `academic`/`classroom`/
 * `consulting`'s `chapter` do, among the 13 built-ins), since `buildCtx`'s
 * own same-named fallback (`colors.bg`) is wrong for exactly those three.
 */
export function resolveBackgroundHex(spec: BackgroundSpec, surfaceFallback: string): string {
  if (spec.kind === "color") return spec.value
  if (spec.kind === "gradient") return spec.from
  return surfaceFallback
}

/**
 * Same color reduction as `resolveBackgroundHex` above for a `color` spec, but
 * a gradient reduces to its exact midpoint blend (t=0.5) instead of the
 * `from` stop, and an asset resolves to the actually-painted scrim color
 * rather than `resolveBackgroundHex`'s unrelated surface fallback (see
 * "Asset policy rationale" below). Used only for `slide.background`'s own
 * per-slide override (`FullSlideSvg` below, post-v0.3 W8 fix round, backlog
 * item 1 — `.issues/notes/engineering-history.md` #1) —
 * `resolveBackgroundHex` keeps its `.from`/`surfaceFallback` policy untouched
 * and still exclusively backs `tokens.defaultBackgrounds`, which is real
 * production input today (`tech`'s own cover/chapter/content/ending default
 * *is* a gradient, see `themes/tech.ts`) and must stay byte-identical for a
 * slide with no override of its own.
 *
 * Gradient policy rationale — the representative-color choice here must be
 * *semantically consistent* with what `deck-audit.ts` actually measures
 * against, not just internally self-consistent (confirmed by reading that
 * module before writing this one, not assumed): `deck-audit.ts`'s
 * `findContrastIssues`/`runContrastWalk` never averages a gradient — it
 * records each of `background.tsx`'s 24 real rendered bands as its own
 * exact region (the same `gradientBands` call this function reuses below)
 * and looks up whichever band a text element's own resolved position
 * actually falls inside. A single scalar `ctx.defaultBg` can't reproduce
 * that per-position precision for every consumer at once — it backs many
 * layouts' ink decisions at many different y-positions on the same slide
 * (`ComponentCtx.defaultBg`'s own doc comment) — so no single pick agrees
 * with the audit's real per-position lookup everywhere. Of the two natural
 * single-value picks, the midpoint is the one actually representative of
 * where those consumers place text: every surveyed `ctx.defaultBg` reader's
 * heading/subheading/numeral sits well away from the y=0 (or x=0, for an
 * `lr`-direction gradient) edge a `.from`-stop pick would implicitly stand
 * in for — chapter headings sit at y=352-408 (close to the canvas's own
 * vertical center, 360), content subheadings at y=88-220 — see the task
 * report's per-layout y-coordinate survey for the full list. Computed
 * via the renderer's own `gradientBands` (not a separately hand-rolled
 * blend formula), so the exact colour law matches what `background.tsx`
 * actually paints — a real point on the true 24-band gradient, not a
 * divergent approximation of one.
 *
 * Asset policy rationale (final-review Major finding, post-v0.3 backlog
 * item 1's own sub-branch — `.issues/notes/engineering-history.md`
 * #1): an asset spec has no true single color of its own, same as
 * `resolveBackgroundHex`'s asset branch — but unlike that function (whose
 * `surfaceFallback` genuinely is what gets painted when a *theme's own
 * default* background happens to be an asset, since `autoScrimColor` is
 * then defined circularly off that same fallback), this reducer's asset
 * case is a *per-slide override* on top of an otherwise-normal theme, where
 * what actually paints behind text is already known and different:
 * `background.tsx`'s auto-scrim, colored `themeDefaultBg` (see
 * `FullSlideSvg`'s own `autoScrimColor` assignment below) at
 * `AUTO_SCRIM_OPACITY = 0.66` — opaque enough that `deck-audit.ts` itself
 * trusts the scrim's raw fill as the background region's color
 * (`MIN_BG_OPACITY = 0.5`, `runContrastWalk`'s `opaqueEnough` check), not a
 * blend with the photo beneath it. Falling through to `surfaceFallback`
 * here (the pre-fix behavior) returned `tokens.colors.surface` instead —
 * unrelated to, and routinely different from, that actually-painted color —
 * which is exactly the "ink decision disagrees with what's actually
 * rendered" defect class this whole backlog item exists to close, just in
 * the one branch its original fix (`6b60bb5`) missed. `paintedFallback`
 * (the caller's `themeDefaultBg`, not `surfaceFallback`) closes it: the
 * caller already computes that exact value for `autoScrimColor`'s own use,
 * so this is the same value, not a re-derivation of it. Moot for a
 * cover/chapter override — `imageCoverTakeover` intercepts those before any
 * layout ever reads `ctx.defaultBg` (see `FullSlideSvg`'s own comment at
 * that assignment) — so this value is simply never read in that case; it is
 * live for content/ending, the only slide types where the auto-scrim (and
 * so this exact color) is what actually renders behind text.
 */
export function resolveOverrideBackgroundHex(
  spec: BackgroundSpec,
  surfaceFallback: string,
  paintedFallback: string,
): string {
  if (spec.kind === "gradient") return gradientBands(spec.from, spec.to, 3)[1]
  if (spec.kind === "asset") return paintedFallback
  return resolveBackgroundHex(spec, surfaceFallback)
}

/**
 * Resolve theme tokens + asset map into the render context components/templates use.
 * `components`, when passed, seeds `ctx.blockIndex` (component reference → its
 * position in that array) for wave-C S3's per-component entrance-animation
 * tagging — omit it (the default) to keep `ctx.blockIndex` undefined, which
 * is what keeps the default export path byte-identical (see `ComponentCtx`'s
 * doc comment).
 *
 * `defaultBg` (W4 fix round, post-v0.3 W8 fix round — `ComponentCtx`'s own
 * doc comment): the caller (`FullSlideSvg` below) always supplies the true
 * per-slide-aware default — `slide.background` reduced via
 * `resolveOverrideBackgroundHex` when the slide sets one, else
 * `tokens.defaultBackgrounds[slide.type]` reduced via `resolveBackgroundHex`.
 * Omitting it (as every pre-existing test call site does) falls back to
 * `tokens.colors.bg` — exact for every slide type on 10 of the 13 built-in
 * themes, and still a plausible same-family value on the other 3
 * (`academic`/`classroom`/`consulting`, whose `chapter` background alone
 * diverges from their own `colors.bg`).
 *
 * `bodyFontPx` (W4 task 3, `ComponentCtx.bodyFontPx`'s own doc comment): the
 * caller (`FullSlideSvg` below) always supplies the true
 * `PACING_BUDGETS[resolveNarrative(ir.narrative).pacing].bodyBaselinePx`.
 * Omitting it (as every `buildCtx(...)`-calling test in this repo except
 * the paragraph/bullets/callout/three-tier suites does) falls back to
 * `PACING_BUDGETS.balanced.bodyBaselinePx` (24px) — the narrative default,
 * so a test that doesn't care about body-text sizing still gets the
 * ambient value a caller with an omitted/default narrative would.
 *
 * `chartPaletteOffset` (`./chart-palette.ts`): passed through as its own
 * `ComponentCtx` field so `components/chart.tsx` can rotate
 * `colors.chartPalette` at the chart seam. `colors.chartPalette` itself is
 * never rotated here — motifs that destructure it by fixed position for
 * decoration must see the theme's declared order. FullSlideSvg always
 * passes `0`, so the declared `chartPalette` order is the series order.
 */
export function buildCtx(
  tokens: StyleTokens,
  images: PptxIR["assets"]["images"],
  components?: Component[],
  defaultBg?: string,
  bodyFontPx?: number,
  chartPaletteOffset?: number,
): ComponentCtx {
  return {
    colors: tokens.colors,
    shape: tokens.shape,
    fonts: {
      heading: resolveFontStack(tokens.fonts.heading, "heading"),
      body: resolveFontStack(tokens.fonts.body, "body"),
      mono: resolveFontStack(tokens.fonts.mono ?? [], "mono"),
    },
    images,
    blockIndex: components ? new Map(components.map((component, i) => [component, i])) : undefined,
    defaultBg: defaultBg ?? tokens.colors.bg,
    bodyFontPx: bodyFontPx ?? PACING_BUDGETS.balanced.bodyBaselinePx,
    chartPaletteOffset,
    themeId: tokens.id,
  }
}

export interface FullSlideSvgProps {
  ir: PptxIR
  slide: Slide
  index: number
  className?: string
  preserveAspectRatio?: string
}

/** 四页型 layout 共用同一签名（layouts/types.ts 逐个定义但结构相同）。 */
type PageLayout = (p: SvgTemplateProps) => ReactElement

/** `slide.type` → 该页型的 layout 注册表（Wave 1-3 各自建的四张表）。 */
const PAGE_LAYOUT_REGISTRIES: Record<Slide["type"], Record<string, PageLayout>> = {
  cover: COVER_LAYOUTS,
  chapter: CHAPTER_LAYOUTS,
  content: CONTENT_LAYOUTS,
  ending: ENDING_LAYOUTS,
}

type SvgNodeProps = Record<string, unknown> & {
  children?: ReactNode
  opacity?: number | string
}
const MOTIF_PAINT_TAGS = new Set(["rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text", "image"])

/** Put menu intensity on painted leaves because svg2pptx does not inherit group opacity. */
function scaleMotifLeafOpacity(node: ReactNode, factor: number): ReactNode {
  if (!isValidElement<SvgNodeProps>(node)) return node
  if (node.type === Fragment) {
    return cloneElement(
      node,
      undefined,
      Children.map(node.props.children, (child) => scaleMotifLeafOpacity(child, factor)),
    )
  }
  if (typeof node.type !== "string") return node
  if (MOTIF_PAINT_TAGS.has(node.type)) {
    const declared = node.props.opacity === undefined ? 1 : Number(node.props.opacity)
    const opacity = Number.isFinite(declared) ? declared * factor : factor
    return cloneElement(node, { opacity })
  }
  return cloneElement(
    node,
    undefined,
    Children.map(node.props.children, (child) => scaleMotifLeafOpacity(child, factor)),
  )
}

/**
 * The single source of a slide's visuals: one flat `<svg viewBox="0 0 1280 720">`
 * = background + theme body + brand footer. The preview mounts it directly; the
 * exporter serializes it and feeds svg2pptx. Same component → identical output.
 */
export function FullSlideSvg({
  ir,
  slide,
  index,
  className,
  preserveAspectRatio,
}: FullSlideSvgProps) {
  const tokens = resolveStyle(ir.theme.id)
  // The theme's own default background for this slide type, independent of
  // any per-slide `slide.background` override — still needed below as
  // `autoScrimColor`'s source (an asset background's scrim always pulls
  // toward the *theme's* own base tone, never toward anything derived from
  // the image spec itself — see that assignment's own comment) and as
  // `defaultBg`'s own fallback for a slide that sets no override.
  const themeDefaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface)
  // ctx.defaultBg (post-v0.3 W8 fix round, backlog item 1 —
  // `.issues/notes/engineering-history.md` #1): prefer the slide's
  // own `slide.background` override when it sets one, so a layout that
  // paints no panel of its own (and so reads this field to pick readable
  // ink — see `ComponentCtx.defaultBg`'s own doc comment) measures contrast
  // against the background the slide actually renders, not always the
  // theme's per-slide-type default regardless of any override. A gradient
  // override reduces via `resolveOverrideBackgroundHex`'s midpoint policy,
  // not `resolveBackgroundHex`'s `.from` — see that function's own doc
  // comment for why the two intentionally differ. An asset override
  // resolves to `themeDefaultBg` itself — final-review Major finding, this
  // same backlog item's sub-branch fix: `themeDefaultBg` is exactly the
  // color `autoScrimColor` below paints behind text for a content/ending
  // asset background (see `resolveOverrideBackgroundHex`'s own "Asset
  // policy rationale" for the full paint-path justification), so passing it
  // as that function's `paintedFallback` argument makes this agree with
  // what's actually rendered instead of falling back to the unrelated
  // `tokens.colors.surface`. A slide with no override resolves to exactly
  // `themeDefaultBg` above, unchanged from before this fix (invariant
  // verified in `full-slide-svg.test.tsx`).
  const defaultBg = slide.background
    ? resolveOverrideBackgroundHex(slide.background, tokens.colors.surface, themeDefaultBg)
    : themeDefaultBg
  // Pacing remains an editorial input. It supplies the body-text baseline
  // but never participates in menu-face resolution.
  const bodyFontPx =
    PACING_BUDGETS[resolveNarrative(ir.narrative as string | Partial<NarrativeProfile> | undefined).pacing]
      .bodyBaselinePx
  // Theme `chartPalette` declared order is the series order. Offset 0 is
  // the identity rotation (`./chart-palette.ts`).
  const chartPaletteOffset = 0
  const ctx = buildCtx(
    tokens,
    ir.assets.images,
    ir.meta.animation?.elements === "auto" ? slide.components : undefined,
    defaultBg,
    bodyFontPx,
    chartPaletteOffset,
  )
  // This is the only face resolution performed by the renderer. Capacity
  // checks and validation consume the same route record from
  // `layout-selection.ts`, so takeover precedence cannot drift between
  // those paths.
  const effectiveFace = resolveEffectiveFace(ir, slide)
  if (effectiveFace.route === "unresolved") {
    throw new Error(effectiveFace.error ?? `cannot resolve a theme-menu face for "${slide.type}" page`)
  }
  const themeDef = getThemeDefinition(ir.theme.id)
  const page = resolvePageRenderContext(ir, slide, effectiveFace, themeDef)
  const renderIr: PptxIR = page.metadataOn
    ? ir
    : {
        ...ir,
        meta: ir.meta.animation === undefined ? {} : { animation: ir.meta.animation },
      }
  const Decor = page.motifOn && page.motifId !== undefined ? MOTIFS[page.motifId] : undefined
  const motifOpacity = page.motifIntensity === "subtle" ? 0.62 : undefined
  let bgSpec = slide.background ?? tokens.defaultBackgrounds[slide.type]
  // 压图页接管（图片排版 polish，2026-07-09 用户反馈）：cover/chapter 的
  // asset 背景 → 暗遮罩 + 白字 bespoke 版式（ImageCoverPage）——图保持清晰
  // 可辨（此前把图拉回主题底色的雾面 scrim 用户裁决太朦胧）。模板文字色是
  // baked 常量无法反色，故不走模板 Body；主题个性保留在 accent 细节。
  // 2026-07-10 custom→gallery 改造后所有主题都是设计主题，原「custom 裸
  // 背景 + 模型 overlay 直通」特判随之删除（存量 custom deck 落 gallery，
  // 压图页同享暗遮罩接管）。
  const imageCoverTakeover = effectiveFace.route === "image-cover"
  // content/ending 的 asset 背景维持 P1 雾面 scrim（正文密度高，可读性优先）。
  let autoScrimColor: string | undefined
  if (bgSpec.kind === "asset") {
    const { overlay: _ignored, ...withoutOverlay } = bgSpec
    bgSpec = withoutOverlay
    if (!imageCoverTakeover) {
      // `themeDefaultBg` directly, not the slide-background-aware
      // `defaultBg` above — though the two are now (final-review Major
      // finding, this same backlog item's sub-branch fix) provably equal
      // whenever this branch runs: `resolveOverrideBackgroundHex`'s asset
      // case returns exactly this `themeDefaultBg` value, and the
      // no-override path assigns it directly, so `defaultBg ===
      // themeDefaultBg` here either way. Reading `themeDefaultBg` (not
      // `defaultBg`) keeps this assignment independent of `defaultBg`'s own
      // override-resolution path rather than relying on that equality by
      // construction — an asset background has no true colour of its own to
      // scrim toward (a photo isn't reducible to one hex), so this scrim has
      // always pulled the image back toward the *theme's* own base tone for
      // this slide type (see this variable's own doc comment above).
      autoScrimColor = themeDefaultBg
    }
  }
  let pageLayout: { id: string; Component: PageLayout } | null = null
  if (effectiveFace.route === "layout" && effectiveFace.layoutId !== null) {
    const Component = PAGE_LAYOUT_REGISTRIES[slide.type][effectiveFace.layoutId]
    if (Component === undefined) {
      throw new Error(
        `layout registry invariant failed: face "${effectiveFace.layoutId}" has no ${slide.type} renderer`,
      )
    }
    pageLayout = { id: effectiveFace.layoutId, Component }
  }
  // A layout that opens with its own full-bleed colour field hides the theme
  // background completely, and painting one under the other is not free: a
  // browser antialiases the SVG viewport clip whenever the mounted slide's box
  // misses the device pixel grid, so the covered colour survives in the edge
  // column and reads as a pale hairline down the page. See
  // `LayoutDefinition.paintsOwnBackground` (`../layouts/registry.ts`).
  const layoutPaintsBackground = effectiveFace.route === "layout" && effectiveFace.layout?.paintsOwnBackground === true
  let pageBody: ReactNode = null
  if (imageCoverTakeover) {
    pageBody = ImageCoverPage({ ir: renderIr, slide, index, ctx, page })
  } else if (effectiveFace.route === "takeover" && effectiveFace.layoutId !== null) {
    const renderTakeover = getTakeoverRenderer(effectiveFace.layoutId)
    if (renderTakeover === undefined) {
      throw new Error(
        `layout registry invariant failed: takeover "${effectiveFace.layoutId}" has no renderer dispatcher`,
      )
    }
    pageBody = renderTakeover({ ir: renderIr, slide, index, ctx, page })
  } else if (pageLayout) {
    pageBody = pageLayout.Component({
      ir: renderIr,
      slide,
      index,
      ctx,
      page,
      params: effectiveFace.entry?.params,
    })
  }
  const motif =
    Decor && !imageCoverTakeover ? (
      <g data-decor>
        <Decor ir={renderIr} slide={slide} ctx={ctx} page={page} />
      </g>
    ) : null
  const motifDepth: SvgDepthLayers = motif
    ? partitionSvgDepth(motif, { slideType: slide.type })
    : { bg: [], mid: [], fg: [] }
  const keyedMotif = (depth: keyof SvgDepthLayers) => {
    const nodes = motifDepth[depth]
    const paintedNodes =
      motifOpacity === undefined ? nodes : nodes.map((node) => scaleMotifLeafOpacity(node, motifOpacity))
    return paintedNodes.map((node, nodeIndex) => (
      <Fragment key={`motif-${depth}-${nodeIndex}`}>{node}</Fragment>
    ))
  }
  const bodyDepth: SvgDepthLayers = partitionSvgDepth(pageBody, {
    slideType: slide.type,
  })
  const keyedBody = (depth: keyof SvgDepthLayers) =>
    bodyDepth[depth].map((node, nodeIndex) => (
      <Fragment key={`body-${depth}-${nodeIndex}`}>{node}</Fragment>
    ))
  const foregroundBody = pageLayout ? (
    <g data-face={pageLayout.id}>{keyedBody("fg")}</g>
  ) : (
    keyedBody("fg")
  )
  const branding = page.brandOn ? <Branding ir={renderIr} slide={slide} ctx={ctx} page={page} /> : null
  const foreground = (
    <>
      {keyedMotif("fg")}
      {foregroundBody}
      {branding}
    </>
  )
  const midground = (
    <>
      {keyedMotif("mid")}
      <SlideDecor ir={ir} slide={slide} index={index} ctx={ctx} />
      {keyedBody("mid")}
    </>
  )
  const midgroundBackground = resolveMidgroundBackground(keyedBody("bg"), defaultBg)
  const safeMidground = enforceMidgroundContract({
    midground,
    foreground,
    background: midgroundBackground,
    colors: tokens.colors,
  })

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W_PX} ${CANVAS_H_PX}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio={preserveAspectRatio}
    >
      <g data-depth="bg">
        {!layoutPaintsBackground && (
          <Background spec={bgSpec} images={ir.assets.images} autoScrimColor={autoScrimColor} />
        )}
        {keyedMotif("bg")}
        {keyedBody("bg")}
      </g>
      <g data-depth="mid">
        {safeMidground}
      </g>
      <g data-depth="fg">
        {/* `data-face` is a wire-format fossil. The vocabulary merged into
            "layout". The attribute remains the stable layout identifier in
            rendered SVG while the depth engine owns paint order. */}
        {foreground}
      </g>
    </svg>
  )
}
