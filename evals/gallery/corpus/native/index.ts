/**
 * Per-theme native specimen lexicons (作者裁定，2026-08-31)。
 *
 * Every theme's gallery section — the ten-page specimen deck, the face band,
 * and the component-skin band — reads content written for that theme's own
 * occasion, so the review judges each theme on its home ground and the pages
 * double as honest promotional material. Protagonists deliberately vary:
 * individuals, classes, troupes, foundations, families — not one company
 * reviewing its quarter twenty-four times.
 *
 * `brief` keeps the shared tri-language duty (`LEXICONS`), so it has no
 * entry here and intentionally falls back to the shared zh lexicon.
 */
import type { Lexicon } from "../lexicon"
import { LEXICONS } from "../lexicon"
import { ACADEMIC_LEXICON } from "./thesis"
import { ARENA_LEXICON } from "./arena"
import { CAMPAIGN_LEXICON } from "./rally"
import { CLASSROOM_LEXICON } from "./homeroom"
import { CRAYON_LEXICON } from "./crayon"
import { EMBER_LEXICON } from "./ember"
import { ENTERPRISE_LEXICON } from "./bulletin"
import { HERITAGE_LEXICON } from "./heritage"
import { INK_LEXICON } from "./ink"
import { INSIGHT_LEXICON } from "./ledger"
import { JOURNAL_LEXICON } from "./journal"
import { LECTURE_LEXICON } from "./lecture"
import { LUXE_LEXICON } from "./luxe"
import { MEMO_LEXICON } from "./memo"
import { MUSEUM_LEXICON } from "./museum"
import { PLAYBILL_LEXICON } from "./playbill"
import { PULSE_LEXICON } from "./clinic"
import { RUNWAY_LEXICON } from "./runway"
import { STAGE_LEXICON } from "./stage"
import { SWISS_LEXICON } from "./swiss"
import { TECH_LEXICON } from "./terminal"
import { TERRA_LEXICON } from "./almanac"
import { VERMILION_LEXICON } from "./vermilion"

export const NATIVE_LEXICONS: Readonly<Record<string, Lexicon>> = {
  thesis: ACADEMIC_LEXICON,
  arena: ARENA_LEXICON,
  rally: CAMPAIGN_LEXICON,
  homeroom: CLASSROOM_LEXICON,
  crayon: CRAYON_LEXICON,
  ember: EMBER_LEXICON,
  bulletin: ENTERPRISE_LEXICON,
  heritage: HERITAGE_LEXICON,
  ink: INK_LEXICON,
  ledger: INSIGHT_LEXICON,
  journal: JOURNAL_LEXICON,
  lecture: LECTURE_LEXICON,
  luxe: LUXE_LEXICON,
  memo: MEMO_LEXICON,
  museum: MUSEUM_LEXICON,
  playbill: PLAYBILL_LEXICON,
  clinic: PULSE_LEXICON,
  runway: RUNWAY_LEXICON,
  stage: STAGE_LEXICON,
  swiss: SWISS_LEXICON,
  terminal: TECH_LEXICON,
  almanac: TERRA_LEXICON,
  vermilion: VERMILION_LEXICON,
}

/** The lexicon a theme's own section renders with. */
export function nativeLexiconFor(themeId: string): Lexicon {
  return NATIVE_LEXICONS[themeId] ?? LEXICONS.zh
}
