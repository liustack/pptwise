/**
 * One page's verdict: the zero-model geometry pass, the optional vision pass,
 * and the deck-auditor findings the render already recorded, merged into the
 * single row `evals:gallery` writes out.
 *
 * Lives beside the runner rather than inside it so the merge can be tested
 * without executing the script.
 */

import type { auditL1 } from "./l1"
import type { L2Verdict } from "./l2"
import type { ManifestPage } from "./render"

/**
 * The deck-auditor findings `renderMatrix` already recorded for this page.
 *
 * They were written into the manifest and then read by nobody: a page could
 * carry a `content-dropped` finding and still be merged into a `pass`,
 * because only L1 and L2 were consulted. They are folded in here so a loss
 * the page does not show cannot be graded as a clean page — whether or not
 * the vision pass ran.
 */
export function manifestFindings(page: ManifestPage): { codes: string[]; notes: string[] } {
  const rework = (page.findings ?? []).filter((f) => f.code === "content-dropped" || f.code === "content-truncated")
  return { codes: rework.map((f) => f.code), notes: rework.map((f) => f.message) }
}

/**
 * The one finding a vision model does not get a vote on.
 *
 * `content-dropped` is not an opinion about how a page looks. It is a count
 * the render wrote down: this many things the author put in the IR are not on
 * the slide, and nothing on the slide says so. A model looking at the page
 * cannot see the absence — that is the whole reason the export refuses these
 * decks — so a `pass` or a `limit` from L2 is not disagreement, it is the
 * model answering a question it cannot be asked. The deterministic finding is
 * a floor: the page is at least `rework`, whoever else looked at it.
 *
 * `content-truncated` is deliberately not on this list. A cut string is on
 * the page and a reader can judge it, so it stays an ordinary finding that
 * L2 may adjudicate. Every other L1 finding keeps its existing semantics too.
 */
const DETERMINISTIC_LOSS = "content-dropped"

function droppedContent(l1: ReturnType<typeof auditL1>, manifestCodes: readonly string[]): boolean {
  return manifestCodes.includes(DETERMINISTIC_LOSS) || l1.findings.some((f) => f.code === DETERMINISTIC_LOSS)
}

export function mergeVerdict(page: ManifestPage, l1: ReturnType<typeof auditL1>, l2: L2Verdict | undefined) {
  const manifest = manifestFindings(page)
  const lost = droppedContent(l1, manifest.codes)
  if (l2) {
    const findings = [...new Set([...l1.findings.map((f) => f.code), ...l2.findings, ...manifest.codes])]
    return {
      ...l2,
      verdict: lost ? "rework" : l2.verdict,
      note: [l2.note, ...manifest.notes].filter(Boolean).join(" "),
      findings,
    }
  }
  const notes = [...l1.findings.map((f) => f.message), ...manifest.notes]
  return {
    id: page.id,
    section: page.section,
    band: page.band,
    subject: page.subject,
    language: page.language,
    theme: page.theme,
    page: page.page,
    verdict: l1.findings.length + manifest.codes.length > 0 ? "rework" : "pass",
    note: notes.join(" ") || "",
    findings: [...new Set([...l1.findings.map((f) => f.code), ...manifest.codes])],
    source: "l1" as const,
  }
}
