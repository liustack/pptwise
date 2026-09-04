import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, truncateToUnits } from "../lib/svg-text-layout"
import { Icon } from "../render/icons"
import { graphicInk } from "../render/ink"
import type { ComponentBox, ComponentCtx } from "./types"

type IconCardsComponent = Extract<Component, { type: "icon_cards" }>

/**
 * One icon card's inner body — icon, title, text — measured and drawn
 * without any card shell around it. Shared between the bento panel's own
 * card cells and terminal's exploded icon-card units, which each paint their
 * own shell and hand this the padded content area inside it.
 */

export type IconCardItem = IconCardsComponent["items"][number]

const ICON_SIZE = 24
const GAP_ICON_TITLE = 12
const TITLE_FONT_SIZE = 20
const TITLE_MIN_FONT_SIZE = 16
// Matches callout.tsx/bullets.tsx's own line-height convention for
// body-weight text (`LINE_RATIO` / the 1.4 used in `layoutItems`) — title
// never wraps (`fitSvgLine` only shrinks/truncates a single line), so this
// is a fixed "line box" height reserved for it, not a measured value.
// `titleLineHeight` is derived from this ratio at each call site (default
// TITLE_FONT_SIZE * 1.4 = 28, unless a caller's `titleFontSize` opt overrides
// it — see `IconCardLayoutOptions`), not hoisted to its own module constant.
const TITLE_LINE_HEIGHT_RATIO = 1.4
const GAP_TITLE_TEXT = 8
const TEXT_FONT_SIZE = 16
// 15 * 1.4 = 21, matching the brief's stated line height for the 2-line
// description text.
const TEXT_LINE_HEIGHT_RATIO = 1.4
const TEXT_MAX_LINES = 2

interface IconCardTextLayout {
  title: { text: string; lines: string[]; fontSize: number; lineHeight: number; truncated: boolean }
  text: { lines: string[]; fontSize: number; lineHeight: number; truncated: boolean }
}

/**
 * Bento-only injection point (terminal.tsx's `BENTO_ICON_CARD_TITLE_SIZE`):
 * lets a caller bump the title's *requested* font size without touching this
 * file's own `TITLE_FONT_SIZE` module constant, which `iconCards.render`'s
 * standalone row-card layout (used by the other 5 themes) still reads
 * directly and must stay byte-identical to. Omitted (`undefined`) falls back
 * to `TITLE_FONT_SIZE` everywhere below, so every existing call site is
 * unaffected.
 */
interface IconCardLayoutOptions {
  titleFontSize?: number
  /** 图标尺寸覆盖（terminal bento 卡传更大值增强存在感），缺省共享 ICON_SIZE。 */
  iconSize?: number
  /** Title wrap. Default 1 keeps the standalone row-card byte-identical. */
  titleMaxLines?: number
}

function layoutIconCard(
  item: IconCardItem,
  contentW: number,
  opts: IconCardLayoutOptions = {}
): IconCardTextLayout {
  const titleFontSize = opts.titleFontSize ?? TITLE_FONT_SIZE
  const titleMaxLines = Math.max(1, opts.titleMaxLines ?? 1)
  const titleLineHeight = Math.round(titleFontSize * TITLE_LINE_HEIGHT_RATIO)
  let title: IconCardTextLayout["title"]
  if (titleMaxLines === 1) {
    const fitted = fitSvgLine(item.title, {
      maxWidth: contentW,
      fontSize: titleFontSize,
      minFontSize: TITLE_MIN_FONT_SIZE,
    })
    title = {
      text: fitted.text,
      lines: [fitted.text],
      fontSize: fitted.fontSize,
      lineHeight: titleLineHeight,
      truncated: fitted.truncated,
    }
  } else {
    const laid = layoutSvgText(item.title, {
      maxWidth: contentW,
      fontSize: titleFontSize,
      maxLines: titleMaxLines,
      minPt: TITLE_MIN_FONT_SIZE,
      lineHeightRatio: TITLE_LINE_HEIGHT_RATIO,
      bold: true,
    })
    title = {
      text: laid.lines[0] ?? "",
      lines: laid.lines,
      fontSize: laid.fontSize,
      lineHeight: laid.lineHeight,
      truncated: laid.truncated,
    }
  }
  const wrapped = layoutSvgText(item.text, {
    maxWidth: contentW,
    fontSize: TEXT_FONT_SIZE,
    maxLines: TEXT_MAX_LINES,
    lineHeightRatio: TEXT_LINE_HEIGHT_RATIO,
  })
  // `layoutSvgText` shrinks its returned font size so the *widest wrapped*
  // line fits `contentW`, but that shrink floors at 1px (its own
  // `Math.max(1, ...)`). Text long enough that the post-`maxLines` merged
  // tail line still exceeds `contentW` even at 1px/unit comes back unfit —
  // truncate defensively at the fitted size, the same floor-size fallback
  // bullets.tsx applies locally.
  const maxUnits = contentW / wrapped.fontSize
  const lines = wrapped.lines.map((line) => truncateToUnits(line, maxUnits))
  const text = {
    ...wrapped,
    lines,
    truncated: wrapped.truncated || lines.some((line, i) => line !== wrapped.lines[i]),
  }
  return { title, text }
}

/**
 * Pure content height (icon + gaps + title's single line + text's 1-2
 * lines) — deliberately excludes any padding, so a caller with its own
 * padding convention (this file's PAD_TOP/PAD_BOTTOM, or terminal.tsx's
 * BENTO_CARD_TOP_PAD/BOTTOM_PAD) can subtract its own budget and compare,
 * exactly mirroring `kpi.tsx`/terminal.tsx's `kpiContentHeight` split.
 */
export function iconCardContentHeight(
  item: IconCardItem,
  contentW: number,
  opts: IconCardLayoutOptions = {}
): number {
  const iconSize = opts.iconSize ?? ICON_SIZE
  const { title, text } = layoutIconCard(item, contentW, opts)
  return (
    iconSize +
    GAP_ICON_TITLE +
    title.lines.length * title.lineHeight +
    GAP_TITLE_TEXT +
    text.lines.length * text.lineHeight
  )
}

/**
 * Render one card's icon/title/text inside `box` — `box` is already the
 * *padded content area* (its top-left is where the icon starts, its width is
 * the text-wrap budget). Does not paint the card shell —
 * callers compose those separately (this file's `iconCards.render` paints a
 * surface shell; `templates/terminal.tsx`'s exploded tiles paint
 * their own outline shell instead), mirroring `renderKpiCardBody`'s
 * content-only contract in terminal.tsx.
 */
export function renderIconCardBody(
  item: IconCardItem,
  box: ComponentBox,
  ctx: ComponentCtx,
  opts: IconCardLayoutOptions = {}
): React.ReactElement {
  const iconSize = opts.iconSize ?? ICON_SIZE
  const { title, text } = layoutIconCard(item, box.w, opts)
  const titleTopY = box.y + iconSize + GAP_ICON_TITLE
  const textTopY = titleTopY + title.lines.length * title.lineHeight + GAP_TITLE_TEXT
  return (
    <>
      <Icon
        name={item.icon}
        x={box.x}
        y={box.y}
        size={iconSize}
        color={graphicInk(ctx.colors.primary, ctx.colors.surface)}
      />
      {title.lines.map((line, i) => (
        <text
          key={`title-${i}`}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={box.x}
          y={titleTopY + i * title.lineHeight + title.fontSize}
          fontSize={title.fontSize}
          fontWeight="600"
          fill={ctx.colors.text}
          fontFamily={ctx.fonts.heading}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}
      {text.lines.map((line, li) => (
        <text
          key={li}
          data-truncated={text.truncated && li === text.lines.length - 1 ? "1" : undefined}
          x={box.x}
          y={textTopY + li * text.lineHeight + text.fontSize}
          fontSize={text.fontSize}
          fill={ctx.colors.muted}
          fontFamily={ctx.fonts.body}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}
    </>
  )
}
