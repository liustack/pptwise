import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { resolveDeckFooter } from "../render/footer-marks"
import { blockTag } from "./compositions/shared"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import {
  PORTRAIT_META,
  PORTRAIT_SPEC,
  fitPortrait,
  paintPortrait,
  paintPortraitFigure,
  paintPortraitLine,
  paintPortraitPhoto,
  paintPortraitRule,
  paintPortraitTracked,
  portraitBaseline,
  portraitFigureWidth,
  portraitInks,
  portraitMark,
  portraitMeta,
  portraitText,
  portraitTrackedWidth,
  portraitWidth,
  splitFigure,
} from "./compositions/portrait"
import { FOOTER, portraitFooterLabel, portraitSpeaker } from "./portrait-shared"
import type { HeadingCtx } from "./heading-set"
import { fitLineupClaim } from "./lineup-shared"

type Image = Extract<Component, { type: "image" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/**
 * portrait-cover：人物专访的封面，profile 2026-10 定稿（p01）。
 *
 * 右半版（x640 起）满高是讲者的人像（页面的第一个 `image`，可带 `crop`，
 * 或页面的 `background` 资产，取景偏上，保住脸）。左栏 x80 起、宽 500：顶
 * 上一行场合（页面的 `kicker`，15px 门面色、字距 0.2em）和右端的日期
 * （`meta.date`，14px 灰），y96 一根墨色发丝线。y176 起是讲者的名字（deck 的
 * 第一位作者 `meta.authors[0].name`）衬线 112px 粗体（长名字放不下时逐级缩到 72px），下面是一句话的主张
 * （`heading`）衬线 34px 常规字重，一行放不下在逗号处折，再下面一行 18px：
 * 现在的岗位（作者的 `role`，灰）、一枚细箭头、要去的岗位（`subheading`，
 * 墨色，一行放不下时要去的岗位带着箭头折到下一行）。y500 一根浅发丝线下三格关键数（页面的 `kpi_cards`，数值衬线 40px
 * 粗，单位 18px，格间竖发丝线，最后一格是门面色，名字和注各一行 14px 灰）。
 * 左下角 12px 灰是 deck 的标签和页面的 `footnote`（图片出处）。
 *
 * 不画 motif，不印页码。零 theme id、零 hex。
 */

const LEFT = 80
const COLUMN = 500
const PHOTO = { x: 640, y: 0, w: 640, h: 720, focus: [0.5, 0.2] as const }
const KICKER = { top: 64, lineHeight: 22, size: 15, tracking: 3, dateSize: 14 } as const
const RULE = { y: 96 } as const
// The name keeps to the column the rule above it spans (500), stepping its size down until it does.
const NAME = { top: 176, size: 112, lineHeight: 112, tracking: 0.04, w: COLUMN, floor: 72 } as const
const CLAIM = { size: 34, lineHeight: 48, w: 520, maxLines: 2, gap: 20 } as const
const ROLE = { size: 18, lineHeight: 26, gap: 20, arrow: 28, between: 14 } as const
const FACTS = { top: 500, w: COLUMN, max: 3, pad: 20, inset: 20, value: { size: 40, lineHeight: 40, unit: 18, gap: 4 }, between: 6, label: { size: 14, lineHeight: 21, maxLines: 3 } } as const

/** Why the cover cannot set `block` as its facts, or undefined when it can: it sets each as its figure and unit, its label and its note. */
function factsLeftOut(block: Component): string | undefined {
  return block.type === "kpi_cards" ? fieldsLeftOut(block, "the cover sets each fact as its figure and unit, with its label and its note under it", { items: ["icon", "delta", "tag", "tone", "source"] }) : undefined
}

/** The claim in the serif at its regular weight: on one line down to a twelfth under its size, else over two broken at a comma or a colon. */
function fitClaim(heading: string, ctx: HeadingCtx) {
  const layout = fitLineupClaim(heading, ctx, CLAIM.w, CLAIM.size, CLAIM.lineHeight, CLAIM.maxLines)
  return { ...layout, truncated: layout.truncated || layout.lines.length > CLAIM.maxLines }
}

/** The name's size: 112px, or the largest size down to 72px at which it fits the column, tracked 0.04em. `null` when it fits at none. */
function coverNameSize(name: string, ctx: HeadingCtx): number | null {
  for (let size = NAME.size; size >= NAME.floor; size -= 2) {
    if (portraitTrackedWidth(name, size, size * NAME.tracking, ctx, { serif: true, bold: true }) <= NAME.w) return size
  }
  return null
}

export function PortraitCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const date = stripEmphasis(ir.meta.date ?? "").trim()
  const dateW = date ? portraitWidth(date, KICKER.dateSize, ctx) : 0
  const kickerFits = !kicker || portraitTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) + (date ? dateW + 16 : 0) <= COLUMN
  const name = portraitSpeaker(ir)
  // The name at 112px, or smaller down to 72px when a longer name needs the room ("Chen Lixing").
  const nameSize = name ? coverNameSize(name, ctx) : NAME.size
  const nameFits = !name || nameSize !== null
  const nameAt = nameSize ?? NAME.size
  const claim = slide.heading?.trim() ? fitClaim(slide.heading, ctx) : null
  const role = stripEmphasis(ir.meta.authors?.[0]?.role ?? "").trim()
  const target = stripEmphasis(slide.subheading ?? "").trim()
  const roleW = (role ? portraitWidth(role, ROLE.size, ctx) + ROLE.between * 2 + ROLE.arrow : 0) + (target ? portraitWidth(target, ROLE.size, ctx, { bold: true }) : 0)
  // The role row on one line, or the target on a line of its own under the role, after the arrow.
  const roleSplit = role !== "" && target !== "" && roleW > NAME.w
  const roleLines = roleSplit ? 2 : 1
  const roleFits = roleSplit ? portraitWidth(role, ROLE.size, ctx) <= NAME.w && ROLE.arrow + ROLE.between + portraitWidth(target, ROLE.size, ctx, { bold: true }) <= NAME.w : roleW <= NAME.w
  const facts = boundarySlotBlock(slide, ["kpi_cards"]) as Kpis | undefined
  const colW = FACTS.w / Math.max(1, facts?.items.length ?? 1)
  const factItems = (facts?.items ?? []).map((it, i) => {
    const figure = splitFigure(it.value, it.unit)
    const textW = colW - (i > 0 ? FACTS.inset : 0) - (i < (facts?.items.length ?? 0) - 1 ? 16 : 0)
    return {
      it,
      figure,
      fits: portraitFigureWidth(figure.value, figure.unit, FACTS.value, ctx) <= textW,
      label: fitPortrait(it.note?.trim() ? `${it.label.trim()}\n${it.note.trim()}` : it.label, { width: textW, size: FACTS.label.size, lineHeight: FACTS.label.lineHeight, maxLines: FACTS.label.maxLines }, ctx),
    }
  })
  const factsFit = facts !== undefined && factItems.length <= FACTS.max && factItems.every((f) => f.fits && f.label) && factsLeftOut(facts) === undefined
  const footer = resolveDeckFooter(ir)
  // The cover's mark prints the confidentiality line wherever the deck places it, so the label leaves it out.
  const label = [portraitFooterLabel(footer, { confidentiality: false }), stripEmphasis(slide.footnote ?? "").trim()].filter(Boolean).join("　")
  const labelFits = !label || portraitWidth(label, FOOTER.size, ctx) <= PHOTO.x - LEFT - 20
  // The column from y176: the name, the claim under it, the role under that, each 20px apart.
  const nameTop = NAME.top
  const claimTop = name && nameFits ? nameTop + nameAt + CLAIM.gap : nameTop
  const claimLines = claim && !claim.truncated ? claim.lines.length : 0
  const roleTop = claimTop + claimLines * CLAIM.lineHeight + ROLE.gap
  const roleBase = portraitBaseline(roleTop, ROLE.lineHeight, ROLE.size)
  const roleRoom = roleTop + roleLines * ROLE.lineHeight <= FACTS.top - ROLE.gap
  const lit = factItems.length - 1
  // The dividers run the height of the tallest fact.
  const factLines = Math.max(1, ...factItems.map((f) => f.label?.lines.length ?? 0))
  return (
    <>
      <rect data-portrait-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? paintPortraitPhoto(asset, PHOTO, ctx, { crop: image?.crop, focus: PHOTO.focus }) : null}
      {kicker && kickerFits ? (
        <g data-portrait-occasion={kicker}>{paintPortraitTracked({ ctx, text: kicker, x: LEFT, y: portraitBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: portraitText(inks.lead, ground, KICKER.size) })}</g>
      ) : null}
      {date && kickerFits ? (
        <g data-portrait-date={date}>{paintPortraitLine(date, { ctx, x: LEFT + COLUMN, anchor: "end", baseline: portraitBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.dateSize, fill: portraitText(inks.muted, ground, KICKER.dateSize) })}</g>
      ) : null}
      {paintPortraitRule(LEFT, LEFT + COLUMN, RULE.y + 0.5, inks.ink, 1)}
      {name && nameFits ? (
        <g data-portrait-name={name}>{paintPortraitTracked({ ctx, text: name, x: LEFT, y: portraitBaseline(nameTop, nameAt, nameAt, true), size: nameAt, tracking: nameAt * NAME.tracking, serif: true, bold: true, fill: portraitText(inks.ink, ground, nameAt) })}</g>
      ) : null}
      {claim && !claim.truncated ? <g data-portrait-claim="">{paintPortrait(claim, { ctx, x: LEFT, top: claimTop, serif: true, fill: portraitText(inks.ink, ground, CLAIM.size) })}</g> : null}
      {(role || target) && roleFits && roleRoom ? (
        <g data-portrait-role="">
          {role ? paintPortraitLine(role, { ctx, x: LEFT, baseline: roleBase, size: ROLE.size, fill: portraitText(inks.muted, ground, ROLE.size) }) : null}
          {role && target ? (
            <path
              data-portrait-arrow=""
              d={(() => {
                const x = roleSplit ? LEFT : LEFT + portraitWidth(role, ROLE.size, ctx) + ROLE.between
                const y = roleTop + (roleSplit ? ROLE.lineHeight : 0) + ROLE.lineHeight / 2
                return `M${x} ${y}h26M${x + 21} ${y - 5}l5 5-5 5`
              })()}
              fill="none"
              stroke={portraitMark(inks.muted, ground)}
              strokeWidth={1.5}
            />
          ) : null}
          {target ? paintPortraitLine(target, { ctx, x: LEFT + (roleSplit ? ROLE.arrow + ROLE.between : role ? portraitWidth(role, ROLE.size, ctx) + ROLE.between * 2 + ROLE.arrow : 0), baseline: roleBase + (roleSplit ? ROLE.lineHeight : 0), size: ROLE.size, bold: true, fill: portraitText(inks.ink, ground, ROLE.size) }) : null}
        </g>
      ) : null}
      {facts ? (
        factsFit ? (
          <g {...blockTag(ctx, facts)} data-portrait-facts="">
            {paintPortraitRule(LEFT, LEFT + FACTS.w, FACTS.top + 0.5, inks.line, 1)}
            {factItems.map((f, i) => {
              const x0 = LEFT + i * colW
              const x = x0 + (i > 0 ? FACTS.inset : 0)
              const valueTop = FACTS.top + 1 + FACTS.pad
              return (
                <g key={i} data-portrait-fact={stripEmphasis(f.it.label)}>
                  {i > 0 ? <rect x={x0} y={FACTS.top} width={1} height={valueTop - FACTS.top + FACTS.value.lineHeight + FACTS.between + factLines * FACTS.label.lineHeight} fill={inks.line} /> : null}
                  {paintPortraitFigure({ ctx, value: f.figure.value, unit: f.figure.unit, x, baseline: portraitBaseline(valueTop, FACTS.value.lineHeight, FACTS.value.size, true), spec: FACTS.value, fill: portraitText(i === lit && factItems.length > 1 ? inks.lead : inks.ink, ground, FACTS.value.unit) })}
                  {paintPortrait(f.label!, { ctx, x, top: valueTop + FACTS.value.lineHeight + FACTS.between, fill: portraitText(inks.muted, ground, FACTS.label.size) })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={facts.items.length} data-dropped-kind="item" />
        )
      ) : null}
      {label && labelFits ? (
        <text {...PORTRAIT_SPEC} {...PORTRAIT_META} data-portrait-label="" x={LEFT} y={FOOTER.baseline} fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={portraitMeta(inks.muted, ground)} dominantBaseline="alphabetic">
          {label}
        </text>
      ) : null}
      {(kicker && !kickerFits) || (name && !nameFits) || (claim && claim.truncated) || ((role || target) && !(roleFits && roleRoom)) || (label && !labelFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-portrait-cover.tsx: profile's cover. The speaker's portrait down
  // the right half, and in the left column the occasion and the date over a
  // hairline, the speaker's name set huge in the serif, the claim, the post
  // held and the post sought, and three figures under a hairline.
  id: "portrait-cover",
  kind: "standard",
  story: {
    name: "Portrait Cover",
    story: "The opening spread of a magazine profile: the speaker's portrait down the right half, their name set huge in the serif, one line of what they will do, the post they hold and the one they want, and three figures behind it.",
    positioning: "Opens a candidacy, a self-introduction or a career plan. Choose it when the panel should know the speaker's name, portrait and case before the first word.",
    audience: "A hiring panel, a promotion board or a review committee meeting one candidate.",
    notFor: "A team's report or a company's proposal, where a person's portrait on the cover puts the wrong subject first.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
    { name: "body", accepts: ["kpi_cards"], capacity: 1, itemCapacity: FACTS.max, declines: factsLeftOut },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  // Over the occasion, in the page's left column.
  coverMark: { x: LEFT, y: 36 },
  headingFit: { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: Math.round(CLAIM.size * 0.92), bold: false, lineHeightRatio: CLAIM.lineHeight / CLAIM.size },
  headingSet: ({ slide, ctx }) => {
    const claim = slide.heading?.trim() ? fitClaim(slide.heading, ctx) : null
    return claim && claim.truncated ? "declined" : "whole"
  },
} satisfies LayoutDefinition
