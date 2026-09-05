import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { FORM_BODY_FLOOR, paintedWidthCeiling } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type WordCloudComponent = Extract<Component, { type: "word_cloud" }>
type Word = WordCloudComponent["words"][number]

/**
 * word_cloud：8-20 个词按四档字号从中心向外贪心排布。
 *
 * **排布是确定的。** 没有随机数、没有时间、没有主题分支：同一份词表在同一
 * 个盒子里每次都落在同样的位置，所以画廊的哈希、导出的快照、跨语言巡检
 * 都稳定。顺序是「字号从大到小，同档按作者写的顺序」，位置是一条阿基米德
 * 螺线上第一个既不出框、又不与已放词相交的落点。
 *
 * **宽度按真实字形的上界算**（`paintedWidthCeiling`），中西文同一把尺子。
 * 共享度量器对大多数文字只有分类平均值——66px 的 "LDAP" 估宽 148px、实际画到
 * 170px——所以碰撞盒按估算值加一档余量，再留 `GAP` 的安全间隙。用估算矩形
 * 互不相交去证明真实文字互不相交是不成立的：两个词的估算盒挨着，画出来就压在
 * 一起，ink、runway、journal、luxe、heritage、museum、lecture、memo 都复现过。
 *
 * **装不下先缩档再声明。** 一轮排不完就把四档一起按 `SHRINK_STEPS` 收一档
 * 重排，收到最后一档仍排不完的词不画、也不在页面上留任何提示，只打
 * `data-dropped`（导出因此被拒，作者去删词）。词不旋转：竖排的词是装饰，
 * 读者要横着读。
 *
 * **四档必须还是四档。** 每个词的字号都有 `FORM_BODY_FLOOR` 下限，收得太狠时
 * 权重 1 和权重 2 会一起落到 16px，页面上只剩三种字号，最低两档连字重和颜色
 * 也一样——作者写了四档，读者只看得见三档。所以每一档缩完先验分档
 * （`TIER_STEP`），分不开的那一档整档作废，四档都分不开就声明容量不足。
 */

/** Tier 4 is the largest. Ratios read off the approved artboard (46/32/24/18). */
const TIER_RATIO: Record<Word["weight"], number> = { 4: 1, 3: 0.696, 2: 0.522, 1: 0.391 }
/** Every tier is shrunk by the same factor before the packing is retried. */
const SHRINK_STEPS = [1, 0.92, 0.84, 0.76, 0.68] as const
const PANEL_PAD = 20
const GAP = 7
const LINE_RATIO = 1.16
const SPIRAL_STEP = 0.26
const SPIRAL_GROWTH = 2.4
const SPIRAL_TURNS = 2600
/** The vertical squeeze that makes the drift fill a 16:9 panel rather than a disc. */
const SPIRAL_ASPECT = 0.5
/** Adjacent tiers must differ by at least this ratio to read as two sizes. */
const TIER_STEP = 1.12
const MAX_TOP_SIZE = 72
const MIN_TOP_SIZE = 34
const NATURAL_H = 380

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface PlacedWord extends Rect {
  readonly word: Word
  readonly fontSize: number
}

export interface Packing {
  readonly placed: readonly PlacedWord[]
  readonly dropped: number
  readonly scale: number
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP
}

/**
 * The four sizes at one shrink step, or `null` when the step has collapsed
 * two of the tiers the words actually use into one size.
 *
 * Only the tiers present in the word list are checked: a list written in two
 * weights is two sizes by the author's own choice, not a collapse.
 */
function tierSizes(base: number, scale: number, used: ReadonlySet<Word["weight"]>): Record<Word["weight"], number> | null {
  const sizes = {
    1: Math.max(FORM_BODY_FLOOR, Math.round(base * scale * TIER_RATIO[1])),
    2: Math.max(FORM_BODY_FLOOR, Math.round(base * scale * TIER_RATIO[2])),
    3: Math.max(FORM_BODY_FLOOR, Math.round(base * scale * TIER_RATIO[3])),
    4: Math.max(FORM_BODY_FLOOR, Math.round(base * scale * TIER_RATIO[4])),
  } as Record<Word["weight"], number>
  const present = ([1, 2, 3, 4] as const).filter((w) => used.has(w))
  for (let i = 1; i < present.length; i++) {
    if (sizes[present[i]!] < sizes[present[i - 1]!] * TIER_STEP) return null
  }
  return sizes
}

/** Largest tier size for a panel, before any shrink step. */
function topSize(panelH: number): number {
  return Math.max(MIN_TOP_SIZE, Math.min(MAX_TOP_SIZE, panelH * 0.19))
}

/**
 * Greedy spiral packing. Pure: same words and same panel give the same
 * rectangles, every run. Words are laid largest first, and within a tier in
 * the order the author wrote them.
 */
export function packWords(
  words: readonly Word[],
  panelW: number,
  panelH: number,
  weight: { fontFamily?: string },
): Packing {
  // Heaviest first, and inside a tier by the word itself — a stable key, so
  // the same set of words lands in the same places however the author
  // happened to order them (the schema promises exactly this).
  const ordered = [...words].sort((a, b) => b.weight - a.weight || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
  const used = new Set(words.map((word) => word.weight))
  const base = topSize(panelH)
  let best: Packing | null = null
  for (const scale of SHRINK_STEPS) {
    const sizes = tierSizes(base, scale, used)
    if (sizes === null) continue
    const placed: PlacedWord[] = []
    for (const word of ordered) {
      const fontSize = sizes[word.weight]
      const bold = word.weight >= 3
      const w = paintedWidthCeiling(word.text, fontSize, { bold, fontFamily: weight.fontFamily })
      const h = fontSize * LINE_RATIO
      if (w > panelW || h > panelH) continue
      const cx = panelW / 2
      const cy = panelH / 2
      for (let step = 0; step < SPIRAL_TURNS; step++) {
        const theta = step * SPIRAL_STEP
        const radius = SPIRAL_GROWTH * theta
        const x = cx + radius * Math.cos(theta) - w / 2
        const y = cy + radius * SPIRAL_ASPECT * Math.sin(theta) - h / 2
        if (x < 0 || y < 0 || x + w > panelW || y + h > panelH) continue
        const candidate: Rect = { x, y, w, h }
        if (placed.some((other) => overlaps(candidate, other))) continue
        placed.push({ ...candidate, word, fontSize })
        break
      }
    }
    const packing: Packing = { placed, dropped: words.length - placed.length, scale }
    if (packing.dropped === 0) return packing
    if (best === null || packing.dropped < best.dropped) best = packing
  }
  // Every step either left words out or collapsed two tiers into one size:
  // the panel does not hold this list, and the caller declares it.
  return best ?? { placed: [], dropped: words.length, scale: SHRINK_STEPS[SHRINK_STEPS.length - 1] }
}

/** Which ink a tier is set in, measured against the panel it sits on. */
function tierInk(weight: Word["weight"], fontSize: number, panel: string, ctx: ComponentCtx): string {
  if (weight === 4) return accessibleInk(ctx.colors.primary, panel, fontSize)
  if (weight === 3) return accessibleInk(ctx.colors.text, panel, fontSize)
  return accessibleInk(ctx.colors.muted, panel, fontSize)
}

export const wordCloud: SvgComponent<WordCloudComponent> = {
  measure() {
    return NATURAL_H
  },

  render(component, box, ctx) {
    const h = box.h ?? NATURAL_H
    const panel = ctx.colors.surface
    const panelW = box.w - PANEL_PAD * 2
    const panelH = h - PANEL_PAD * 2
    const radius = ctx.shape?.radius ?? 2
    const border = ctx.colors.cardStroke ?? ctx.colors.border
    const packing = packWords(component.words, panelW, panelH, { fontFamily: ctx.fonts.heading })
    if (packing.placed.length === 0) return <DroppedContentMarker count={component.words.length} kind="label" />

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <rect
          x={0}
          y={0}
          width={box.w}
          height={h}
          rx={radius}
          ry={radius}
          fill={panel}
          stroke={border ?? undefined}
          strokeWidth={border ? 1 : undefined}
        />
        {packing.placed.map((item, i) => (
          <text
            key={`w-${i}`}
            x={PANEL_PAD + item.x}
            y={PANEL_PAD + item.y + item.h - item.fontSize * 0.28}
            fill={tierInk(item.word.weight, item.fontSize, panel, ctx)}
            fontFamily={ctx.fonts.heading}
            fontSize={item.fontSize}
            fontWeight={item.word.weight >= 3 ? "bold" : "normal"}
            dominantBaseline="alphabetic"
          >
            {item.word.text}
          </text>
        ))}
        {packing.dropped > 0 ? <g data-dropped={packing.dropped} data-dropped-kind="label" /> : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<WordCloudComponent> = {
  type: "word_cloud",
  measure: wordCloud.measure,
  render: wordCloud.render,
}
