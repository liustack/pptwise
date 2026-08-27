import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { GaugeMeta, withoutOverflowMark } from "./gauge-shared"

const KICKER_X = 160
const KICKER_Y = 200
const KICKER_SIZE = 16
const KICKER_TRACKING = 6
const KICKER = "NEXT"

const NUMBER_X = 160
const BODY_X = 212
const ITEM_YS = [292, 384, 476] as const
const NUMBER_SIZE = 20
const BODY_SIZE = 36
const BODY_MIN_PT = 22
const BODY_MAX_W = 918

const UNDERLINE_X = 212
const UNDERLINE_Y = 306
const UNDERLINE_W = 252
const UNDERLINE_H = 6

const RULE_X1 = 160
const RULE_X2 = 1130
const RULE_Y = 600

const SIGNOFF_X = 160
const SIGNOFF_Y = 636
const SIGNOFF_SIZE = 16
const SIGNOFF_MAX_W = 970

function bulletItems(slide: SvgTemplateProps["slide"]): string[] {
  const block = slide.components.find((component) => component.type === "bullets")
  if (!block || block.type !== "bullets") return []
  return block.items.slice(0, 3)
}

function splitHeading(text: string): string[] {
  const trimmed = stripEmphasis(text).trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline.slice(0, 3)
  const byCn = trimmed.split(/(?=[一二三四五六七八九十]+、)/).map((line) => line.trim()).filter(Boolean)
  if (byCn.length > 1) return byCn.slice(0, 3)
  const byDot = trimmed.split(/(?=(?:^|\s)\d+[.、]\s*)/).map((line) => line.trim()).filter(Boolean)
  if (byDot.length > 1) return byDot.slice(0, 3)
  return [trimmed]
}

function actionItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = bulletItems(slide)
  return bullets.length > 0 ? bullets : splitHeading(slide.heading ?? "")
}

/** gauge-next：编号行动清单，以第一项下划线作为全页唯一金色记号。 */
export function GaugeNextEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const ruleStroke = colors.border ?? colors.muted
  const items = actionItems(slide).map((item, itemIndex) => ({
    index: String(itemIndex + 1).padStart(2, "0"),
    y: ITEM_YS[itemIndex]!,
    body: fitSvgLine(stripEmphasis(item), {
      maxWidth: BODY_MAX_W,
      fontSize: BODY_SIZE,
      minFontSize: BODY_MIN_PT,
      fontFamily: fonts.heading,
      bold: true,
    }),
  }))
  const signoffSource = slide.subheading?.trim() ?? ""
  const signoff = signoffSource
    ? fitSvgLine(signoffSource, {
        maxWidth: SIGNOFF_MAX_W,
        fontSize: SIGNOFF_SIZE,
        minFontSize: SIGNOFF_SIZE,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <GaugeMeta ir={ir} ctx={ctx} tone="light" />
      <text
        data-contrast-tier="meta"
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.body}
        fontSize={KICKER_SIZE}
        fill={accessibleInk(colors.muted, bg, KICKER_SIZE)}
        letterSpacing={KICKER_TRACKING}
        dominantBaseline="alphabetic"
      >
        {KICKER}
      </text>

      {items.map((item, itemIndex) => (
        <g key={item.index}>
          <text
            x={NUMBER_X}
            y={item.y}
            fontFamily={fonts.heading}
            fontSize={NUMBER_SIZE}
            fontWeight="700"
            fill={accessibleInk(colors.primary, bg, NUMBER_SIZE)}
            dominantBaseline="alphabetic"
          >
            {item.index}
          </text>
          <text
            data-truncated={item.body.truncated ? "1" : undefined}
            x={BODY_X}
            y={item.y}
            fontFamily={fonts.heading}
            fontSize={item.body.fontSize}
            fontWeight="700"
            fill={accessibleInk(itemIndex === 0 ? colors.primary : colors.text, bg, item.body.fontSize)}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(item.body.text)}
          </text>
        </g>
      ))}

      {items.length > 0 && (
        <rect
          x={UNDERLINE_X}
          y={UNDERLINE_Y}
          width={UNDERLINE_W}
          height={UNDERLINE_H}
          fill={colors.accent}
        />
      )}

      <line x1={RULE_X1} y1={RULE_Y} x2={RULE_X2} y2={RULE_Y} stroke={ruleStroke} strokeWidth={1} />

      {signoff && (
        <text
          data-contrast-tier="meta"
          data-truncated={signoff.truncated ? "1" : undefined}
          x={SIGNOFF_X}
          y={SIGNOFF_Y}
          fontFamily={fonts.body}
          fontSize={signoff.fontSize}
          fill={accessibleInk(colors.muted, bg, signoff.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(signoff.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  id: "gauge-next",
  kind: "archetype",
  branding: "none",
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1 },
    { name: "rule", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  // `pinOnly`: consulting locks this face by *listing* it in its own
  // `layouts`, which `resolveLayoutId` honours. Without it the face joins
  // `fullLayoutSet`, the pool the other 23 builtins auto-pick from.
  pinOnly: true,
}
