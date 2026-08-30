# Branding posture

Read this when deciding deck-level brand visibility, extracting an Office brand, or understanding why a page has no brand frame.

A brand signal controls appearance. It does not choose the narrative or the page kind.

## Deck-level posture

`branding` has three values:

| value | visible result |
| --- | --- |
| `full` | Keeps the logo throughout, draws the content-page footer and metadata, and allows confidentiality and date on cover and ending metadata rows. |
| `cover-only` | Keeps the logo on cover and chapter pages. Content and ending pages drop the shared footer, metadata, and logo. |
| `minimal` | Keeps the logo but drops the content-page footer rule and metadata. |

Omitting `branding` is exactly the same as `cover-only`. Choose `full` only when every content page needs the organization footer, such as a confidential or controlled document.

## Page-level silence

The deck posture is only the broad permission. A face may carry the structural fact `branding: "none"`. A theme menu entry may also declare `brand: "none"`. Either one removes the whole shared brand fragment from that page, even when the deck says `full`.

This is intentional for faces whose composition has no safe brand frame. It is not a missing logo bug and it must not be repaired with page content. Theme motifs are separate from branding and remain governed by the face and menu decoration rules.

## Extract a complete v2 theme

When the user supplies a `.thmx`, `.potx`, or branded `.pptx`, extract colors and fonts locally. Choose a donor whose menu fits the intended story because extraction copies that complete menu.

```bash
pptwise brand extract corp-template.pptx \
  -o deck-dir/theme.json \
  --id acme \
  --from consulting
```

The output is a self-contained version 2 theme with style tokens, brand tokens, occasions, identity, and a complete menu. It has no base reference and inherits nothing at load time. Bind `acme` in `deck.spec.json`, then project commands resolve `deck-dir/theme.json` automatically.

To compare the result against other named themes, run the fixed fitting-room sample from a directory where all names resolve:

```bash
pptwise theme try acme,consulting,swiss
```

The loader checks contrast. If extraction produces unsafe text and background pairs, adjust the extracted theme or create a palette fork. Do not add ad hoc per-page color overrides.
