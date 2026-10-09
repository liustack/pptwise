import type { MotifId } from "./types"

/**
 * The motifs that set a content page's `kicker` in a running head of their
 * own: museum-motif's hall sign at the top left (`PlacardHall`), and
 * runway-motif's section in the masthead (`LineupMasthead`). The face under
 * either leaves the kicker to the motif.
 *
 * A fact of the motif, read for the motif that actually paints on the page
 * (`render/full-slide-svg.tsx`). The step-aside sheet reads it so a page it
 * draws under one of these motifs shows the kicker once, where the theme sets
 * it, rather than again over the heading (`render/step-aside.tsx`). Leaf
 * module: types only, so the page renderer can read it without reaching the
 * motif code.
 */
export const MOTIFS_THAT_SET_THE_KICKER: ReadonlySet<MotifId> = new Set<MotifId>(["museum-motif", "runway-motif"])
