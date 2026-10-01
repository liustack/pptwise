import type { Component } from "@/ir"
import { accessibleInk, readableOn } from "../../render/ink"
import { GAUGE_DARK_META, GAUGE_LEFT, GAUGE_RIGHT } from "../gauge-shared"
import { blockTag, ruleInk, type SheetModule } from "./frame"
import { fitFixed, paintLines } from "./type"

type OrgTree = Extract<Component, { type: "org_tree" }>

/*
 * tree: the board's team page (p10). One owner block in primary at the top
 * centre, a square primary connector, and a row of white cards under it,
 * each topped with a 4px primary rule.
 *
 * Takes one `org_tree` with two to four branches and no row under any of
 * them. A deeper tree is the ordinary org chart's job.
 */

const MIN_CHILDREN = 2
const MAX_CHILDREN = 4

const ROOT_W = 376
const ROOT_H = 96
const ROOT_TOP = 32
const ROOT_PAD_X = 28
const ROOT_PAD_Y = 18
const NAME_SIZE = 26
const NAME_LINE_HEIGHT = 34
const ROLE_SIZE = 18
const ROLE_LINE_HEIGHT = 26
/** Baselines of the 26px name and the 18px role in their line boxes. */
const NAME_BASELINE = 26
const ROLE_BASELINE = 19

const LINK_W = 1.5
/** Where the connector's crossbar runs, below the band top. */
const BUS_Y = 168
const CARD_TOP = 208
const CARD_GAP = 40
const CARD_MIN_H = 128
const CARD_BAR = 4
const CARD_PAD_X = 28
const CARD_PAD_Y = 26
const NAME_TO_ROLE = 6
const CARD_MAX_LINES = 2

function treeShape(components: readonly Component[]): OrgTree | null {
  if (components.length !== 1) return null
  const only = components[0]!
  if (only.type !== "org_tree") return null
  if (only.children.length < MIN_CHILDREN || only.children.length > MAX_CHILDREN) return null
  if (only.children.some((child) => (child.children?.length ?? 0) > 0)) return null
  return only
}

export const sheetTree: SheetModule = ({ slide, ctx, rect }) => {
  const tree = treeShape(slide.components)
  if (!tree) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const top = rect.y
  const centre = rect.x + rect.w / 2

  const rootText = ROOT_W - ROOT_PAD_X * 2
  const rootName = fitFixed(tree.root.name, {
    width: rootText,
    size: NAME_SIZE,
    lineHeight: NAME_LINE_HEIGHT,
    maxLines: 1,
    fontFamily: body,
    bold: false,
  })
  const rootRole = fitFixed(tree.root.role, {
    width: rootText,
    size: ROLE_SIZE,
    lineHeight: ROLE_LINE_HEIGHT,
    maxLines: 1,
    fontFamily: body,
    bold: false,
  })
  if (rootName === null || rootRole === null) return null

  const count = tree.children.length
  const cardW = (GAUGE_RIGHT - GAUGE_LEFT - CARD_GAP * (count - 1)) / count
  const cardText = cardW - 2 - CARD_PAD_X * 2
  const cards = []
  for (const [i, child] of tree.children.entries()) {
    const name = fitFixed(child.name, {
      width: cardText,
      size: NAME_SIZE,
      lineHeight: NAME_LINE_HEIGHT,
      maxLines: CARD_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    const role = fitFixed(child.role, {
      width: cardText,
      size: ROLE_SIZE,
      lineHeight: ROLE_LINE_HEIGHT,
      maxLines: CARD_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (name === null || role === null) return null
    cards.push({ x: GAUGE_LEFT + i * (cardW + CARD_GAP), name, role })
  }
  // Every card in the row is as tall as the tallest one needs, and never
  // shorter than the board's 128px.
  const cardH = Math.max(
    CARD_MIN_H,
    ...cards.map(
      (card) =>
        CARD_BAR +
        CARD_PAD_Y +
        card.name.lines.length * NAME_LINE_HEIGHT +
        (card.role.lines.length > 0 ? NAME_TO_ROLE + card.role.lines.length * ROLE_LINE_HEIGHT : 0) +
        CARD_PAD_Y,
    ),
  )
  if (top + CARD_TOP + cardH > rect.y + rect.h) return null

  const rootX = centre - ROOT_W / 2
  const rootY = top + ROOT_TOP
  const rootInk = readableOn(colors.primary)
  const rootRoleInk = accessibleInk(GAUGE_DARK_META, colors.primary, ROLE_SIZE)
  // A root with no role sets its name on the block's centre line.
  const rootNameY =
    rootRole.lines.length > 0
      ? rootY + ROOT_PAD_Y + NAME_BASELINE
      : Math.round(rootY + ROOT_H / 2 - NAME_LINE_HEIGHT / 2 + NAME_BASELINE)
  const cardY = top + CARD_TOP
  const nameInk = accessibleInk(colors.primary, colors.surface, NAME_SIZE)
  const roleInk = accessibleInk(colors.muted, colors.surface, ROLE_SIZE)
  const centres = cards.map((card) => card.x + cardW / 2)

  return (
    <g data-gauge-module="tree" {...blockTag(ctx, tree)}>
      <rect x={rootX} y={rootY} width={ROOT_W} height={ROOT_H} fill={colors.primary} />
      {paintLines(rootName, {
        ctx,
        x: centre,
        y: rootNameY,
        fill: rootInk,
        fontFamily: body,
        fontWeight: "400",
        anchor: "middle",
        bg: colors.primary,
      })}
      {paintLines(rootRole, {
        ctx,
        x: centre,
        y: rootY + ROOT_PAD_Y + NAME_LINE_HEIGHT + ROLE_BASELINE,
        fill: rootRoleInk,
        fontFamily: body,
        fontWeight: "400",
        anchor: "middle",
        bg: colors.primary,
      })}
      <line x1={centre} y1={rootY + ROOT_H} x2={centre} y2={top + BUS_Y} stroke={colors.primary} strokeWidth={LINK_W} />
      <line
        x1={centres[0]}
        y1={top + BUS_Y}
        x2={centres[centres.length - 1]}
        y2={top + BUS_Y}
        stroke={colors.primary}
        strokeWidth={LINK_W}
      />
      {centres.map((x, i) => (
        <line key={i} x1={x} y1={top + BUS_Y} x2={x} y2={cardY} stroke={colors.primary} strokeWidth={LINK_W} />
      ))}
      {cards.map((card, i) => {
        const textX = card.x + 1 + CARD_PAD_X
        const nameY = cardY + CARD_BAR + CARD_PAD_Y + NAME_BASELINE
        const roleY =
          cardY + CARD_BAR + CARD_PAD_Y + card.name.lines.length * NAME_LINE_HEIGHT + NAME_TO_ROLE + ROLE_BASELINE
        return (
          <g key={i}>
            <rect x={card.x} y={cardY} width={cardW} height={cardH} fill={colors.surface} stroke={ruleInk(ctx)} strokeWidth={1} />
            <rect x={card.x} y={cardY} width={cardW} height={CARD_BAR} fill={colors.primary} />
            {paintLines(card.name, { ctx, x: textX, y: nameY, fill: nameInk, fontFamily: body, fontWeight: "400", bg: colors.surface })}
            {paintLines(card.role, { ctx, x: textX, y: roleY, fill: roleInk, fontFamily: body, fontWeight: "400", bg: colors.surface })}
          </g>
        )
      })}
    </g>
  )
}
