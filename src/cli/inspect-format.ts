/**
 * Human-readable `pptwise inspect` reports. `--json` prints the contract
 * objects themselves (`../inspect/page-contract.ts`); these render the same
 * facts as lines a person can scan.
 */
import type { InspectedPage, PageComponentContract, PageContract, PageIssue, PageLimit } from "../inspect/page-contract"
import type { PageFit } from "../inspect/page-fit"

/** `pptwise inspect --fit`'s verdict: the drawn result, or why the page was not drawn. */
export type InspectFit = ({ checked: true } & PageFit) | { checked: false; reason: string }

/** What `pptwise inspect --fit` reports for one page. */
export interface PageFitReport {
  page: InspectedPage & { file: string }
  errors: PageIssue[]
  warnings: PageIssue[]
  fit: InspectFit
}

/** `page growth (2 of 5): content, kind "data", theme "brief"` plus the locked heading and hints. */
function pageHeader(page: InspectedPage, theme: string | undefined, file: string): string[] {
  const kind = page.kind !== undefined ? `, kind "${page.kind}"` : ""
  const bound = theme !== undefined ? `, theme "${theme}"` : ""
  const lines = [`page ${page.id} (${page.number} of ${page.of}): ${page.type}${kind}${bound}`, `heading: ${page.heading}`]
  if (page.summary !== undefined) lines.push(`summary: ${page.summary}`)
  if (page.focus !== undefined) lines.push(`focus: ${page.focus}`)
  lines.push(`file: ${file} (${page.filled ? "filled" : "not written yet"})`)
  return lines
}

/** `at most 3 items in each bullets — the face's body slot`. The caller groups lines by level. */
export function formatLimit(limit: PageLimit): string {
  const of = limit.of?.join(" or ")
  let what: string
  if (limit.per === "page") {
    what = `at most ${limit.max} ${limit.measure}${of !== undefined ? ` (${of})` : ""} on the page`
  } else if (limit.per === "component") {
    what = `at most ${limit.max} ${limit.measure} in each ${of ?? "component"}`
  } else {
    what = `at most ${limit.max} width units in each ${of ?? "component"} item`
  }
  return `${what} — ${limit.source}`
}

/** `page components — message`, `deck narrative — message`. */
export function formatIssue(issue: PageIssue): string {
  const where = issue.path === "" ? issue.scope : `${issue.scope} ${issue.path}`
  return `${where} — ${issue.message}`
}

function issueBlock(label: string, issues: readonly PageIssue[]): string[] {
  if (issues.length === 0) return [`${label}: none`]
  return [`${label}:`, ...issues.map((issue) => `  ${formatIssue(issue)}`)]
}

/** The whole-page report `pptwise inspect <deck> --page <id>` prints without `--json`. */
export function formatPageContract(contract: PageContract, file: string): string {
  const { components } = contract
  const lines = [...pageHeader(contract.page, contract.theme, file), ""]
  lines.push(`fields: ${Object.keys(contract.fields).filter((key) => key !== "$defs").join(", ")}`)
  lines.push(`components (${components.legal.length}): ${components.legal.length > 0 ? components.legal.join(", ") : "none"}`)
  if (components.fullBody.length > 0) {
    lines.push(`  full-body, each must be the page's only component: ${components.fullBody.join(", ")}`)
  }
  for (const slot of components.required) {
    lines.push(`  required: one of ${slot.accepts.join(", ")} for the ${slot.slot} slot`)
  }
  if (components.recommended.length > 0) {
    lines.push(`  recommended: ${components.recommended.map((r) => `${r.type} (${r.because})`).join(", ")}`)
  }
  for (const note of components.notes) lines.push(`  note: ${note}`)
  if (components.legal.length > 0) lines.push("  expand one with --component <type>")
  lines.push("")
  const errors = contract.limits.filter((limit) => limit.level === "error")
  const warnings = contract.limits.filter((limit) => limit.level === "warning")
  if (errors.length > 0) {
    lines.push("limits (validate refuses the page past these):", ...errors.map((limit) => `  ${formatLimit(limit)}`))
  }
  if (warnings.length > 0) {
    lines.push("advice (validate warns past these):", ...warnings.map((limit) => `  ${formatLimit(limit)}`))
  }
  if (contract.limits.length > 0) lines.push("")
  lines.push(...issueBlock("errors", contract.errors), ...issueBlock("warnings", contract.warnings))
  lines.push("fit: counts are not a drawing; --fit draws this page and reports what it loses")
  return lines.join("\n")
}

/** The one-component report `pptwise inspect <deck> --page <id> --component <type>` prints without `--json`. */
export function formatPageComponentContract(expanded: PageComponentContract): string {
  const { page } = expanded
  const kind = page.kind !== undefined ? `, kind "${page.kind}"` : ""
  const lines = [`component ${expanded.component} on page ${page.id} (${page.number} of ${page.of}): ${page.type}${kind}`]
  if (expanded.story !== undefined) {
    lines.push(
      `name: ${expanded.story.name}`,
      `what it is: ${expanded.story.story}`,
      `choose it: ${expanded.story.positioning}`,
      `not for: ${expanded.story.notFor}`,
    )
  }
  lines.push(`full-body: ${expanded.fullBody ? "yes, it must be the page's only component" : "no"}`)
  if (expanded.limits.length > 0) {
    lines.push(
      "limits on this page:",
      ...expanded.limits.map(
        (limit) => `  ${formatLimit(limit)} (validate ${limit.level === "error" ? "refuses" : "warns"} past it)`,
      ),
    )
  }
  lines.push("schema:", JSON.stringify(expanded.schema, null, 2))
  return lines.join("\n")
}

/** The report `pptwise inspect <deck> --page <id> --fit` prints without `--json`. */
export function formatPageFitReport(report: PageFitReport, theme: string): string {
  const lines = pageHeader(report.page, theme, report.page.file)
  const { fit } = report
  if (!fit.checked) {
    lines.push(`fit: not checked, ${fit.reason}`)
  } else if (fit.fits) {
    lines.push("fit: fits, nothing dropped")
  } else {
    lines.push(
      `fit: does not fit — ${fit.dropped.map((drop) => drop.what).join(", ")} dropped. ` +
        "render refuses a deck that drops content: shorten the page or split it in two",
    )
  }
  if (fit.checked) {
    for (const text of fit.truncated) lines.push(`  text cut to fit: "${text}" (render allows it, audit reports it)`)
    if (fit.steppedAside) lines.push("  stepped aside: the theme's face declined this page, and a plainer layout drew all of it")
  }
  lines.push(...issueBlock("errors", report.errors), ...issueBlock("warnings", report.warnings))
  return lines.join("\n")
}
