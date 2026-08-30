import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import {
  CrayonboxDecorPiece,
  CrayonboxSunDoodle,
  GRASS_GREEN,
  SKY_BLUE,
  doodleRays,
  withoutOverflowMark,
} from "./crayonbox-shared"

const ITEM_BADGE_YS = [292, 378, 464] as const
const ITEM_TEXT_YS = [329, 415, 501] as const
const BADGE_FILLS = [SKY_BLUE, "accent", GRASS_GREEN] as const

function actionItems(slide: SvgTemplateProps["slide"]): string[] {
  const bullets = slide.components.find((component) => component.type === "bullets")
  if (!bullets || bullets.type !== "bullets") return []
  return bullets.items.slice(0, 3)
}

function contactLine({ ir, slide }: Pick<SvgTemplateProps, "ir" | "slide">): string {
  const subheading = slide.subheading?.trim()
  if (subheading) return subheading
  const contact = ir.meta.contact
  return [contact?.name, contact?.email, contact?.phone, contact?.website].filter(Boolean).join(" · ")
}

function kickerFor(slide: SvgTemplateProps["slide"]): string {
  const corpus = [slide.heading, ...actionItems(slide)].filter(Boolean).join("")
  return /[\u3400-\u9fff]/u.test(corpus) ? "待办清单" : "TO DO"
}

/** crayonbox-todo：三步行动清单，以糖果号牌收束一盒蜡笔主题。 */
export function EndingCrayonboxTodo({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitSvgLine(stripEmphasis(slide.heading ?? ""), {
    maxWidth: 930,
    fontSize: 46,
    minFontSize: 30,
    fontFamily: fonts.heading,
    bold: true,
  })
  const items = actionItems(slide).map((value) =>
    fitSvgLine(stripEmphasis(value), {
      maxWidth: 980,
      fontSize: 30,
      minFontSize: 20,
      fontFamily: fonts.body,
    }),
  )
  const contactSource = contactLine({ ir, slide })
  // 24px, not the board's 22: the contact is inked with the theme's crayon
  // blue through `accessibleInk`, and this repo's large-text line is a flat
  // 24px. At 22 the blue answers the 4.5 body floor instead, fails it, and
  // gets replaced by near-black — the design's blue contact line disappears.
  // The cover's date line is already 24 for the same reason.
  const contact = contactSource
    ? fitSvgLine(contactSource, {
        maxWidth: 1088,
        fontSize: 24,
        minFontSize: 17,
        fontFamily: fonts.body,
        bold: true,
      })
    : null
  const badgeFills = BADGE_FILLS.map((fill) => fill === "accent" ? colors.accent : fill)

  return (
    <>
      <CrayonboxDecorPiece id="sun" colors={colors}>
        <CrayonboxSunDoodle
          x={1160}
          y={132}
          r={38}
          strokeWidth={5}
          rays={doodleRays(52, 68, 37, 48)}
        />
      </CrayonboxDecorPiece>

      <rect x={96} y={120} width={252} height={42} rx={21} fill={SKY_BLUE} />
      <text
        x={118}
        y={148}
        fontFamily={fonts.body}
        fontSize={18}
        fontWeight="500"
        fill={accessibleInk(colors.text, SKY_BLUE, 18)}
        dominantBaseline="alphabetic"
      >
        {kickerFor(slide)}
      </text>

      <text
        data-truncated={title.truncated ? "1" : undefined}
        x={96}
        y={238}
        fontFamily={fonts.heading}
        fontSize={title.fontSize}
        fontWeight="700"
        fill={accessibleInk(colors.text, bg, title.fontSize)}
        dominantBaseline="alphabetic"
      >
        {withoutOverflowMark(title.text)}
      </text>

      <g data-decor-piece="badges">
        {items.map((_, itemIndex) => (
          <rect
            key={`badge-${itemIndex}`}
            x={96}
            y={ITEM_BADGE_YS[itemIndex]}
            width={52}
            height={52}
            rx={16}
            fill={badgeFills[itemIndex]}
          />
        ))}
      </g>

      {items.map((item, itemIndex) => (
        <g key={`item-${itemIndex}`}>
          <text
            x={122}
            y={ITEM_TEXT_YS[itemIndex]}
            fontFamily={fonts.heading}
            fontSize={28}
            fontWeight="700"
            textAnchor="middle"
            fill={accessibleInk(colors.text, badgeFills[itemIndex]!, 28)}
            dominantBaseline="alphabetic"
          >
            {itemIndex + 1}
          </text>
          <text
            data-truncated={item.truncated ? "1" : undefined}
            x={172}
            y={ITEM_TEXT_YS[itemIndex]}
            fontFamily={fonts.body}
            fontSize={item.fontSize}
            fill={accessibleInk(colors.text, bg, item.fontSize)}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(item.text)}
          </text>
        </g>
      ))}

      {contact && (
        <text
          data-truncated={contact.truncated ? "1" : undefined}
          x={96}
          y={600}
          fontFamily={fonts.body}
          fontSize={contact.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, contact.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(contact.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  suppressMotif: true,
  id: "crayonbox-todo",
  kind: "standard",
  pinOnly: true,
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1 },
    { name: "subheading", accepts: [] },
  ],
} satisfies LayoutDefinition
