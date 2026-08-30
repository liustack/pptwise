import type { Component } from "@/ir"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { fitHeadingLines } from "../render/heading-fit"
import { accessibleInk, groupValueInks } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import type { LayoutDefinition } from "./registry"
import { showNeutralFallbackCtx, withoutOverflowMark } from "./show-shared"
import type { SvgTemplateProps } from "./types"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type Bullets = Extract<Component, { type: "bullets" }>

type StatementItem = { title: string; body: string }

function exactStatement(slide: SvgTemplateProps["slide"]): NumberedCards | Bullets | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]
  if (only?.type === "numbered_cards") return only.items.length <= 3 ? only : null
  if (only?.type === "bullets") return only.items.length >= 1 && only.items.length <= 3 ? only : null
  return null
}

function bulletParts(item: string): StatementItem {
  const match = item.match(/^([^:：]{1,24})[:：]\s*(.+)$/s)
  return match ? { title: match[1]!.trim(), body: match[2]!.trim() } : { title: item.trim(), body: "" }
}

function statementItems(block: NumberedCards | Bullets): StatementItem[] {
  if (block.type === "bullets") return block.items.map(bulletParts)
  return block.items.map((item) => ({
    title: item.title,
    body: [item.text, item.sub].filter((value): value is string => Boolean(value?.trim())).join("\n"),
  }))
}

/** show-statement。三点以内的观点内容进入陈述句加三列定稿构图。 */
export function ShowStatementContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const block = exactStatement(slide)
  const items = block ? statementItems(block) : []
  const sectionSource = sectionNameFor(ir.slides, index) ?? ir.meta.organization?.trim() ?? ""
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: 1128,
        fontSize: 15,
        minFontSize: 15,
        fontFamily: fonts.body,
      })
    : null
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: 1152,
    fontSize: 62,
    maxLines: 2,
    minPt: 44,
    lineHeightRatio: 82 / 62,
    fontFamily: fonts.heading,
    bold: true,
  })
  const headingStart = 330 - Math.max(0, heading.lines.length - 1) * 82
  const columns = [64, 464, 864] as const
  const numberInks = groupValueInks(
    items.map(() => ({ preferredFill: colors.primary, backgroundFill: bg, fontSizePx: 40 })),
    colors.text,
  )
  const titleInks = groupValueInks(
    items.map(() => ({ preferredFill: colors.text, backgroundFill: bg, fontSizePx: 24 })),
    colors.text,
  )
  const bodyInks = groupValueInks(
    items.map(() => ({ preferredFill: colors.muted, backgroundFill: bg, fontSizePx: 16 })),
    colors.text,
  )

  return (
    <g data-show-mode={block ? "statement" : "fallback"}>
      <rect data-show-kicker="true" x={64} y={88} width={12} height={12} fill={colors.primary} />
      {section && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={section.truncated ? "1" : undefined}
          x={88}
          y={99}
          fontFamily={fonts.body}
          fontSize={section.fontSize}
          fill={accessibleInk(colors.muted, bg, section.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(section.text)}
        </text>
      )}
      {block ? (
        <>
          {heading.lines.map((line, lineIndex) => (
            <text
              key={lineIndex}
              data-show-statement-line="true"
              data-truncated={heading.truncated && lineIndex === heading.lines.length - 1 ? "1" : undefined}
              x={64}
              y={headingStart + lineIndex * 82}
              fontFamily={fonts.heading}
              fontSize={heading.fontSize}
              fontWeight="700"
              fill={accessibleInk(colors.text, bg, heading.fontSize)}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(line)}
            </text>
          ))}
          <g data-show-accent="true">
            <rect x={64} y={352} width={232} height={7} fill={colors.accent} />
          </g>
          <line x1={64} y1={430} x2={1216} y2={430} stroke={colors.border ?? colors.muted} strokeWidth={1} />
          <g>{items.map((item, itemIndex) => {
            const title = fitSvgLine(item.title, {
              maxWidth: 320,
              fontSize: 24,
              minFontSize: 18,
              fontFamily: fonts.heading,
              bold: true,
            })
            const body = layoutSvgText(item.body, {
              maxWidth: 320,
              fontSize: 16,
              maxLines: 2,
              minPt: 16,
              lineHeightRatio: 26 / 16,
              fontFamily: fonts.body,
              bold: false,
            })
            const x = columns[itemIndex]!
            return (
              <g key={itemIndex}>
                <text
                  x={x}
                  y={498}
                  fontFamily={fonts.heading}
                  fontSize={40}
                  fill={numberInks[itemIndex]}
                  dominantBaseline="alphabetic"
                >
                  {String(itemIndex + 1).padStart(2, "0")}
                </text>
                <text
                  data-truncated={title.truncated ? "1" : undefined}
                  x={x}
                  y={552}
                  fontFamily={fonts.heading}
                  fontSize={title.fontSize}
                  fontWeight="700"
                  fill={titleInks[itemIndex]}
                  dominantBaseline="alphabetic"
                >
                  {withoutOverflowMark(title.text)}
                </text>
                {body.lines.map((line, lineIndex) => (
                  <text
                    key={lineIndex}
                    data-truncated={body.truncated && lineIndex === body.lines.length - 1 ? "1" : undefined}
                    x={x}
                    y={590 + lineIndex * 26}
                    fontFamily={fonts.body}
                    fontSize={body.fontSize}
                    fill={bodyInks[itemIndex]}
                    dominantBaseline="alphabetic"
                  >
                    {withoutOverflowMark(line)}
                  </text>
                ))}
              </g>
            )
          })}</g>
        </>
      ) : (
        <>
          {heading.lines[0] && (
            <text
              data-truncated={heading.truncated ? "1" : undefined}
              x={64}
              y={164}
              fontFamily={fonts.heading}
              fontSize={Math.min(heading.fontSize, 40)}
              fontWeight="700"
              fill={accessibleInk(colors.text, bg, Math.min(heading.fontSize, 40))}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(heading.lines.join(" "))}
            </text>
          )}
          <g data-show-accent="true">
            <rect x={64} y={184} width={96} height={4} fill={colors.accent} />
          </g>
          <line x1={64} y1={200} x2={1216} y2={200} stroke={colors.border ?? colors.muted} strokeWidth={1} />
          <SvgContent
            components={slide.components}
            rect={{ x: 64, y: 230, w: 1152, h: 390 }}
            ctx={showNeutralFallbackCtx(ctx)}
          />
        </>
      )}
    </g>
  )
}

export const layoutDef = {
  id: "show-statement",
  kind: "archetype",
  pinOnly: true,
  suppressMotif: true,
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: "any", capacity: 1 },
    { name: "rule", accepts: [] },
  ],
  arrangements: "all",
  headingFit: {
    maxWidth: 1152,
    fontSize: 62,
    maxLines: 2,
    minPt: 44,
  },
} satisfies LayoutDefinition
