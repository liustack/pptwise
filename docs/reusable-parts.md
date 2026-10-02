---
summary: 'Reusable compositions, faces, motifs, component fields and engine fixes that came out of theme sample work, each with its code, the themes that use it, and where its settled board is archived'
read_when:
  - starting a theme or a theme sample, before drawing anything
  - a page needs an arrangement or a mark another theme already settled
  - finishing a theme sample, to add what it produced
---

# Reusable parts

Redrawing a theme's sample deck to an approved board keeps producing parts that are not really that theme's: a way to set an options table, a field that lets an author mark the bar a page is about, a fix to how PowerPoint places text. This page lists them so the next theme starts from them instead of drawing them again. Each entry says where the code is, which themes use it today, and where its settled board is archived under [`design/`](../design/README.md).

Every finished theme sample adds a section here, newest last, and archives its boards as [Design brief](./design-brief.md#after-the-pick) describes. When a later theme reuses a part, add that theme to the part's "used by".

## brief sample, 2026-10

The round redrew brief's eleven-page sample. Its decisions, and every place the engine departs from the board, are in [`design/rounds/2026-10-02-brief/`](../design/rounds/2026-10-02-brief/README.md).

### Compositions

A composition is a hand-set page body for one content shape. A face hands it the band under its heading and either gets the whole body back or `null`, in which case the face draws the page some other way, normally with the ordinary component renderer in the same band. A composition never shrinks, cuts or drops text, and reads only the band it is handed and the theme's tokens, so the face keeps its own heading, source line and footer.

The shared contract is [`src/layouts/compositions/shared.tsx`](../src/layouts/compositions/shared.tsx), and each file's header says what that composition takes, when it declines, the band it needs and the tokens it reads.

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `rows` | ruled, numbered rows of label and gloss, with an optional closing line in a primary block | `bullets` of two to five items, optionally followed by an `info` or `tip` `callout` | [rows.tsx](../src/layouts/compositions/rows.tsx) | brief | [design/compositions/rows](../design/compositions/rows/README.md) |
| `table` | an open ruled table with the recommended option lifted onto its own column | one `comparison` of two or three options and at most five rows | [table.tsx](../src/layouts/compositions/table.tsx) | brief | [design/compositions/table](../design/compositions/table/README.md) |
| `waves` | phase columns under colour bars, the marked phase in the accent | one `roadmap` of two to four phases, at most two measures each | [waves.tsx](../src/layouts/compositions/waves.tsx) | brief | [design/compositions/waves](../design/compositions/waves/README.md) |
| `tree` | an owner block over a row of cards, joined by a square connector | one `org_tree` with two to four branches and no third level | [tree.tsx](../src/layouts/compositions/tree.tsx) | brief | [design/compositions/tree](../design/compositions/tree/README.md) |
| `rail` | a trend chart with a column that states each series' change from first to last | one category-axis `chart` (bar, line, area, stacked or combo) with one to three series | [rail.tsx](../src/layouts/compositions/rail.tsx) | brief | [design/compositions/rail](../design/compositions/rail/README.md) |

brief reaches all five through `composeSheet` in [`src/layouts/gauge-sheet/sheet.tsx`](../src/layouts/gauge-sheet/sheet.tsx), which serves its `gauge-sheet`, `gauge-exhibit` and `gauge-figure` faces. A new face uses them the same way:

```tsx
import { compose } from "./compositions"

const body = compose({ components: slide.components, ctx, rect: bodyBand })
// body is the whole drawing, or null: then draw slide.components another way in bodyBand
```

`compose` tries every composition. Pass a list of ids as its second argument to offer only some. Tests for each composition on brief, on two unrelated themes (ember and crayon) and in a shifted band live beside the code. The gallery draws at least one page per composition in its "构图" band (`COMPOSITION_PAGES` in `evals/gallery/matrix.ts`), so every full L1 audit covers them.

### Faces

brief's own pages, drawn to the board. They are registered faces, so another theme's menu can name them as they are. All the content faces share one frame from [`src/layouts/gauge-shared.tsx`](../src/layouts/gauge-shared.tsx): the claim at 36px regular weight on a primary rule at y172 (`GaugeHead`) and the source on the footnote line (`GaugeSource`).

| face | page | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `gauge-verdict` | cover with three supporting points | [cover-gauge-verdict.tsx](../src/layouts/cover-gauge-verdict.tsx) | brief | [design/faces/gauge-verdict](../design/faces/gauge-verdict/README.md) |
| `gauge-point` | one claim and one paragraph | [content-gauge-point.tsx](../src/layouts/content-gauge-point.tsx) | brief | [design/faces/gauge-point](../design/faces/gauge-point/README.md) |
| `gauge-section` | full navy chapter page | [chapter-gauge-section.tsx](../src/layouts/chapter-gauge-section.tsx) | brief | [design/faces/gauge-section](../design/faces/gauge-section/README.md) |
| `gauge-sheet` | the ordinary content page, handing its body to the compositions | [content-gauge-sheet.tsx](../src/layouts/content-gauge-sheet.tsx) | brief | the composition boards above |
| `gauge-exhibit` | one exhibit across the whole body | [content-gauge-exhibit.tsx](../src/layouts/content-gauge-exhibit.tsx) | brief | [design/components/waterfall](../design/components/waterfall/README.md) |
| `gauge-figure` | one figure set very large | [content-gauge-figure.tsx](../src/layouts/content-gauge-figure.tsx) | brief | [design/faces/gauge-figure](../design/faces/gauge-figure/README.md) |
| `gauge-next` | the closing ask and three next steps | [ending-gauge-next.tsx](../src/layouts/ending-gauge-next.tsx) | brief | [design/faces/gauge-next](../design/faces/gauge-next/README.md) |

### Motif

| motif | what it draws | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `folio-motif` | a report footer: a hairline at y664 over one row of small marks, the organization on the left and the confidentiality label on the right | [motif-folio-motif.tsx](../src/motifs/motif-folio-motif.tsx) | brief | [design/motifs/folio-motif](../design/motifs/folio-motif/README.md) |

### Component fields

Author fields, so every theme has them as soon as an author writes them. The brief showcase is the first deck that does.

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `comparison.recommended` | names the option the page recommends: its header and cells set bold in primary, and `table` lifts its column | [comparison.ts](../src/ir/components/comparison.ts), [comparison.tsx](../src/components/comparison.tsx) | [design/components/comparison](../design/components/comparison/README.md) |
| `roadmap.items[].emphasis` | marks one phase: only its bar keeps the accent | [roadmap.ts](../src/ir/components/roadmap.ts), [roadmap.tsx](../src/components/roadmap.tsx) | [design/components/roadmap](../design/components/roadmap/README.md) |
| `chart.series[].emphasis` | marks one series: it keeps the lead colour, the others recede to grey, and in a combo chart only its points print values | [chart.ts](../src/ir/components/chart.ts), [chart.tsx](../src/components/chart.tsx), [chart-svg.tsx](../src/components/chart-svg.tsx), [chart-palette.ts](../src/render/chart-palette.ts) | [design/components/chart](../design/components/chart/README.md) |
| `waterfall.items[].emphasis`, `waterfall.emphasis_label` | marks a run of adjacent bars: they take the accent, the rest recede, and a bracket with the label spans them | [waterfall.ts](../src/ir/components/waterfall.ts), [waterfall.tsx](../src/components/waterfall.tsx) | [design/components/waterfall](../design/components/waterfall/README.md) |

### Engine behaviour

Fixes the sample exposed. They change how every theme draws or exports, with no field to turn them on.

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| Waterfall broken axis | a bridge whose levels are all positive, with the lowest at least half the highest, starts its axis at a floor, and its totals carry cut marks at the foot | [waterfall.tsx](../src/components/waterfall.tsx) (`truncatedFloor`) | [design/components/waterfall](../design/components/waterfall/README.md) |
| Chinese numbers stay with their units | a line never breaks between a figure and the unit or magnitude after it (「12｜个」, 「2,860｜万」), or between a magnitude and what it counts (「亿｜元」) | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`allowsLineBreakBetween`) | none, a text layout rule |
| PPTX text baseline | exported text boxes are placed so PowerPoint's baseline lands on the SVG baseline, using each font's own ascent ratio, and paragraph-end marks carry their paragraph's fonts so the ratio holds | [baseline.ts](../src/pptx/svg2pptx/baseline.ts), [text.ts](../src/pptx/svg2pptx/text.ts), [pptx-paragraph-mark.ts](../src/pptx/pptx-paragraph-mark.ts) | none, the calibration is in the header of `baseline.ts` |

## brief real-data deck, 2026-10

A twelve-page Chinese and English review on brief, written from public results rather than redrawn to a board. It produced no new parts, only engine fixes, which change how every theme draws.

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| Bars stay on their category | a bar, horizontal bar or combo chart whose series cover different categories centres each category's bars under its name, every bar as thick as the fullest category's. Two series over their own categories (full years beside half-years) is how a chart colours two groups of categories apart | [chart-svg.tsx](../src/components/chart-svg.tsx) (`barSlots`, `fullestGroup`) | none |
| A chart gives up plot height before a page loses a block | a chart on a cartesian plot draws its plot down to 160px from 200 when the page would otherwise drop a block or step aside, so a chart and a two-line callout share brief's band | [chart.tsx](../src/components/chart.tsx) (`chartMinHeight`), [layout.ts](../src/render/layout.ts) (`shrinkStack`) | none |
| A marked run is measured at the weight it is painted in | the pad or underline under a `**…**` run and the run after it are placed from the run's bold width, and a callout wraps each line to its painted width | [emphasis.ts](../src/render/emphasis.ts) (`runWeight`, `layoutEmphasisText`) | none |
| No highlight without the accent | a single bar series highlights its tallest bar in the accent only where the chart palette carries the accent. A face that keeps the accent for the author's marks gets the series flat in the lead colour | [chart-svg.tsx](../src/components/chart-svg.tsx) (`highlightsTallestBar`) | none |
| A rate changes by points | `rail` states a percent series' change as "+10.9 pts" or 「+10.9 个百分点」 | [rail.tsx](../src/layouts/compositions/rail.tsx) (`changeFigure`) | [design/compositions/rail](../design/compositions/rail/README.md) |

## brief tea sample, 2026-10

The round that redrew the real-data deck above to an approved board: twelve pages in Chinese and English on China's listed tea chains. Its decisions, and every place the engine departs from the board, are in [`design/rounds/2026-10-02-brief-tea/`](../design/rounds/2026-10-02-brief-tea/README.md).

### Compositions

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `figures` | two to four headline figures in open columns with hairlines between them, then a quote set large with its speaker, or a closing block | `kpi_cards` of two to four items, each a value, a label and a `note`, optionally followed by a `blockquote` or an `info` or `tip` `callout` | [figures.tsx](../src/layouts/compositions/figures.tsx) | brief | [design/compositions/figures](../design/compositions/figures/README.md) |
| `track` | a timeline on one rule across the page, a dot per milestone, the marked one larger in the accent, then a closing block | one horizontal `timeline` of two to six milestones, optionally followed by an `info` or `tip` `callout` | [track.tsx](../src/layouts/compositions/track.tsx) | brief | [design/compositions/track](../design/compositions/track/README.md) |
| `pairs` | "Label: value" facts as ruled pairs for a narrow column | one `bullets` of two to six items, every one written "Label: value" | [pairs.tsx](../src/layouts/compositions/pairs.tsx) | brief (through `image-split`'s report column) | [design/compositions/pairs](../design/compositions/pairs/README.md) |

Two settled compositions grew:

- `rail` takes the author's figures: a `chart` followed by one or two `kpi_cards` items, and optionally a closing `callout` or `blockquote`, sets them in the column instead of the computed changes. A chart alone still gets the computed column. Code: [rail-figures.tsx](../src/layouts/compositions/rail-figures.tsx). Board: [design/compositions/rail](../design/compositions/rail/README.md).
- `table` takes four options and a closing `callout`, and steps down from the first board's size to a compact and a dense one when the table does not hold. Board: [design/compositions/table](../design/compositions/table/README.md).

The full-width primary block that closes `rows` is shared now ([closing.tsx](../src/layouts/compositions/closing.tsx)): `table`, `track` and `figures` close with it too, each at its board's size. A chart page closes in its column instead. The figure and quote setting the compositions share is in [figure.tsx](../src/layouts/compositions/figure.tsx).

brief's sheets offer every composition except `pairs` (`SHEET_COMPOSITIONS` in [`src/layouts/gauge-sheet/sheet.tsx`](../src/layouts/gauge-sheet/sheet.tsx)). `pairs` is drawn for a narrow column, and across the whole page it would take a list `rows` turned down. The gallery's 构图 band has a page for each, and second pages for `rail` with written figures and for `table` at its dense size.

### Faces

| face | what changed | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `gauge-figure` | the kpi_cards' second and third items stand right of a hairline beside the lead figure | [content-gauge-figure.tsx](../src/layouts/content-gauge-figure.tsx) | brief | [design/faces/gauge-figure](../design/faces/gauge-figure/README.md) |
| `image-split` | a `column` parameter: `report` sets a 600px photograph, a 40px regular title, a 48 by 6 bar and the facts as `pairs`. Every other theme keeps `standard` | [image-pages.tsx](../src/render/image-pages.tsx) (`SPLIT_COLUMNS`) | brief (`report`), bulletin, ember, heritage, ink, journal, luxe, museum | [design/faces/image-split](../design/faces/image-split/README.md) |

A takeover face now receives its menu entry's `params`, the way a standard face always has.

### Component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `kpi_cards.items[].note` | the line under a figure that puts it in context. The ordinary card prints it under the label in body ink, the bento cell the same way. A face with no place for it hands the page to the ordinary cards | [kpi-cards.ts](../src/ir/components/kpi-cards.ts), [kpi.tsx](../src/components/kpi.tsx), [content-bento-panel.tsx](../src/layouts/content-bento-panel.tsx) | [design/components/kpi_cards](../design/components/kpi_cards/README.md) |

`blockquote.attribution` was already the field for who said it. `figures` prints it under the quote as the speaker, and `rail` prints it above the quote as the block's label.

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| Takeovers draw the source line | `image-split`, `image-top`, `image-bottom` and `image-annotate`, and the plain pages they hand image groups to, set `footnote` at 16px muted within two lines and keep their body clear of it. They drew none before, on every theme | [image-pages.tsx](../src/render/image-pages.tsx) (`takeoverSource`) | [design/faces/image-split](../design/faces/image-split/README.md) |
| The audit finds a source line no one painted | `pptwise audit` reports `content-dropped` (kind `footnote`) when a page's `footnote` is not spelled out by any run of its text | [source-line.ts](../src/audit/source-line.ts), [deck-audit.ts](../src/audit/deck-audit.ts) | none |
| A heading's length leaves out its marks | the 48-character heading limit in spec validation and the IR quality check counts the words a reader sees, not the `**` around a marked run | [spec/index.ts](../src/spec/index.ts), [ir-quality.ts](../src/render/ir-quality.ts) | none |
| A marked run in a quote is painted | the ordinary `blockquote` sets a `**…**` run in the theme's emphasis instead of printing the asterisks | [blockquote.tsx](../src/components/blockquote.tsx) | none |
| Curly quotes are as wide as PowerPoint draws them | the export writes every run as `lang="en-US"`, and PowerPoint then paints “ ” ‘ ’ from the run's Latin face, beside Chinese text too. They measure at that face's own advance (Georgia 0.41em and 0.23em, YaHei, SimSun and KaiTi the full em) instead of a full em in every face, so the run after an opening quote, and its highlight, land where PowerPoint draws them. `figures` and `rail` set a quote's marks in its line again | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`FULL_EM_LATIN_MARK_RE`), [symbol-advances.ts](../src/lib/symbol-advances.ts) (`LATIN_FACE_MARK_ADVANCES`, written by [gen-symbol-advances.mts](../scripts/gen-symbol-advances.mts)), [figure.tsx](../src/layouts/compositions/figure.tsx) | none |
| The em dash and middle dot are as wide as PowerPoint draws them | PowerPoint paints "—" and "·" from the run's Latin face too, the way it paints a curly quote, beside Chinese text as much as English. They measure at that face's own advance (Georgia 0.86em and 0.28em, YaHei 1.08em and 0.24em, SimSun and KaiTi the full em, Consolas its grid) instead of YaHei's 1.08em for every Georgia dash and a mark's 0.46em for most dots, so the run after 「——」 or "·", and its highlight, land where PowerPoint draws them. A line still breaks on either side of an em dash | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`FULL_EM_LATIN_MARK_RE`, `splitWideBoundaries`), [symbol-advances.ts](../src/lib/symbol-advances.ts) (`LATIN_FACE_MARK_ADVANCES`, written by [gen-symbol-advances.mts](../scripts/gen-symbol-advances.mts)) | none |
| Latin headings break evenly | balanced text with no Chinese in it (headings, and the cells that ask for it) evens its lines whenever an even split is no wider than the greedy one, the way CSS `text-wrap: balance` sets a heading, so "Guangzhou lost 2,326 tea" + "shops in a year" reads "Guangzhou lost 2,326" + "tea shops in a year". Chinese and mixed text still rebalance only a short last line, since an even split there falls between any two characters | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`balanceWrappedLines`) | none |
| A quote set large balances its lines | `figures` and `rail` fit a quote the way a heading is fitted, so a last line a third as long as the first evens out: 「“第三方外卖平台补贴」+「减少则构成拖累。”」 | [figure.tsx](../src/layouts/compositions/figure.tsx) (`fitQuote`), [type.tsx](../src/layouts/compositions/type.tsx) (`balance`) | none |

