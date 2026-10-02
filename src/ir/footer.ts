/**
 * The deck footer: which small marks a deck prints in the corners of its
 * pages, and nothing else.
 *
 * A deck that writes no `footer` prints none of them. This follows what real
 * decks do (a survey of 87 public decks, 2026-10-02): page numbers are common
 * in decks meant to be read and rare in decks meant to be presented, a
 * confidentiality mark follows the occasion rather than how formal the deck
 * is, and a mark nobody asked for is the one that leaks into a public
 * release. So every mark here is opt-in, and every text is the author's own
 * words or the deck's own `meta`. Nothing is made up to fill a corner.
 *
 * Where each mark goes:
 *
 * - `page_number`: content pages only, bottom right, small and quiet. Cover,
 *   chapter and ending pages carry none. The exported file uses PowerPoint's
 *   own slide-number field, so the number follows the page when slides move.
 * - `organization`: `meta.organization`, bottom left, the same place on
 *   every content page. A logo goes through `brand` and `branding` instead.
 * - `label`: the author's own occasion-and-date line, printed as written,
 *   after the organization ("2026 年中期业绩 | 2026.08").
 * - `notice`: the author's own copyright line or disclaimer pointer, printed
 *   as written, after the label.
 * - `draft`: the author's own draft or version mark ("讨论稿", "Draft for
 *   discussion"), bottom right before the page number.
 * - `confidentiality`: where the `meta.confidentiality` mark goes. `"cover"`
 *   prints it once, on the cover. `"footer"` prints it on the cover and in
 *   the bottom-right corner of every content page. The words follow the
 *   deck's language (`lib/conf-labels.ts`), and `public` prints nothing.
 *
 * A legal classification ("秘密★1年") is not a footer mark. It lives in
 * `meta.classification` and only ever prints on the cover, top left.
 *
 * Relation to `branding`: `branding` decides where the logo appears. A deck
 * that writes `branding: "full"` and no `footer` keeps its old footer, read
 * as `{ organization: true, confidentiality: "footer" }` for whichever of
 * the two its `meta` carries. Writing `footer` replaces that reading.
 */
import { z } from "zod"

/** A string that must carry at least one non-space character. */
export const nonBlankString = (field: string) =>
  z.string().refine((value) => value.trim() !== "", { message: `${field} must not be blank` })

export const FOOTER_CONFIDENTIALITY_PLACEMENTS = ["footer", "cover"] as const
export type FooterConfidentialityPlacement = (typeof FOOTER_CONFIDENTIALITY_PLACEMENTS)[number]

export const FooterSchema = z
  .object({
    page_number: z
      .boolean()
      .optional()
      .describe("Print the page number on content pages, bottom right. Cover, chapter and ending pages carry none. Exported as PowerPoint's own slide-number field."),
    organization: z
      .boolean()
      .optional()
      .describe("Print meta.organization on content pages, bottom left. Requires meta.organization."),
    label: nonBlankString("footer.label")
      .optional()
      .describe('The author\'s own occasion-and-date line, printed as written after the organization, e.g. "2026 年中期业绩 | 2026.08" or "Investor Presentation | February 2026".'),
    notice: nonBlankString("footer.notice")
      .optional()
      .describe("The author's own copyright line or disclaimer pointer, printed as written after the label."),
    draft: nonBlankString("footer.draft")
      .optional()
      .describe('The author\'s own draft or version mark, e.g. "讨论稿" or "Draft for discussion", printed bottom right before the page number.'),
    confidentiality: z
      .enum(FOOTER_CONFIDENTIALITY_PLACEMENTS)
      .optional()
      .describe('Where the meta.confidentiality mark goes. "cover" prints it once on the cover. "footer" prints it on the cover and bottom right on every content page. Requires meta.confidentiality other than "public".'),
  })
  .strict()
  .describe("Small marks printed in the page corners. Omitted, the deck prints none. Every text is the author's own or comes from meta.")

export type Footer = z.infer<typeof FooterSchema>

/**
 * A legal classification and its term in the Chinese form ("绝密★长期",
 * "机密★5年", "秘密★1年"). The star is what makes it unambiguous: the bare
 * word 机密 also appears in ordinary prose.
 */
const LEGAL_CLASSIFICATION_RE = /(绝密|机密|秘密)\s*★/

export interface FooterSettingIssue {
  path: string
  message: string
}

/**
 * Cross-field rules the schema cannot express on its own. Shared by IR
 * validation (`validate-core.ts`) and deck-spec validation
 * (`spec/index.ts`), which hold the same `meta` and `footer` shapes.
 */
export function footerSettingIssues(input: {
  meta: { organization?: string; confidentiality?: string; classification?: string }
  footer?: Footer
}): FooterSettingIssue[] {
  const { meta, footer } = input
  const issues: FooterSettingIssue[] = []
  if (!footer) return issues
  if (footer.organization && !meta.organization?.trim()) {
    issues.push({
      path: "footer.organization",
      message: "footer.organization prints meta.organization, which is empty. Add meta.organization, or drop footer.organization",
    })
  }
  if (footer.confidentiality !== undefined) {
    if (!meta.confidentiality || meta.confidentiality === "public") {
      issues.push({
        path: "footer.confidentiality",
        message: `footer.confidentiality places the meta.confidentiality mark, but meta.confidentiality is ${meta.confidentiality === "public" ? '"public", which prints nothing' : "missing"}. Set meta.confidentiality to internal, confidential or restricted, or drop footer.confidentiality`,
      })
    }
    if (meta.classification?.trim()) {
      issues.push({
        path: "footer.confidentiality",
        message: "meta.classification is a legal classification and prints on the cover only, top left. A deck carries one or the other: drop footer.confidentiality",
      })
    }
  }
  for (const field of ["label", "notice", "draft"] as const) {
    const text = footer[field]
    if (text !== undefined && LEGAL_CLASSIFICATION_RE.test(text)) {
      issues.push({
        path: `footer.${field}`,
        message: `footer.${field} carries a legal classification. Write it in meta.classification, which prints on the cover only, top left`,
      })
    }
  }
  return issues
}
