import { hslToHex, rebasedHueSaturation } from "../themes/palette-rebase"
import type { StyleColors } from "../themes/tokens"
import { contrastRatio, liftedInk, readableOn, relativeLuminance } from "./ink"

/** Body text's floor, the one `text` and `muted` are painted at. */
const BODY_TEXT_RATIO = 4.5

/**
 * The theme's colours for a page whose author painted it `ground`.
 *
 * A theme's neutral tokens are one ladder built on `colors.bg`: `text`,
 * `muted` and `emphasisInk` read on it (`assertContrastFloor` holds them to
 * that), `surface` and `panel` sit a step off it, `border` and `cardStroke`
 * a step off the surface. Every component, layout and motif takes its ink
 * from that ladder, `ctx.colors.text` on the page, on a card, in a table
 * cell, and none of them reads the page it is painted on. A page background
 * the author sets replaced the plane under the ladder and nothing else, so
 * on a light theme painted `#1A1A1A` the heading, which reads
 * `ctx.defaultBg`, turned light while every paragraph, bullet, card and
 * chart label kept the theme's dark ink at about 1.2:1.
 *
 * Where the theme's `text` and `muted` still read on `ground` at body
 * text's 4.5:1, the palette comes back as it is: the author tinted the page
 * and the ladder still stands on it. Where either does not, the ladder moves
 * onto `ground`. Each rung keeps the contrast it had with the rung under it
 * (an ink with the page, a card with the page, a card's border with the
 * card) and the side it sat on, toward the ink or away from it, with the ink
 * now on whichever side of `ground` reads. Hue and saturation move the way
 * `theme fork` moves them onto a new `bg` (`rebasedHueSaturation`). So text
 * keeps its 13:1 and muted its 5:1 on the new page, a card that sat a step
 * lighter than a light page sits the same step darker than a dark one, and
 * every pairing the theme already measured reads the same on it. A card
 * that the side it sat on would take under its inks' floor, on a ground
 * that leaves the inks no room, steps to the other side instead (`card`).
 *
 * The brand tokens (`primary`, `accent`, the chart and accent pools, the
 * status colours) are the theme itself and stay as they are. A block filled
 * with one and the type set on it read the same on any page.
 */
export function paletteOnGround(colors: StyleColors, ground: string): StyleColors {
  const reads = (ink: string) => contrastRatio(ink, ground) >= BODY_TEXT_RATIO
  if (reads(colors.text) && reads(colors.muted)) return colors

  const inkLighter = readableOn(ground) === "#FFFFFF"
  const textLighter = relativeLuminance(colors.text) > relativeLuminance(colors.bg)
  const onto = (token: string, plane: string, newPlane: string, side: "kept" | "turned" = "kept"): string => {
    const towardInk = relativeLuminance(token) > relativeLuminance(plane) === textLighter
    const lighter = towardInk === inkLighter === (side === "kept")
    return atContrast(rebasedHueSaturation(token, plane, ground), contrastRatio(token, plane), newPlane, lighter)
  }
  const text = onto(colors.text, colors.bg, ground)
  const muted = onto(colors.muted, colors.bg, ground)
  // A card carries the same inks as the page. Where the page leaves the inks
  // no room past the one they stand on (a mid-tone ground, where pure black
  // reads at about 4.7:1 and nothing reads further), a card a step toward
  // the ink takes them under the floor they read at on the theme's own card.
  // Such a card takes its step on the other side of the page, where they do.
  const inksRead = (card: string, own: string) =>
    [
      [colors.text, text],
      [colors.muted, muted],
    ].every(([was, now]) => contrastRatio(now!, card) >= Math.min(BODY_TEXT_RATIO, contrastRatio(was!, own)))
  const card = (token: string): string => {
    const kept = onto(token, colors.bg, ground)
    if (inksRead(kept, token)) return kept
    const turned = onto(token, colors.bg, ground, "turned")
    return inksRead(turned, token) ? turned : kept
  }
  const surface = card(colors.surface)
  return {
    ...colors,
    bg: ground,
    surface,
    ...(colors.panel !== undefined ? { panel: card(colors.panel) } : {}),
    text,
    muted,
    ...(colors.emphasisInk !== undefined ? { emphasisInk: onto(colors.emphasisInk, colors.bg, ground) } : {}),
    ...(colors.border !== undefined ? { border: onto(colors.border, colors.surface, surface) } : {}),
    ...(colors.cardStroke !== undefined ? { cardStroke: onto(colors.cardStroke, colors.surface, surface) } : {}),
  }
}

/**
 * The colour of hue `h` and saturation `s` that stands `ratio` from `plane`,
 * lighter or darker than it: the lightness found by bisection, since
 * luminance rises with lightness at a fixed hue and saturation. Where the
 * ratio is out of reach on that side, the farthest the side allows.
 */
function atContrast({ h, s }: { h: number; s: number }, ratio: number, plane: string, lighter: boolean): string {
  const planeLuminance = relativeLuminance(plane)
  const wanted = lighter ? ratio * (planeLuminance + 0.05) - 0.05 : (planeLuminance + 0.05) / ratio - 0.05
  let lo = 0
  let hi = 1
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (relativeLuminance(hslToHex({ h, s, l: mid })) < wanted) lo = mid
    else hi = mid
  }
  // The side of the bisection that keeps the ratio: at or past it, never short.
  return hslToHex({ h, s, l: lighter ? hi : lo })
}

/**
 * The theme's brand colours as type on a page its author painted `ground`.
 *
 * `paletteOnGround` keeps `primary` and `accent` as they are, since a block
 * filled with one reads the same on any page. A face that sets a claim, a
 * quote or a hero figure straight onto the page in one of them is another
 * matter: on a painted page the brand gold or ink stood at 1.2 to 2.9:1
 * against the author's ground. So for such a face each brand ink keeps the
 * tier it held on the theme's own ground (body text's 4.5:1 or large text's
 * 3:1), lifted toward the ground's readable ink by the least that holds it
 * there (`liftedInk`), its hue kept. On the theme's own ground nothing moves,
 * and a colour that never read as type there (under 3:1) is left alone.
 */
export function brandInkOnGround(colors: StyleColors, themeGround: string, ground: string): StyleColors {
  if (themeGround.toUpperCase() === ground.toUpperCase()) return colors
  const onGround = (ink: string): string => {
    const own = contrastRatio(ink, themeGround)
    if (own < 3) return ink
    // The size `liftedInk` reads its floor from: body text's 4.5:1 below 24px, large text's 3:1 at it.
    return liftedInk(ink, ground, own >= BODY_TEXT_RATIO ? 16 : 24)
  }
  return {
    ...colors,
    primary: onGround(colors.primary),
    accent: onGround(colors.accent),
    ...(colors.emphasisInk !== undefined ? { emphasisInk: onGround(colors.emphasisInk) } : {}),
  }
}
