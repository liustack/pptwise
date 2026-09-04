import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { metaInk, readableOn } from "../render/ink"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type DeviceMockupComponent = Extract<Component, { type: "device_mockup" }>

/**
 * Height cap (px), same derivation and same number as `image.tsx`'s
 * `MAX_IMAGE_H` — both components occupy one visual-primary slot in the
 * same content-rect budget (smallest theme content-rect height ~380px minus
 * a caption/frame allowance), so they share the same ceiling rather than
 * inventing a second number for what is the same geometric constraint.
 */
const MAX_DEVICE_H = 340

// ── window bar geometry ────────────────────────────────────────────
/** Top window bar height — enough for 3 traffic-light dots + a url pill at
 * a legible size, same order of magnitude as `image.tsx`'s 32px caption band. */
const FRAME_BAR_H = 32
const DOT_R = 4
const DOT_GAP = 8
const DOT_START_X = 16
const URLBAR_H = 18
const URLBAR_PAD_X = 10
const URLBAR_GAP = 12
const BROWSER_RADIUS = 8

/**
 * Fixed fraction `colors.surface` blends toward `readableOn(bg)` ink to
 * derive the frame bar's own fill (review fix round, Important-2). On a
 * near-black theme (terminal: bg #060A13 vs surface #0A101C) plain `colors
 * .surface` reads as indistinguishable from the page behind it, so the
 * window bar — the component's whole "this is really running" signal —
 * disappeared into the background. `mixHex` (`./color-mix.ts`, the same
 * "blend a token toward another token" primitive `pest.tsx`/`bmc.tsx` already
 * use at this exact 0.14 fraction for their own tinted panels) pushes the
 * fill a fixed, deterministic step toward whichever neutral ink
 * `readableOn` already picked as maximally distinct from `bg` — guaranteed
 * separation on any theme where surface≈bg, imperceptible-to-harmless on
 * themes where they already differ (light themes with pure-white surface
 * read as a faint grey toolbar instead, matching a real OS browser window bar).
 * No baked hex, no per-theme branch — purely token-derived.
 */
const FRAME_BAR_MIX = 0.14
/** The url pill is a second, further step past the bar it's inset into —
 * same primitive, doubled fraction — so it reads as its own nested layer
 * instead of matching the bar it sits on. */
const URL_PILL_MIX = FRAME_BAR_MIX * 2

/** Browser frame's own aspect ratio (裁定 3: "~16:10 含 window bar" — a
 * shallow, landscape "browser window" proportion). */
const BROWSER_ASPECT = 1.6

/**
 * Smallest browser frame that is still a browser window.
 *
 * Width comes from the window bar's own furniture: three traffic-light dots
 * inset `DOT_START_X` from the left edge need the same inset clear on the
 * right, so the bar cannot be narrower than both insets plus the dots and the
 * gaps between them. Height is the bar plus a screen at least as deep as the
 * bar itself — under that the "window" is more chrome than content, and what
 * it frames is no longer a screen anyone can read.
 */
const MIN_BROWSER_W = DOT_START_X * 2 + DOT_R * 6 + DOT_GAP * 2
const MIN_BROWSER_H = FRAME_BAR_H * 2

/**
 * The browser frame's drawn size inside a `w`-wide, optionally `maxH`-tall
 * slot, or `null` when the slot is too small to hold a legal window.
 *
 * The cap takes width off the frame, not depth. Capping the height alone left
 * the frame as wide as its slot: in a 1104px content rect the window came out
 * 1104x340, a 3.2:1 letterbox no browser has ever been, and the 16:9
 * screenshot inside it got `slice`-cropped to its middle third — the page
 * header and the chart's axis were both off-screen. The frame keeps
 * `BROWSER_ASPECT` and is centered in the slot, the same posture
 * `phoneFrameSize` already takes for a portrait device in a wide column.
 *
 * Nothing here ever exceeds the slot. A floor that raised a short slot's frame
 * back up to a minimum bar height did exactly that — a 400x20 slot drew a
 * 53x33 window, 13px taller than the box it was given. A slot that cannot hold
 * the smallest legal window gets `null` and the component declines.
 */
function browserFrameSize(w: number, maxH?: number): { w: number; h: number } | null {
  const ceiling = Math.min(MAX_DEVICE_H, maxH ?? Number.POSITIVE_INFINITY)
  const h = Math.min(Math.round(w / BROWSER_ASPECT), ceiling)
  const frameW = Math.min(w, Math.round(h * BROWSER_ASPECT))
  if (frameW < MIN_BROWSER_W || h < MIN_BROWSER_H) return null
  return { w: frameW, h }
}

/**
 * Rounded-top, square-bottom bar path (verbatim technique from
 * `roadmap.tsx`/`insight-panel.tsx`'s own `roundedTopBarPath` — svg2pptx's
 * arc-segment support already handles this shape; duplicated per-component
 * rather than shared, matching those two files' own precedent) — the top
 * frame bar's corners follow the outer frame's own radius so the bar never
 * overhangs the frame's rounded top corners, while its bottom edge stays
 * square where it meets the screen.
 */
function roundedTopBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h)
  return (
    `M ${x} ${y + rr} ` +
    `A ${rr} ${rr} 0 0 1 ${x + rr} ${y} ` +
    `L ${x + w - rr} ${y} ` +
    `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} ` +
    `L ${x + w} ${y + h} ` +
    `L ${x} ${y + h} Z`
  )
}

// ── device frame geometry ───────────────────────────────────────────────
/** Portrait height:width ratio (裁定 3: "~9:19 竖构图") — a modern
 * edge-to-edge phone silhouette, not the wider iPhone-classic 9:16. */
const PHONE_ASPECT = 19 / 9
const PHONE_BEZEL = 10
const PHONE_RADIUS = 32
const PHONE_NOTCH_W = 90
const PHONE_NOTCH_H = 18
const PHONE_HOME_W = 90
const PHONE_HOME_H = 4
const PHONE_HOME_MARGIN = 8

/**
 * Smallest phone body that can still carry its own furniture.
 *
 * Width: two bezels plus a screen at least as wide as the notch is deep —
 * under that the notch comes out wider than it is tall and stops reading as a
 * notch. Height: two bezels plus the home indicator and the margin holding it
 * off the bottom edge.
 */
const MIN_PHONE_W = PHONE_BEZEL * 2 + PHONE_NOTCH_H
const MIN_PHONE_H = PHONE_BEZEL * 2 + PHONE_HOME_MARGIN + PHONE_HOME_H

/**
 * A notch or home indicator never wider than the screen it sits over.
 *
 * Both were fixed at 90px, so a body narrower than that hung them off its own
 * sides: a 600x100 slot draws a 47px-wide phone with 90px controls, 21px of
 * each protruding into the page on both sides. They now shrink with the body
 * and keep the constants as their natural size on a body wide enough for them.
 */
function phoneControlW(deviceW: number, naturalW: number): number {
  return Math.min(naturalW, deviceW - PHONE_BEZEL * 2)
}

/**
 * Phone frame's own natural size at a `MAX_DEVICE_H`-tall budget, clamped to
 * the column width `w` when the column itself is narrower than that natural
 * width (裁定 3's own flagged risk: "phone 窄高构图在列布局里的表现要人检" —
 * this is the resulting maxH constraint, `MAX_IMAGE_H` precedent applied to
 * a portrait aspect instead of a landscape one). The device is centered
 * horizontally within `w` at render time — a phone mockup is never
 * stretched to fill a wide column, it stays phone-shaped.
 *
 * `null` when the slot cannot hold a legal body. The old floor forced a body
 * at least `PHONE_BEZEL * 2 + 1` deep whatever the slot said, and clamped no
 * width at all, so a 15px-wide slot produced a body narrower than its own two
 * bezels and a screen of negative width.
 */
function phoneFrameSize(w: number, maxH?: number): { w: number; h: number } | null {
  const ceiling = Math.min(MAX_DEVICE_H, maxH ?? Number.POSITIVE_INFINITY)
  const budgetH = Math.min(Math.round(w * PHONE_ASPECT), ceiling)
  const deviceW = Math.min(w, Math.floor(budgetH / PHONE_ASPECT))
  const deviceH = Math.round(deviceW * PHONE_ASPECT)
  if (deviceW < MIN_PHONE_W || deviceH < MIN_PHONE_H) return null
  return { w: deviceW, h: deviceH }
}

/** Missing-asset placeholder — identical fallback to `image.tsx`'s (裁定 2's
 * iron rule: never render fake screen content, the only raster exit is a
 * real asset's `<image>`). Drawn inside the screen's own local coordinate
 * space (0,0)-(w,h), same as every caller below passes it. */
function ScreenPlaceholder({ w, h, ctx }: { w: number; h: number; ctx: ComponentCtx }) {
  return (
    <>
      <rect x={0} y={0} width={w} height={h} fill={ctx.colors.surface} />
      <text
        textAnchor="middle"
        x={w / 2}
        y={h / 2}
        fill={ctx.colors.muted}
        fontFamily={ctx.fonts.body}
        dominantBaseline="alphabetic"
      >
        Image missing
      </text>
    </>
  )
}

/** Caption band — verbatim style copy of `image.tsx`'s bottom color band
 * (primary bg 88% opacity + centered white text), rendered inside the
 * screen's own local coordinate space so it never collides with either
 * device's own frame (browser's top bar, phone's bezel/home-indicator). */
function CaptionBand({
  caption,
  w,
  h,
  ctx,
}: {
  caption: string
  w: number
  h: number
  ctx: ComponentCtx
}) {
  const fitted = fitSvgLine(caption, { maxWidth: w - 24, fontSize: 16, minFontSize: 16 })
  return (
    <>
      <rect x={0} y={h - 32} width={w} height={32} fill={ctx.colors.primary} fillOpacity={0.88} />
      <text
        data-truncated={fitted.truncated ? "1" : undefined}
        x={w / 2}
        y={h - 11}
        textAnchor="middle"
        fontSize={fitted.fontSize}
        fill={ctx.colors.surface}
        fontFamily={ctx.fonts.body}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
      </text>
    </>
  )
}

export const deviceMockup: SvgComponent<DeviceMockupComponent> = {
  measure(component, w) {
    // A slot too small for a legal frame reserves nothing, and `render`
    // declines it with a drop mark rather than drawing an illegal device.
    const size = component.device === "browser" ? browserFrameSize(w) : phoneFrameSize(w)
    return size?.h ?? 0
  },
  render(component, box, ctx) {
    const src = ctx.images?.[component.asset_id]?.src
    // A11Y-01 alt chain (new emission site, plan 裁定 2 + Global Constraint
    // 3): identical single-attribute `aria-label` wiring to `image.tsx` —
    // no `<title>` child, nothing emitted when there's no alt text.
    const alt = ctx.images?.[component.asset_id]?.alt

    if (component.device === "browser") {
      const size = browserFrameSize(box.w, box.h)
      // Declined, not squashed: below `MIN_BROWSER_W` x `MIN_BROWSER_H` there
      // is no window left to draw, and a frame that spills past its own slot
      // is worse than an honest drop mark.
      if (!size) return <DroppedContentMarker count={1} />
      const { w: frameW, h: frameH } = size
      const offsetX = (box.w - frameW) / 2
      const screenH = frameH - FRAME_BAR_H
      const dotsRightEdge = DOT_START_X + 2 * (DOT_R * 2 + DOT_GAP) + DOT_R
      const urlBarX = dotsRightEdge + URLBAR_GAP
      const urlBarW = frameW - urlBarX - DOT_START_X
      const fittedUrl =
        component.url && urlBarW > URLBAR_PAD_X * 2
          ? fitSvgLine(component.url, { maxWidth: urlBarW - URLBAR_PAD_X * 2, fontSize: 16, minFontSize: 16 })
          : undefined
      // `defaultBg ?? colors.bg` — same fallback precedent as `readableOn`'s
      // other layout call sites (e.g. chapter-rail-chapter.tsx): the
      // device sits directly on whatever the slide actually paints behind
      // it, not always the theme's bare `colors.bg`.
      const frameInk = readableOn(ctx.defaultBg ?? ctx.colors.bg)
      const frameBarFill = mixHex(ctx.colors.surface, frameInk, FRAME_BAR_MIX)
      const urlPillFill = mixHex(ctx.colors.surface, frameInk, URL_PILL_MIX)

      return (
        // `data-device-mockup` is the machine-findable mark that the frame was
        // actually drawn. A takeover face that paints only the screen contents
        // turns this component into an `image` and loses the one thing it is
        // for, so tests and the gallery corpus check assert this attribute per
        // face rather than eyeballing a bezel.
        <g data-device-mockup="browser" transform={`translate(${box.x + offsetX},${box.y})`}>
          <path d={roundedTopBarPath(0, 0, frameW, FRAME_BAR_H, BROWSER_RADIUS)} fill={frameBarFill} />
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={DOT_START_X + i * (DOT_R * 2 + DOT_GAP)}
              cy={FRAME_BAR_H / 2}
              r={DOT_R}
              fill={ctx.colors.muted}
            />
          ))}
          {fittedUrl && urlBarW > URLBAR_PAD_X * 2 && (
            <>
              <rect
                x={urlBarX}
                y={(FRAME_BAR_H - URLBAR_H) / 2}
                width={urlBarW}
                height={URLBAR_H}
                rx={URLBAR_H / 2}
                fill={urlPillFill}
              />
              <text
                data-truncated={fittedUrl.truncated ? "1" : undefined}
                // Tier B, meta-information (docs/contrast-system.md's
                // three-tier policy): a browser address bar is real
                // information (it's the whole "this is really running"
                // signal p09's evidence names) but deliberately understated
                // window-bar text, not page content. Same tier as a copyright
                // line or page number, not tier A body copy. `metaInk`
                // blends `colors.muted` toward `readableOn` only as far as
                // the tier's 3:1 hard floor requires against the url pill's
                // own `urlPillFill` (review fix round, Important-2: the pill
                // paints its own derived surface underneath this text, not
                // the ambient page background — was `colors.bg` before that
                // fill itself became token-mixed instead of a flat token).
                // `data-contrast-tier="meta"` tells deck-audit's contrast
                // walk to hold this text to 3:1 instead of the default
                // 4.5:1 (same protocol as `ending-rail-ending.tsx`'s
                // copyright line / `ending-banner-ending.tsx`'s own — see
                // `deck-audit.ts`'s `META_CONTRAST_TIER`).
                data-contrast-tier="meta"
                x={urlBarX + URLBAR_PAD_X}
                y={FRAME_BAR_H / 2 + 4}
                fontSize={fittedUrl.fontSize}
                fill={metaInk(ctx.colors.muted, urlPillFill)}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {fittedUrl.text}
              </text>
            </>
          )}
          <g transform={`translate(0,${FRAME_BAR_H})`}>
            {src ? (
              <image
                href={src}
                x={0}
                y={0}
                width={frameW}
                height={screenH}
                preserveAspectRatio="xMidYMid slice"
                aria-label={alt || undefined}
              />
            ) : (
              <ScreenPlaceholder w={frameW} h={screenH} ctx={ctx} />
            )}
            {component.caption && <CaptionBand caption={component.caption} w={frameW} h={screenH} ctx={ctx} />}
          </g>
          <rect
            x={0.5}
            y={0.5}
            width={frameW - 1}
            height={frameH - 1}
            rx={BROWSER_RADIUS}
            fill="none"
            stroke={ctx.colors.border ?? ctx.colors.muted}
            strokeWidth={1}
          />
        </g>
      )
    }

    // device === "phone"
    const phone = phoneFrameSize(box.w, box.h)
    if (!phone) return <DroppedContentMarker count={1} />
    const { w: deviceW, h: deviceH } = phone
    const offsetX = (box.w - deviceW) / 2
    const notchW = phoneControlW(deviceW, PHONE_NOTCH_W)
    const homeW = phoneControlW(deviceW, PHONE_HOME_W)
    const bodyRadius = Math.min(PHONE_RADIUS, deviceW / 2, deviceH / 2)
    const screenX = PHONE_BEZEL
    const screenY = PHONE_BEZEL
    const screenW = deviceW - PHONE_BEZEL * 2
    const screenH = deviceH - PHONE_BEZEL * 2

    return (
      <g data-device-mockup="phone" transform={`translate(${box.x + offsetX},${box.y})`}>
        <rect x={0} y={0} width={deviceW} height={deviceH} rx={bodyRadius} fill={ctx.colors.border ?? ctx.colors.muted} />
        {/* Square-cornered on purpose (review fix round, Minor-1): this rect
            is always fully occluded by whatever renders on top of it — the
            asset <image> at the exact same box (no corner clipping in the
            svg2pptx export path) or ScreenPlaceholder's own square-cornered
            rect — so a rounded corner here was never visible. A truly
            rounded phone screen needs clip-path support in the svg2pptx
            export, which is unverified/out of scope here; left as a polish
            item for a future task rather than faked with an invisible rx. */}
        <rect x={screenX} y={screenY} width={screenW} height={screenH} fill={ctx.colors.surface} />
        <g transform={`translate(${screenX},${screenY})`}>
          {src ? (
            <image
              href={src}
              x={0}
              y={0}
              width={screenW}
              height={screenH}
              preserveAspectRatio="xMidYMid slice"
              aria-label={alt || undefined}
            />
          ) : (
            <ScreenPlaceholder w={screenW} h={screenH} ctx={ctx} />
          )}
          {component.caption && <CaptionBand caption={component.caption} w={screenW} h={screenH} ctx={ctx} />}
        </g>
        {/* notch */}
        <rect
          x={(deviceW - notchW) / 2}
          y={0}
          width={notchW}
          height={Math.min(PHONE_NOTCH_H, screenH)}
          rx={Math.min(PHONE_NOTCH_H, screenH) / 2}
          fill={ctx.colors.border ?? ctx.colors.muted}
        />
        {/* home indicator */}
        <rect
          x={(deviceW - homeW) / 2}
          y={deviceH - PHONE_HOME_MARGIN - PHONE_HOME_H}
          width={homeW}
          height={PHONE_HOME_H}
          rx={PHONE_HOME_H / 2}
          fill={ctx.colors.surface}
          fillOpacity={0.9}
        />
      </g>
    )
  },
}

export const renderDef: RenderDef<DeviceMockupComponent> = {
  type: "device_mockup",
  measure: deviceMockup.measure,
  render: deviceMockup.render,
}
