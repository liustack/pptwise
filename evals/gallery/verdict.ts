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

export function mergeVerdict(page: ManifestPage, l1: ReturnType<typeof auditL1>, l2: L2Verdict | undefined) {
  const manifest = manifestFindings(page)
  if (l2) {
    const findings = [...new Set([...l1.findings.map((f) => f.code), ...l2.findings, ...manifest.codes])]
    return {
      ...l2,
      verdict: manifest.codes.length > 0 && l2.verdict === "pass" ? "rework" : l2.verdict,
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
