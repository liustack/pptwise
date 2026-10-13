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

/** `at most 3 items in each bullets (the face's body slot)`, `at least 2 and at most 4 items in each kpi_cards (…)`. The caller groups lines by level. */
export function formatLimit(limit: PageLimit): string {
  const of = limit.of?.join(" or ")
  let what: string
  if (limit.per === "page") {
    what = `at most ${limit.max} ${limit.measure}${of !== undefined ? ` (${of})` : ""} on the page`
  } else if (limit.per === "component") {
    what = `${limit.min !== undefined ? `at least ${limit.min} and ` : ""}at most ${limit.max} ${limit.measure} in each ${of ?? "component"}`
  } else {
    what = `at most ${limit.max} width units in each ${of ?? "component"} item`
  }
  return `${what} (${limit.source})`
}

/** `page components: message`, `deck narrative: message`. */
export function formatIssue(issue: PageIssue): string {
  const where = issue.path === "" ? issue.scope : `${issue.scope} ${issue.path}`
  return `${where}: ${issue.message}`
}

function issueBlock(label: string, issues: readonly PageIssue[]): string[] {
  if (issues.length === 0) return [`${label}: none`]
  return [`${label}:`, ...issues.map((issue) => `  ${formatIssue(issue)}`)]
}

/**
 * What a page file key holds, beside its name where the name alone reads as
 * something else: `fields` is one key among the others, a form's header
 * lines, not a heading over the list.
 */
const PAGE_KEY_GLOSS: Readonly<Record<string, string>> = {
  fields: "a form's header lines, such as To and From",
  stamp: "a stamp pressed on the page",
  tag: "a small tag beside the heading",
  ballot: "the boxes ticked beside each item",
  years: "a strip of years with this page's lit",
  stage: "the course stage this page lights",
  footnote: "the source line",
  notes: "speaker notes, never drawn",
}

/**
 * The theme's signature drawings for the page: each with its look and the
 * ways to write for it, the one drawing the page marked, then the face's
 * drawings for other kinds by name.
 */
export function formatSignature(signature: NonNullable<PageContract["signature"]>): string[] {
  const lines = [`signature layouts (the theme's own drawings on face ${signature.face}, the ones its samples are made of):`]
  for (const entry of signature.forPage) {
    const mark = signature.drawnBy === entry.id ? ", draws this page now" : entry.written ? ", the page is written to it" : ""
    lines.push(`  ${entry.id}${mark}: ${entry.look}`)
    for (const write of entry.write) lines.push(`    write: ${write}`)
  }
  if (signature.others.length > 0) {
    lines.push(`  also on this face, made for other kinds: ${signature.others.map((other) => `${other.id} (${other.kinds.join(", ")}${signature.drawnBy === other.id ? ", draws this page now" : ""})`).join(", ")}`)
  }
  if (signature.subheadingDeclines) lines.push("  a page with a subheading gets none of them")
  if (signature.drawnBy === null) lines.push("  drawn now: none of them, the face's plain layout. Write to one where the content holds it, never add content to fit")
  return lines
}

/** The whole-page report `pptwise inspect <deck> --page <id>` prints without `--json`. */
export function formatPageContract(contract: PageContract, file: string): string {
  const { components } = contract
  const lines = [...pageHeader(contract.page, contract.theme, file), ""]
  if (contract.drawnAs !== undefined) {
    lines.push(`drawn as: "${contract.drawnAs}", the nearest kind theme "${contract.theme}" draws this page as`, "")
  }
  const keys = Object.keys(contract.fields).filter((key) => key !== "$defs")
  lines.push(`page file keys (the top-level keys of ${file}): ${keys.map((key) => (PAGE_KEY_GLOSS[key] !== undefined ? `${key} (${PAGE_KEY_GLOSS[key]})` : key)).join(", ")}`)
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
  if (contract.signature !== undefined) lines.push(...formatSignature(contract.signature), "")
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
  lines.push("fit: not checked here. Run --fit to draw this page and see what it would lose")
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
        (limit) => `  ${formatLimit(limit)}, validate ${limit.level === "error" ? "refuses" : "warns"} past it`,
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
      `fit: does not fit, ${fit.dropped.map((drop) => drop.what).join(", ")} dropped. ` +
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
