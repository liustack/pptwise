# Branding posture and footer marks

Read this when deciding deck-level brand visibility, adding page numbers or a confidentiality mark, extracting an Office brand, or understanding why a page has no brand frame.

A brand signal controls appearance. It does not choose the narrative or the page kind.

## Footer marks

A deck prints no footer unless it asks for one: no page number, no organization, no date, no confidentiality line. Ask for exactly the marks the occasion needs in `footer`:

| field | prints |
| --- | --- |
| `page_number: true` | The page number, bottom right, small and quiet, on content pages only. Cover, chapter, and ending pages carry none, and neither do full-page statements, big-number pages, or photos that run to the bottom edge. The exported file uses PowerPoint's own slide-number field, so the number follows the page when slides move. |
| `organization: true` | `meta.organization`, bottom left, the same place on every content page. |
| `label` | Your own occasion-and-date line, printed as written after the organization. |
| `notice` | Your own copyright line or disclaimer pointer, printed as written after the label. |
| `draft` | Your own draft or version mark, bottom right before the page number. |
| `confidentiality` | Where the `meta.confidentiality` mark goes: `"cover"` prints it once on the cover, `"footer"` prints it on the cover and on every content page. |

```json
{
  "meta": { "organization": "华东区域运营中心", "confidentiality": "confidential" },
  "footer": {
    "page_number": true,
    "organization": true,
    "label": "2026 年中期业绩 | 2026.08",
    "draft": "讨论稿",
    "confidentiality": "footer"
  }
}
```

```json
{
  "meta": { "organization": "Acme Holdings", "confidentiality": "confidential" },
  "footer": {
    "page_number": true,
    "label": "Investor Presentation | February 2026",
    "confidentiality": "cover"
  }
}
```

How to choose:

- A deck meant to be read (a report, a board pack, a handout) usually wants `page_number`. A deck meant to be presented often does not.
- Add the confidentiality mark only when the occasion restricts who may see the deck. Public material (roadshows, sell-side reports, public briefings) carries none, and `public` prints nothing.
- The mark's words follow the deck's language. A Chinese deck prints 「仅供内部讨论」 (`internal`), 「内部资料，请勿外传」 (`confidential`), or 「限定范围阅读，请勿转发」 (`restricted`). It never prints 「机密」, which in Chinese is a legal classification level for state secrets. An English deck prints Internal, Confidential, or Restricted.
- A legal classification with its term ("秘密★1年") goes in `meta.classification`, written exactly as given. It prints once, on the cover, top left, and cannot be combined with `footer.confidentiality`.
- Never make a mark up. Do not invent an organization, a date, a version, or a project code to fill a corner. `label`, `notice`, and `draft` print exactly the words you write, and the deck date and version stay on the cover.
- The whole footer is one quiet line. A line too long for the bottom of the page is a validation error: shorten `label` or `notice`.

## Deck-level logo posture

`branding` decides where the brand logo appears:

| value | visible result |
| --- | --- |
| `full` | Keeps the logo throughout and paints the date on cover and ending metadata rows. Without a `footer`, it also keeps its older footer: the organization and the confidentiality mark on content pages, as if you wrote `footer: { "organization": true, "confidentiality": "footer" }`. |
| `cover-only` | Keeps the logo on cover and chapter pages. Content and ending pages carry none. |
| `minimal` | Keeps the logo on every page. |

Omitting `branding` is exactly the same as `cover-only`. Writing `footer` replaces what `full` would print in the footer, and an empty `footer: {}` turns that older footer off while keeping the logo.

## Page-level silence

The deck posture is only the broad permission. A face may carry the structural fact `branding: "none"`. A theme menu entry may also declare `brand: "none"`. Either one removes the whole shared brand fragment from that page, footer row included, even when the deck asks for it. A menu entry's `brand: "none"` also silences the page's metadata and footer marks.

This is intentional for faces whose composition has no safe brand frame. It is not a missing logo bug and it must not be repaired with page content. Theme motifs are separate from branding and remain governed by the face and menu decoration rules. A motif never prints footer information the deck did not ask for. Two motifs carry footer marks in a place of their own: brief's footer motif draws the whole footer row, and ink's colophon rail sets the organization down the right edge. A motif that draws in the footer strip, such as homeroom's two notebook lines, leaves it to the footer when the footer row is on.

## Extract a complete v2 theme

When the user supplies a `.thmx`, `.potx`, or branded `.pptx`, extract colors and fonts locally. Choose a donor whose menu fits the intended story because extraction copies that complete menu.

```bash
pptwise brand extract corp-template.pptx \
  -o deck-dir/theme.json \
  --id acme \
  --from brief
```

The output is a self-contained version 2 theme with style tokens, brand tokens, occasions, identity, and a complete menu. It has no base reference and inherits nothing at load time. Bind `acme` in `deck.spec.json`, then project commands resolve `deck-dir/theme.json` automatically.

To compare the result against other named themes, run the fixed fitting-room sample from a directory where all names resolve:

```bash
pptwise theme try acme,brief,swiss
```

The loader checks contrast. If extraction produces unsafe text and background pairs, adjust the extracted theme or create a palette fork. Do not add ad hoc per-page color overrides.
