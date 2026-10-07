import { renderSlideSvg } from "@/api"
import { CHART_VARIANTS, COMPONENT_BUILDERS, DEVICE_VARIANTS } from "./corpus/components"
import { componentPage, corpusAssets } from "./corpus/decks"
import { LEXICONS } from "./corpus/lexicon"
import { ADJACENCY_PAGES } from "./matrix"

/**
 * Fixed four, covering identity strength and heading font family:
 *
 * | id | identity (`THEME_OCCASIONS`) | heading family | extra |
 * |---|---|---|---|
 * | swiss | low | YaHei / PingFang grotesk sans | quiet institutional |
 * | thesis | medium | Sectra / Georgia / Source Han Serif | owns 4 adjacency pages |
 * | crayon | high | YaHei / PingFang grotesk sans | owns architecture adjacency. Header of the old test names crayon as a tight face |
 * | ink | high | KaiTi / 楷体 | a different CJK family from YaHei and the serifs |
 *
 * stage stays out of the sample (it is the ratchet hit). The full-theme
 * evals pass still covers it.
 */
export const CROSS_LANGUAGE_SAMPLE_THEME_IDS = ["swiss", "thesis", "crayon", "ink"] as const

/** Theme/component/language triples known to overflow, with what they lose. */
export const KNOWN_OVERFLOWS: readonly string[] = [
  // `stage` routes the `comparison` kind to a two-column face,
  // which hands its body 528px. A from_to table is three columns and a
  // gutter: a row name, a number with its unit, and a delta beside the second
  // number, all on one line. Under about 600px they stop holding their own
  // content, so the component declines the box rather than printing three
  // columns of stubs (`from-to.tsx`'s own `MIN_W`). The theme reads Chinese
  // on its own gallery pages, where the same face is wide enough; this is
  // the English pairing an author can still reach, and closing it needs the
  // step-aside AGENTS.md names.
  "stage · from_to · en: 1×component",
]

/** Entries in `KNOWN_OVERFLOWS` whose theme id (the part before ` · `) is in `themeIds`. */
export function knownOverflowsFor(themeIds: readonly string[]): string[] {
  const want = new Set(themeIds)
  return KNOWN_OVERFLOWS.filter((entry) => want.has(entry.slice(0, entry.indexOf(" · "))))
}

/**
 * Render each theme's component, chart, and device variants (and adjacency
 * pages whose theme is in `themeIds`) in Latin and mixed script.
 * Returns one string per dropping page, same format as `KNOWN_OVERFLOWS`.
 * Callers must have installed the Node platform. This function does not
 * assert: a ratchet mismatch is the caller's job.
 */
export async function scanCrossLanguage(
  themeIds: readonly string[],
  options?: { languages?: readonly ("en" | "mixed")[] },
): Promise<string[]> {
  const languages = options?.languages ?? (["en", "mixed"] as const)
  const builders: Record<string, (typeof COMPONENT_BUILDERS)[string]> = {
    ...COMPONENT_BUILDERS,
    ...CHART_VARIANTS,
    ...DEVICE_VARIANTS,
  }
  // Same two exclusions the component band makes: `chart` and
  // `device_mockup` are each several unrelated drawings behind one type
  // name, and the variants above stand in for them.
  delete builders.chart
  delete builders.device_mockup

  const dropsOf = (svg: string) =>
    [...svg.matchAll(/data-dropped="(\d+)" data-dropped-kind="([a-z-]+)"/g)]
      .filter((m) => Number(m[1]) > 0)
      .map((m) => `${m[1]}×${m[2]}`)

  const themeSet = new Set(themeIds)
  const found: string[] = []
  for (const language of languages) {
    const lex = LEXICONS[language]
    const assets = await corpusAssets(lex)
    for (const themeId of themeIds) {
      for (const [id, build] of Object.entries(builders)) {
        const drops = dropsOf(renderSlideSvg(componentPage(id, build!, lex, assets, themeId), 0))
        if (drops.length > 0) found.push(`${themeId} · ${id} · ${language}: ${drops.join(", ")}`)
      }
    }

    // The adjacency pairings too. The gallery draws those five pages in
    // each theme's own language, so this is the only place they meet Latin
    // and mixed script — and a component beside a neighbour is the shape
    // with the least room to spare.
    for (const adj of ADJACENCY_PAGES) {
      if (!themeSet.has(adj.theme)) continue
      const build = builders[adj.component]
      if (!build) throw new Error(`adjacency page names unknown component "${adj.component}"`)
      const ir = componentPage(adj.component, build, lex, assets, adj.theme, { solo: false })
      const drops = dropsOf(renderSlideSvg(ir, 0))
      if (drops.length > 0) {
        found.push(`${adj.theme} · ${adj.component} beside a lead-in · ${language}: ${drops.join(", ")}`)
      }
    }
  }
  return found
}
