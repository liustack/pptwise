import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, FORM_TITLE_FLOOR, fitFormLine, layoutFormTitle, paintedWidthCeiling } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type FishboneComponent = Extract<Component, { type: "fishbone" }>

/**
 * 一条脊线指向结果，四到六根肋骨轮流从上下扎进脊线，每根肋骨上挂两三条原因。
 *
 * 几何按实际字号算，不按缩放后的字框算。字号有可读下限，缩放没有：早先的版本
 * 把整张图按 scale 缩小后仍用 16px 画分类 chip，于是 chip 比给它留的位置高一倍，
 * 顶部越界、原因互相压字，页面上却没有任何记号。现在肋骨的长度由实际能用的高度
 * 反推，原因之间的间距、chip 的高度、结果框的行高都用要画的字号本身，装不下就
 * 整幅声明退让。
 *
 * 原因标签一律水平排版：斜着写的字导出后既不可编辑也读不动。结果框是整块
 * primary 填色加反白字——强调只用整块填色，不用边条。
 */

/** Rib angle: how far a rib runs sideways for every unit it rises. */
const RUN_RATIO = 0.667
const RIB_START_PAD = 120
const CHIP_MIN_W = 96
const CHIP_PAD_X = 24
const CHIP_GAP = 8
const HEAD_W = 170
const HEAD_PAD = 14
const HEAD_GAP = 20
const ARROW = 16
/** Where along a rib the causes hang, as a share of the run from the spine. */
const CAUSE_STOPS: Record<number, readonly number[]> = {
  2: [0.4, 0.72],
  3: [0.3, 0.56, 0.82],
}
const TICK = 20
const LABEL_GAP = 6
const CARD_RADIUS = 2
const STEP_MIN = 150
const STEP_MAX = 265
const LINE_RATIO = 1.25

/**
 * Tallest the drawing may ask for. The tightest content rect a component page
 * gets on any theme, once an English heading takes a second line, is 362px —
 * a drawing that asks for more is dropped whole rather than drawn small.
 */
const MAX_H = 350

interface Rib {
  /** Spine anchor, px. */
  x: number
  /** -1 above the spine, +1 below it. */
  side: -1 | 1
  endX: number
  endY: number
}

interface FishboneGeom {
  /** Half the drawing's height: one rib's rise plus the chip hanging off it. */
  half: number
  rise: number
  run: number
  step: number
  ribs: Rib[]
  headX: number
  causeW: number
  h: number
}

/**
 * Pixel geometry for one drawing, or `null` when the height it was given
 * cannot hold the type at its readable floor.
 *
 * The rise is what the height buys: everything else — the rib angle, the
 * spacing between causes, the room a chip needs above the rib end — is
 * derived from it at the size the text will really be painted.
 */
function resolveFishbone(component: FishboneComponent, w: number, allowedH: number): FishboneGeom | null {
  const n = component.ribs.length
  const chipH = FORM_BODY_FLOOR * 1.9
  const half = Math.min(MAX_H, allowedH) / 2
  const rise = half - CHIP_GAP - chipH
  const causes = Math.max(...component.ribs.map((rib) => rib.causes.length))
  const stops = CAUSE_STOPS[causes] ?? CAUSE_STOPS[3]!
  const tightest = Math.min(...stops.slice(1).map((t, i) => t - stops[i]!))
  // Two causes on one rib must clear each other vertically at the size they
  // are painted, and the chip must clear the topmost cause.
  if (rise * tightest < FORM_BODY_FLOOR * LINE_RATIO) return null
  if (rise * (1 - stops[stops.length - 1]!) < FORM_BODY_FLOOR * 0.6) return null

  const run = rise * RUN_RATIO
  const fixed = RIB_START_PAD + HEAD_GAP + ARROW + HEAD_W
  const step = Math.max(STEP_MIN, Math.min(STEP_MAX, (w - fixed) / Math.max(1, n - 1)))
  const ribs: Rib[] = Array.from({ length: n }, (_, i) => {
    const side: -1 | 1 = i % 2 === 0 ? -1 : 1
    const x = RIB_START_PAD + i * step
    return { x, side, endX: x - run, endY: side * rise }
  })
  const headX = ribs[ribs.length - 1]!.x + HEAD_GAP + ARROW
  if (headX + HEAD_W > w + 1) return null
  return {
    half,
    rise,
    run,
    step,
    ribs,
    headX,
    causeW: step - TICK - LABEL_GAP - 10,
    h: half * 2,
  }
}

/** The height this drawing asks for when nothing constrains it. */
function naturalHeight(): number {
  return MAX_H
}

export const fishbone: SvgComponent<FishboneComponent> = {
  measure() {
    return naturalHeight()
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const allowedH = box.h ?? naturalHeight()
    const g = resolveFishbone(component, box.w, allowedH)
    if (!g) return <DroppedContentMarker count={component.ribs.length} kind="item" />

    const border = ctx.colors.border ?? ctx.colors.muted
    const ribStroke = ctx.colors.muted
    const chipSize = FORM_BODY_FLOOR
    const causeSize = FORM_BODY_FLOOR
    const chipH = chipSize * 1.9
    const spineEnd = g.headX - ARROW
    const oy = g.half

    // Everything the author wrote is fitted first, at the size it will be
    // painted, and one cut anywhere declines the whole drawing.
    const headSize = Math.max(FORM_TITLE_FLOOR, Math.min(22, Math.floor(g.half / 6)))
    const head = layoutFormTitle(component.effect, {
      maxWidth: HEAD_W - HEAD_PAD * 2,
      fontSize: headSize,
      maxLines: 3,
      fontFamily: ctx.fonts.heading,
    })
    const chips = component.ribs.map((rib) =>
      fitFormLine(rib.label, {
        maxWidth: g.step - TICK - 20,
        fontSize: chipSize,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      }),
    )
    const causes = component.ribs.map((rib) =>
      rib.causes.map((cause) =>
        fitFormLine(cause, {
          maxWidth: g.causeW,
          fontSize: causeSize,
          floor: FORM_BODY_FLOOR,
          bold: false,
          fontFamily: ctx.fonts.body,
        }),
      ),
    )
    const headH = head.lines.length * head.lineHeight + HEAD_PAD * 2
    if (anyCut([head, ...chips, ...causes.flat()]) || head.lines.length === 0 || headH > g.h) {
      return <DroppedContentMarker count={component.ribs.length} kind="item" />
    }

    const chipInk = accessibleInk(ctx.colors.text, ctx.colors.surface, chipSize)
    const headInk = accessibleInk(ctx.colors.surface, ctx.colors.primary, head.fontSize)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <line x1={0} y1={oy} x2={spineEnd} y2={oy} stroke={ctx.colors.primary} strokeWidth={1.5} />
        <polygon
          points={`${spineEnd},${oy - 8} ${g.headX},${oy} ${spineEnd},${oy + 8}`}
          fill={ctx.colors.primary}
        />
        {g.ribs.map((rib, i) => (
          <line
            key={`rib-${i}`}
            x1={rib.x}
            y1={oy}
            x2={rib.endX}
            y2={oy + rib.endY}
            stroke={ribStroke}
            strokeWidth={1.5}
          />
        ))}
        {g.ribs.map((rib, i) => {
          const chip = chips[i]!
          const chipTextW = paintedWidthCeiling(chip.text, chip.fontSize, { bold: true, fontFamily: ctx.fonts.body })
          const chipW = Math.max(chipTextW + CHIP_PAD_X, CHIP_MIN_W)
          const chipCy = oy + rib.endY + rib.side * (CHIP_GAP + chipH / 2)
          // A chip is sized by its own text, which has a legibility floor the
          // rest of the drawing does not, so it is held inside the box rather
          // than allowed to hang past the edge.
          const chipX = Math.min(Math.max(rib.endX - chipW / 2, 0), Math.max(0, box.w - chipW))
          return (
            <g key={`chip-${i}`}>
              <rect
                x={chipX}
                y={chipCy - chipH / 2}
                width={chipW}
                height={chipH}
                rx={ctx.shape?.radius ?? CARD_RADIUS}
                fill={ctx.colors.surface}
                stroke={border}
                strokeWidth={1}
              />
              <text
                x={chipX + chipW / 2}
                y={chipCy + chip.fontSize * 0.35}
                textAnchor="middle"
                fontFamily={ctx.fonts.body}
                fontSize={chip.fontSize}
                fontWeight="700"
                fill={chipInk}
              >
                {chip.text}
              </text>
            </g>
          )
        })}
        {g.ribs.flatMap((rib, i) => {
          const stops = CAUSE_STOPS[component.ribs[i]!.causes.length] ?? CAUSE_STOPS[3]!
          return causes[i]!.map((label, j) => {
            const t = stops[j] ?? 0.5
            const cx = rib.x - g.run * t
            const cy = oy + rib.side * g.rise * t
            return (
              <g key={`cause-${i}-${j}`}>
                <line x1={cx} y1={cy} x2={cx + TICK} y2={cy} stroke={border} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={3} fill={ribStroke} />
                <text
                  x={cx + TICK + LABEL_GAP}
                  y={cy + label.fontSize * 0.35}
                  fontFamily={ctx.fonts.body}
                  fontSize={label.fontSize}
                  fill={ctx.colors.text}
                >
                  {label.text}
                </text>
              </g>
            )
          })
        })}
        <rect
          x={g.headX}
          y={oy - headH / 2}
          width={HEAD_W}
          height={headH}
          rx={ctx.shape?.radius ?? CARD_RADIUS}
          fill={ctx.colors.primary}
        />
        {head.lines.map((line, li) => (
          <text
            key={`head-${li}`}
            x={g.headX + HEAD_W / 2}
            y={oy - (head.lines.length * head.lineHeight) / 2 + li * head.lineHeight + head.fontSize * 0.9}
            textAnchor="middle"
            fontFamily={ctx.fonts.heading}
            fontSize={head.fontSize}
            fontWeight="700"
            fill={headInk}
          >
            {line}
          </text>
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<FishboneComponent> = {
  type: "fishbone",
  measure: fishbone.measure,
  render: fishbone.render,
}
