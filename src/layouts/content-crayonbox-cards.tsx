import type { Component } from "@/ir"
import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import {
  CREATIVE_PURPLE,
  CrayonboxDecorPiece,
  CrayonboxSunDoodle,
  GRASS_GREEN,
  SKY_BLUE,
  type DoodleRay,
  withoutOverflowMark,
} from "./crayonbox-shared"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

const CARD_X = [96, 472, 848] as const
const INNER_X = [128, 504, 880] as const
const BADGE_FILL = [SKY_BLUE, "accent", GRASS_GREEN] as const

const FOUR_RAYS: readonly DoodleRay[] = [
  { x1: 0, y1: -16, x2: 0, y2: -22 },
  { x1: 0, y1: 16, x2: 0, y2: 22 },
  { x1: 16, y1: 0, x2: 22, y2: 0 },
  { x1: -16, y1: 0, x2: -22, y2: 0 },
]

function exactCardBlock(slide: SvgTemplateProps["slide"]): NumberedCards | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]
  return only?.type === "numbered_cards" ? only : null
}

function cardBodyLines(item: NumberedCards["items"][number], fontFamily: string) {
  if (item.sub?.trim()) {
    return [item.text, item.sub]
      .filter((line): line is string => Boolean(line?.trim()))
      .slice(0, 2)
      .map((line) =>
        fitSvgLine(line, {
          maxWidth: 272,
          fontSize: 19,
          minFontSize: 16,
          fontFamily,
        }),
      )
  }
  if (!item.text?.trim()) return []
  const body = layoutSvgText(item.text, {
    maxWidth: 272,
    fontSize: 19,
    maxLines: 2,
    lineHeightRatio: 30 / 19,
    fontFamily,
  })
  return body.lines.map((line, index) => ({
    text: line,
    fontSize: body.fontSize,
    truncated: body.truncated && index === body.lines.length - 1,
  }))
}

/** crayonbox-cards：三张图画纸卡片组成的满密度内容页。 */
export function CrayonboxCardsContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const border = colors.border ?? colors.muted
  const sectionSource = sectionNameFor(ir.slides, index)
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: 156,
        fontSize: 17,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const titleSource = stripEmphasis(slide.heading ?? "")
  const title = titleSource.trim()
    ? fitSvgLine(titleSource, {
        maxWidth: 920,
        fontSize: 44,
        minFontSize: 28,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const conclusionSource = slide.subheading?.trim() || slide.footnote?.trim() || ""
  const conclusion = conclusionSource
    ? fitSvgLine(stripEmphasis(conclusionSource), {
        maxWidth: 1088,
        fontSize: 20,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const block = exactCardBlock(slide)
  const dropped = block ? Math.max(0, block.items.length - 3) : 0
  const cards = (block?.items.slice(0, 3) ?? []).map((item, cardIndex) => ({
    item,
    x: CARD_X[cardIndex]!,
    innerX: INNER_X[cardIndex]!,
    badgeFill: BADGE_FILL[cardIndex] === "accent" ? colors.accent : BADGE_FILL[cardIndex]!,
    title: fitSvgLine(item.title, {
      maxWidth: 272,
      fontSize: 26,
      minFontSize: 18,
      fontFamily: fonts.heading,
      bold: true,
    }),
    body: cardBodyLines(item, fonts.body),
  }))

  return (
    <>
      <CrayonboxDecorPiece id="sun" colors={colors}>
        <CrayonboxSunDoodle x={1236} y={30} r={11} strokeWidth={3} rays={FOUR_RAYS} />
      </CrayonboxDecorPiece>
      <CrayonboxDecorPiece id="stars" colors={colors}>
        <text x={1246} y={88} fontFamily={fonts.heading} fontSize={22} fill={colors.accent} dominantBaseline="alphabetic">
          ★
        </text>
        <text x={1232} y={118} fontFamily={fonts.heading} fontSize={18} fill={CREATIVE_PURPLE} dominantBaseline="alphabetic">
          ★
        </text>
      </CrayonboxDecorPiece>

      {section && (
        <>
          <rect x={96} y={94} width={196} height={36} rx={18} fill={SKY_BLUE} />
          <text
            data-truncated={section.truncated ? "1" : undefined}
            x={116}
            y={119}
            fontFamily={fonts.body}
            fontSize={section.fontSize}
            fontWeight="500"
            fill={accessibleInk(colors.text, SKY_BLUE, section.fontSize)}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(section.text)}
          </text>
        </>
      )}

      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={96}
          y={196}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}

      {block ? (
        <g data-dropped={dropped > 0 ? dropped : undefined}>
          {cards.map((card, cardIndex) => (
            <g key={cardIndex}>
              <rect
                x={card.x}
                y={248}
                width={336}
                height={330}
                rx={22}
                fill={colors.surface}
                stroke={border}
                strokeWidth={1.5}
              />
              <rect x={card.innerX} y={284} width={56} height={56} rx={18} fill={card.badgeFill} />
              <text
                x={card.innerX + 28}
                y={323}
                textAnchor="middle"
                fontFamily={fonts.heading}
                fontSize={30}
                fontWeight="700"
                fill={accessibleInk(colors.text, card.badgeFill, 30)}
                dominantBaseline="alphabetic"
              >
                {cardIndex + 1}
              </text>
              <text
                data-truncated={card.title.truncated ? "1" : undefined}
                x={card.innerX}
                y={410}
                fontFamily={fonts.heading}
                fontSize={card.title.fontSize}
                fontWeight="700"
                fill={accessibleInk(colors.text, colors.surface, card.title.fontSize)}
                dominantBaseline="alphabetic"
              >
                {withoutOverflowMark(card.title.text)}
              </text>
              {card.body.map((line, lineIndex) => (
                <text
                  key={lineIndex}
                  data-truncated={line.truncated ? "1" : undefined}
                  x={card.innerX}
                  y={452 + lineIndex * 30}
                  fontFamily={fonts.body}
                  fontSize={line.fontSize}
                  fill={accessibleInk(colors.muted, colors.surface, line.fontSize)}
                  dominantBaseline="alphabetic"
                >
                  {withoutOverflowMark(line.text)}
                </text>
              ))}
            </g>
          ))}
        </g>
      ) : (
        <SvgContent
          components={slide.components}
          rect={{ x: 96, y: 248, w: 1088, h: 330 }}
          ctx={ctx}
        />
      )}

      {conclusion && (
        <text
          data-truncated={conclusion.truncated ? "1" : undefined}
          x={96}
          y={632}
          fontFamily={fonts.body}
          fontSize={conclusion.fontSize}
          fill={accessibleInk(colors.text, bg, conclusion.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(conclusion.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  id: "crayonbox-cards",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
    { name: "meta", accepts: [] },
  ],
  arrangements: "all",
} satisfies LayoutDefinition
