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
| `image-split` | a `column` parameter: `report` sets a 600px photograph, a 40px regular title, a 48 by 6 bar and the facts as `pairs`. Every other theme keeps `standard` | [image-pages.tsx](../src/render/image-pages.tsx) (`SPLIT_COLUMNS`) | brief (`report`), bulletin (`notice`), ember, heritage, ink, journal, luxe, museum | [design/faces/image-split](../design/faces/image-split/README.md) |

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

## bulletin NEV sample, 2026-10

The round redrew bulletin to a thirteen-page Chinese and English review of the 2026 third-quarter NEV market. Its decisions, the design system every bulletin page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-03-bulletin/`](../design/rounds/2026-10-03-bulletin/README.md). The rules are restated for the next design session in [Designing for bulletin](./design-bulletin.md).

### Compositions

The compositions now take a `setting` from the face that offers them (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)). `board` is brief's first board and the default. `notice` is this round's: the same shapes set the way bulletin's board sets them, and a closing note on a light grey panel with a stroked circle for a warning (`paintNoticeClosing` in [closing.tsx](../src/layouts/compositions/closing.tsx)), since bulletin keeps its primary for the one marked thing. A composition that has no notice form ignores the setting.

New, all in the notice setting so far:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `columns` | an upright bar chart with no value axis: legend and unit over the plot, every value printed, forecast bars hatched, target bars outlined, change brackets over two columns | one `chart` (`bar` upright or `stacked`), one to three series (two to four stacked), two to six categories, no negative values | [columns.tsx](../src/layouts/compositions/columns.tsx), [plot.tsx](../src/layouts/compositions/plot.tsx) | bulletin | [design/compositions/columns](../design/compositions/columns/README.md) |
| `bars` | a horizontal grouped bar chart: one row per category, each value at its bar's end, a change written after the bar it lands on | one horizontal `bar` chart, one to three series, two to six categories, every change with `at` | [bars.tsx](../src/layouts/compositions/bars.tsx) | bulletin | [design/compositions/bars](../design/compositions/bars/README.md) |
| `bridge` | a waterfall with no value axis: grey totals with cut marks on a truncated axis, the marked step in primary with its value inside | one `waterfall` of two to six bars, no level below zero, no `emphasis_label` | [bridge.tsx](../src/layouts/compositions/bridge.tsx) | bulletin | [design/compositions/bridge](../design/compositions/bridge/README.md) |
| `records` | an open data table: small headers over a black rule, 50px rows, a highlighted row on a pale primary tint, an optional note panel | `data_table` of two to six columns and up to eight one-line rows, optionally followed by a `callout` | [records.tsx](../src/layouts/compositions/records.tsx) | bulletin | [design/compositions/records](../design/compositions/records/README.md) |
| `stack` | two or three headline figures stacked on the left, a titled list of bold lines and muted lines on the right | `kpi_cards` of two or three plain figures, then an `insight_panel` with no footnote | [stack.tsx](../src/layouts/compositions/stack.tsx) | bulletin | [design/compositions/stack](../design/compositions/stack/README.md) |
| `window` | a short calendar as one band of blocks, the marked stretch in primary, with facts in columns under it | `gantt` with whole-unit, non-overlapping bars and one `axis_labels` entry per unit (two to six), then `kpi_cards` of two to four facts | [window.tsx](../src/layouts/compositions/window.tsx) | bulletin | [design/compositions/window](../design/compositions/window/README.md) |
| `lanes` | one axis across the page, milestones as equal columns, the first lane's cards above and the second's below, an optional note panel | a horizontal `timeline` of two to eight milestones, optionally with lanes, optionally followed by a `callout` | [lanes.tsx](../src/layouts/compositions/lanes.tsx) | bulletin | [design/compositions/lanes](../design/compositions/lanes/README.md) |

Settled compositions that grew a notice form:

- `rows` takes `numbered_cards` too, sets each item in a 104px band, and reverses the marked card out of a primary block as the page's answer. Board: [design/compositions/rows](../design/compositions/rows/README.md).
- `rail` hands its plot to `columns`, `bars` or `bridge` and sets the author's figures in a column right of a hairline (`railFiguresNotice` in [rail-figures.tsx](../src/layouts/compositions/rail-figures.tsx)). A figure with a note no longer sends the page to a plainer face. Board: [design/compositions/rail](../design/compositions/rail/README.md).
- `pairs` sets a value written `**figure**，note` as the marked row: the figure at 40px in primary with the note under it. Board: [design/faces/image-split](../design/faces/image-split/README.md).
- `table` keeps the other options muted and the recommended one black and bold under a primary header. Board: [design/compositions/table](../design/compositions/table/README.md).

The tests for each new composition run it on bulletin and on ember and crayon, two themes that share nothing with it. The gallery's 构图 band has a bulletin page for each.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `notice-sheet` | the ordinary content page: a black bold claim over a hairline with a 96 by 3 primary bar, the body handed to the compositions in the notice setting, the source at 14px. Takes a full-body `waterfall` or `gantt` beside a `kpi_cards` (`fullBodyCompanions`) | [content-notice-sheet.tsx](../src/layouts/content-notice-sheet.tsx), [notice-shared.tsx](../src/layouts/notice-shared.tsx) | bulletin (points, list, comparison, process, data, hierarchy) | [design/faces/notice-sheet](../design/faces/notice-sheet/README.md) |
| `ikb-field-cover` | redrawn: a full primary field, a small line, the title at 80px, a short white bar, the subtitle and the date in white held to contrast | [cover-ikb-field-cover.tsx](../src/layouts/cover-ikb-field-cover.tsx), [field-type.tsx](../src/layouts/field-type.tsx) | bulletin | [design/faces/ikb-field-cover](../design/faces/ikb-field-cover/README.md) |
| `signoff-ending` | redrawn: a full primary field, what needs deciding at 56px, a thin rule, the next steps as numbered columns | [ending-signoff-ending.tsx](../src/layouts/ending-signoff-ending.tsx), [field-type.tsx](../src/layouts/field-type.tsx) | bulletin | [design/faces/signoff-ending](../design/faces/signoff-ending/README.md) |
| `image-split` | a `notice` column: a 560px photograph, the notice head and the facts as notice `pairs` | [image-pages.tsx](../src/render/image-pages.tsx) (`NoticeSplitPage`) | bulletin | [design/faces/image-split](../design/faces/image-split/README.md) |

A face can now declare `fullBodyCompanions`, the component types it sets beside one full-body component. validate lets exactly that page through on that face and refuses it everywhere else.

### Motif

| motif | what it draws | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `bulletin-motif` | three square steps top right on every page: small and in primary on content pages, large and white on the cover and ending. The ruler and the title band are gone | [motif-bulletin-motif.tsx](../src/motifs/motif-bulletin-motif.tsx) | bulletin | [design/motifs/bulletin-motif](../design/motifs/bulletin-motif/README.md) |

### Component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `chart.series[].data[].status` | `"forecast"` hatches a bar, `"target"` outlines it dashed over a pale tint, in the ordinary bar and stacked charts and the hand-set plots, with a legend entry and a forecast label | [chart.ts](../src/ir/components/chart.ts), [mark-status.tsx](../src/render/mark-status.tsx), [chart.tsx](../src/components/chart.tsx), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `chart.changes` | a bracket with the change over two columns, or with `at` the change between two series at one category | [chart.ts](../src/ir/components/chart.ts), [change-figure.ts](../src/lib/change-figure.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `numbered_cards.items[].emphasis` | the one card the page lands on, its pill filled in primary | [numbered-cards.ts](../src/ir/components/numbered-cards.ts), [numbered-cards.tsx](../src/components/numbered-cards.tsx) | [design/components/numbered_cards](../design/components/numbered_cards/README.md) |
| `gantt.items[].text`, `gantt.items[].emphasis` | a line under a stretch's label, and the one stretch the page is about | [gantt.ts](../src/ir/components/gantt.ts), [gantt.tsx](../src/components/gantt.tsx) | [design/components/gantt](../design/components/gantt/README.md) |
| `timeline.milestones[].lane`, `timeline.lanes` | two tracks on one time order. The ordinary timeline prints the lane before the date | [timeline.ts](../src/ir/components/timeline.ts), [timeline.tsx](../src/components/timeline.tsx) | [design/components/timeline](../design/components/timeline/README.md) |
| `kpi_cards.items[].value` with `**…**` | the one figure set in the theme's emphasis, in the ordinary card and in the compositions that set figures. The bento cell and the big-number faces print it without its asterisks | [kpi.tsx](../src/components/kpi.tsx) (`kpiValueText`) | [design/compositions/stack](../design/compositions/stack/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A numbered card paints its marks | titles and texts of `numbered_cards` set a `**…**` run as emphasis instead of printing the asterisks | [numbered-cards.tsx](../src/components/numbered-cards.tsx) | none |
| The audit finds printed marks | `pptwise audit` and the gallery's L1 report `content-dropped` (kind `emphasis`) for any painted text that still shows an opening `**` | [printed-marks.ts](../src/audit/printed-marks.ts), [deck-audit.ts](../src/audit/deck-audit.ts), [l1.ts](../evals/gallery/l1.ts) | none |
| Chinese lines break after a comma | balanced Chinese text moves a break back to the clause punctuation before it, so 「内需缩了两成，四」+「季度怎么打」 reads 「内需缩了两成，」+「四季度怎么打」, and a two-line Chinese heading evens its lines when a better seam leaves them at least as even | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`breakScore`, `preferScriptBoundaries`, `balanceWrappedLines`) | none |
| A unit stands apart from its number, a magnitude does not | a waterfall prints 「382.1 万辆」 and "3.82 million units", not 「382.1万辆」. A percent sign or a Latin magnitude (k, m, bn) stays glued to its figure, "12%" and "2m", in a waterfall and on a chart axis alike, so "2 m" no longer reads as two metres | [quantity-format.ts](../src/lib/quantity-format.ts), [waterfall.tsx](../src/components/waterfall.tsx) | none |
| Chart value labels name their font | bar, horizontal bar, pie, donut, funnel and dumbbell value labels carry the body font, so a preview renderer no longer falls back to a serif | [chart-svg.tsx](../src/components/chart-svg.tsx) | none |
| A dumbbell row that fell keeps its labels apart | the end value sits before the end dot when the row fell, instead of running over the start dot | [chart-svg.tsx](../src/components/chart-svg.tsx) (`renderDumbbell`) | none |
| Card faces fit their footnote | `bento-panel`, `tone-adaptive-content` and `stacked-poster` shrink a long footnote to 16px and then cut it with `data-truncated`, instead of running past the type area | [face-footnote.tsx](../src/render/face-footnote.tsx) | none |
| A deck with no chapters numbers pages plainly | `rail-numbered` prints 「01」 to 「10」 in a deck with no chapter pages, instead of a section number like "1.10" for a section that does not exist | [content-rail-numbered.tsx](../src/layouts/content-rail-numbered.tsx) | none |
| `theme try` compares themes with different menus | a sample page whose kind a theme does not offer is left out of that theme's column and marked in the cell, instead of failing the whole comparison | [commands.ts](../src/cli/commands.ts) (`runThemeTry`), [preview-html.ts](../src/cli/preview-html.ts) | none |
| A bullet's length leaves out its marks | the bullet length checks in validate count the words a reader sees, not the `**` around a marked run | [ir-quality.ts](../src/render/ir-quality.ts) | none |

## swiss power sample, 2026-10

The round redrew swiss to a fourteen-page Chinese and English annual report on the world's and China's power systems in 2025. Its decisions, the design system every swiss page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-03-swiss/`](../design/rounds/2026-10-03-swiss/README.md). The rules are restated for the next design session in [Designing for swiss](./design-swiss.md).

### Compositions

The compositions take a third `setting`, `grid` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx), the inks in [grid.ts](../src/layouts/compositions/grid.ts)): the notice setting's shapes on the notice band, recoloured for a page whose data is black. Data takes the text ink, what steps back two greys, and the theme's emphasis ink (`emphasisRunInk`, swiss's red) the one mark, a forecast's hatching and the bracket that states a chart's change. Blocks that carry text stay black. A composition with no grid form ignores the setting.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `share` | a share bar across the top of the band, the rest of the page handed on to the face's other compositions under it (`handOn`) | a share bar (a `stacked` chart with `direction: "horizontal"` and one category) first, then anything one of the face's compositions or the component renderer takes | [share.tsx](../src/layouts/compositions/share.tsx), [share-bar.tsx](../src/components/share-bar.tsx) | swiss, bulletin | [design/compositions/share](../design/compositions/share/README.md) |
| `contents` | the pages a chapter holds, number and heading, drawn whole or not at all | the deck, read off the chapter page's position (`chapterContents`), so `compose` never offers it: a chapter face calls `drawContents` | [contents.tsx](../src/layouts/compositions/contents.tsx) | swiss (`decimal-index-chapter`) | [design/compositions/contents](../design/compositions/contents/README.md) |

Settled compositions that grew a grid form:

- `columns` draws bars black and the marked bar or series red, names one series in the unit line, hatches a forecast red, brackets the change in red, and scales its tallest column to nine tenths of the bars' height. Board: [design/compositions/columns](../design/compositions/columns/README.md).
- `bridge` takes `emphasis_label` as a red bracket over the marked run, with the run red, an unmarked step light grey and the total black. Board: [design/compositions/bridge](../design/compositions/bridge/README.md).
- `records` sets 2px black rules under the headers and over a total, 48px rows of 20px cells, and the highlighted row red on a pale red tint. Board: [design/compositions/records](../design/compositions/records/README.md).
- `lanes` names the lanes and marks the highlighted milestone in red on a 2px axis. Board: [design/compositions/lanes](../design/compositions/lanes/README.md).
- `rail` stands its figure column right of a black rule at x800, and in a band too short for stacked figures sets each note beside its 44px figure. Board: [design/compositions/rail](../design/compositions/rail/README.md).
- `figures` sets two to four figures at the largest of 104, 72, 56 and 46px at which all fit, the marked one red. Board: [design/compositions/figures](../design/compositions/figures/README.md).

`compose` hands every composition a `handOn` that draws other components with the same compositions, in the same setting, so a composition that draws part of a page can pass the rest on. bulletin's notice sheet offers `share` too, before `rail`.

The tests for the grid forms and the new compositions run them on swiss and on ember, crayon or bulletin ([grid.test.tsx](../src/layouts/compositions/grid.test.tsx), [contents.test.tsx](../src/layouts/compositions/contents.test.tsx), [share-bar.test.tsx](../src/components/share-bar.test.tsx)). The gallery's 构图 band has a bulletin page for `share`.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `grid-sheet` | the ordinary content page: the chapter line, a black bold claim across the full measure on a 2px black rule, the body handed to the compositions in the grid setting, the source at 14px. Takes a full-body `waterfall` beside a `kpi_cards` | [content-grid-sheet.tsx](../src/layouts/content-grid-sheet.tsx), [grid-shared.tsx](../src/layouts/grid-shared.tsx) | swiss (points, list, comparison, process, data, evidence, hierarchy) | [design/faces/grid-sheet](../design/faces/grid-sheet/README.md) |
| `grid-statement` | the conclusion at 56px over a heavy rule, the figures it rests on in columns | [content-grid-statement.tsx](../src/layouts/content-grid-statement.tsx) | swiss | [design/faces/grid-statement](../design/faces/grid-statement/README.md) |
| `grid-figure` | one figure at 176px with its context, two supporting figures right of a black rule | [content-grid-figure.tsx](../src/layouts/content-grid-figure.tsx) | swiss | [design/faces/grid-figure](../design/faces/grid-figure/README.md) |
| `image-top` | a `band` parameter: `grid` sets the claim on a black rule under the photograph and the figures in columns. Every other theme keeps `standard` | [image-pages.tsx](../src/render/image-pages.tsx) (`GridTopPage`) | swiss (`grid`) | [design/faces/image-top](../design/faces/image-top/README.md) |
| `institutional-block` | redrawn: the organization and the date over a hairline, the title on its last line at 88px, a short red bar, the subtitle | [cover-institutional-block.tsx](../src/layouts/cover-institutional-block.tsx) | swiss | [design/faces/institutional-block](../design/faces/institutional-block/README.md) |
| `decimal-index-chapter` | redrawn: the number at 240px in red, the name and what it covers on a rule, the chapter's pages listed under it | [chapter-decimal-index-chapter.tsx](../src/layouts/chapter-decimal-index-chapter.tsx) | swiss | [design/faces/decimal-index-chapter](../design/faces/decimal-index-chapter/README.md) |
| `resolution-ending` | redrawn: a small line, the title at 64px, three numbered columns of label and gloss, an item written `label：gloss` split at the colon | [ending-resolution-ending.tsx](../src/layouts/ending-resolution-ending.tsx) | swiss | [design/faces/resolution-ending](../design/faces/resolution-ending/README.md) |

### Motif

| motif | what it draws | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `swiss-motif` | redrawn: one 8px red bar along the top of every page. The 12px bar and the cover's grey ticks are gone | [motif-swiss-motif.tsx](../src/motifs/motif-swiss-motif.tsx) | swiss | [design/motifs/swiss-motif](../design/motifs/swiss-motif/README.md) |

### Component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `chart.series[].data[].emphasis` | the one bar a page is about: it keeps its series' colour and the other bars step back, in the ordinary chart and the hand-set plots | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx), [plot.tsx](../src/layouts/compositions/plot.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `chart` `stacked` with `direction: "horizontal"` | a share bar: one whole as a single bar cut into its parts, each named with its value, a marked run of adjacent parts totalled under it. Every theme draws it | [chart.ts](../src/ir/components/chart.ts) (`isShareBar`), [share-bar.tsx](../src/components/share-bar.tsx), [chart.tsx](../src/components/chart.tsx) | [design/components/chart](../design/components/chart/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| Figures are grouped by language | chart and waterfall values, axis ticks and totals group their digits in threes the way the chart's language prints a figure: "2,778" in English, 「8490」 and 「10,575」 in Chinese (GB/T 15835-2011 lets a four-digit integer go ungrouped) | [quantity-format.ts](../src/lib/quantity-format.ts) (`groupDigits`), [chart-svg.tsx](../src/components/chart-svg.tsx), [cartesian-axis.tsx](../src/components/cartesian-axis.tsx), [waterfall.tsx](../src/components/waterfall.tsx), [plot.tsx](../src/layouts/compositions/plot.tsx) | none |
| The blank beside a marked run survives | a flowing emphasis span with a blank on an edge another span meets carries `xml:space="preserve"`, so `rsvg-convert` keeps the space it used to strip ("worldwide:112 GW"). Browsers and the PowerPoint export already kept it | [emphasis.ts](../src/render/emphasis.ts) (`renderEmphasisTspans`) | none |
| A power unit stays whole | a Chinese line keeps 「亿千瓦」, 「万千瓦」, 「千瓦」 and 「千瓦时」 on one line, and a figure with 「瓦」 | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`allowsLineBreakBetween`) | none |
| A split label declares its colon | a face that sets an item's label apart from its gloss names the colon it set as the break (`data-gloss-break`), and the content audit reads it back | [fidelity.ts](../evals/gallery/fidelity.ts), [grid-shared.tsx](../src/layouts/grid-shared.tsx) (`FittedLines`) | none |
| An English paragraph does not end on one word | text with no Chinese in it that the greedy wrap ends on a lone word takes the last word of the line before down to it, the way CSS `text-wrap: pretty` sets body text: "IEA sees coal power up 1.4%" + "in 2026" where it read "…1.4% in" + "2026". It moves only when that adds no line, leaves the line above two words or more and makes no line wider than the widest, so nothing is set smaller. Chinese keeps its own rule for a lone last character | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`avoidLatinOrphan`) | none |
| An English heading breaks between its sentences | balanced text (headings, and the quotes and cells that ask for it) takes a break between two English sentences over an even split whenever no line comes out wider than the plain wrap's widest, as a Chinese heading takes its comma: "Clean power met all new demand." + "Not settled yet." where it read "Clean power met all new" + "demand. Not settled yet.". The lines the break leaves are evened, a one-word last sentence keeps company, and the full stop of an initialism ("U.S.") or a short title ("Dr.") is no sentence end | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) (`preferScriptBoundaries`, `isLatinSentenceBreak`) | none |

## ledger AI capex sample, 2026-10

The round redrew ledger to a fifteen-page Chinese and English investment committee review of the AI capital spending of the four largest US cloud companies in 2026. Its decisions, the design system every ledger page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-04-ledger/`](../design/rounds/2026-10-04-ledger/README.md). The rules are restated for the next design session in [Designing for ledger](./design-ledger.md).

### Compositions

The compositions take a fourth `setting`, `panel` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx), the panel, its title bar and its inks in [panel.tsx](../src/layouts/compositions/panel.tsx)): every shape in a dark panel with a 36px title bar naming it and its unit. The theme's emphasis ink is the one mark, its success and danger inks say only which way a value moved, and unmarked series take the chart palette after its lead, nearest the mark first. Each composition's panel form lives in its own file beside the composition (`records-panel.tsx`, `table-panel.tsx`, `lanes-panel.tsx`, `rail-panel.tsx`, `figures-panel.tsx`, `columns-panel.tsx`, `bars-panel.tsx`), and the composition hands the page to it when the face asks for the panel setting. A composition with no panel form ignores the setting.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `tiles` | numbered cards as numbered panels, two by two or three in a row, the number in each title bar | one `numbered_cards` of three or four items. The panel setting only | [tiles.tsx](../src/layouts/compositions/tiles.tsx) | ledger | [design/compositions/tiles](../design/compositions/tiles/README.md) |
| `shifts` | a dumbbell chart in a panel, the rises in the mark, a parenthesis in a category set as a note under its name | one `dumbbell` chart of two series. The panel setting only, and `rail` sets it beside figure panels | [shifts.tsx](../src/layouts/compositions/shifts.tsx) | ledger | [design/compositions/shifts](../design/compositions/shifts/README.md) |
| ticker | a row of headline figures under a cover's title: label, figure, unit, and the move or a note | one `kpi_cards` of two to four items. A face calls it (`drawTicker`), `compose` never offers it | [ticker.tsx](../src/layouts/compositions/ticker.tsx) | ledger (`stat-cover`) | [design/compositions/ticker](../design/compositions/ticker/README.md) |

Settled compositions that grew a panel form:

- `columns` sets a single series, a stack or a bar-and-line combo in a panel with no value axis, a legend from the top of the stack down, a total on every column, a change bracketed in the mark (in the direction's colour when a bar is marked), and a marked combo line's two ends with their values. Board: [design/compositions/columns](../design/compositions/columns/README.md).
- `bars` sets one horizontal series as rows with the value after the bar, and, for the fact page, two or three bars each under its name with the value inside the bar's end (`compareBarsPanel`). Board: [design/faces/panel-figure](../design/faces/panel-figure/README.md) and [design/compositions/rail](../design/compositions/rail/README.md).
- `records` sets a data table in a panel named by its `title`, figures large in the heading face, a negative figure in the danger ink, a highlighted row on the mark's tint with a bar down its edge, at a large and a compact size. Board: [design/compositions/records](../design/compositions/records/README.md).
- `table` sets the options in a panel, the recommended column on the mark's tint inside its edge with 「（建议）」 or " (recommended)" after its header. Board: [design/compositions/table](../design/compositions/table/README.md).
- `lanes` sets a timeline in a panel, the highlighted milestone in the mark, and on two lanes the lanes' names in the title bar so a date is only ever a date. Board: [design/compositions/lanes](../design/compositions/lanes/README.md).
- `rail` stands a column of figure panels beside any panel chart, on the side the author wrote it, each figure at the largest size its panel holds with its arrow after it. Board: [design/compositions/rail](../design/compositions/rail/README.md).
- `figures` sets a row of figure panels, a figure written with its sign in its direction's colour, and under the row a lead panel of one figure and its paragraph, or a note. Board: [design/compositions/figures](../design/compositions/figures/README.md).

The shared pieces of the panel forms are in [panel.tsx](../src/layouts/compositions/panel.tsx): `paintPanel` and `fitPanelBar` for the panel and its title bar, `panelInks` for the inks, `fitFigurePanel` and `paintFigurePanel` for a figure panel, and `fitNotePanel` and `paintNotePanel` for a note panel that names itself by the label before a colon.

The tests draw every panel form on ledger and on bulletin, ember and crayon ([panel.test.tsx](../src/layouts/compositions/panel.test.tsx), [tiles.test.tsx](../src/layouts/compositions/tiles.test.tsx)). The gallery's 构图 band has ledger pages for `tiles` and `shifts`.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `panel-sheet` | the ordinary content page: the claim in a serif across the full measure, the body handed to the compositions in the panel setting, the source at 13px | [content-panel-sheet.tsx](../src/layouts/content-panel-sheet.tsx), [panel-shared.tsx](../src/layouts/panel-shared.tsx) | ledger (points, list, comparison, process, data, hierarchy) | [design/faces/panel-sheet](../design/faces/panel-sheet/README.md) |
| `panel-figure` | one figure at 200px with its unit and note, and a panel beside it of two or three bars and the move between them, or of more figures | [content-panel-figure.tsx](../src/layouts/content-panel-figure.tsx) | ledger (fact) | [design/faces/panel-figure](../design/faces/panel-figure/README.md) |
| `image-split` | a `column` parameter: `panel` lays the photograph down the left from under the status bar, the claim and a ledger of figures beside it, and the caption over the source | [image-panel-split.tsx](../src/layouts/image-panel-split.tsx), [image-pages.tsx](../src/render/image-pages.tsx) | ledger (`panel`) | [design/faces/image-split](../design/faces/image-split/README.md) |
| `stat-cover` | redrawn: an amber `kicker`, the title in a serif on one line where it fits, the subtitle, and a ticker of the first `kpi_cards` under a hairline | [cover-stat-cover.tsx](../src/layouts/cover-stat-cover.tsx) | ledger | [design/faces/stat-cover](../design/faces/stat-cover/README.md) |
| `close-word-ending` | redrawn: an amber `kicker`, the decision in a serif, a hairline, a lead-in, two to four panels of label and gloss from the first `bullets`, and the page's `footnote` | [ending-close-word-ending.tsx](../src/layouts/ending-close-word-ending.tsx) | ledger | [design/faces/close-word-ending](../design/faces/close-word-ending/README.md) |

### Motif

| motif | what it draws | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `poster-motif` | redrawn: a 32px status bar across the top of every page, the organization after an amber dot on the left and the date on the right. The wavy line along the foot is gone | [motif-poster-motif.tsx](../src/motifs/motif-poster-motif.tsx) | ledger | [design/motifs/poster-motif](../design/motifs/poster-motif/README.md) |

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `slide.kicker` | a short label over the heading, such as the occasion on a cover or what an ending asks for. A spec writes it on the page. Only a face that declares a place for it (`LayoutDefinition.pageFields`) draws it, and validate refuses it on any other, naming the face | [ir/index.ts](../src/ir/index.ts), [validate-core.ts](../src/validate-core.ts) (`checkKickerDrawn`), [spec/assemble.ts](../src/spec/assemble.ts) | [design/faces/stat-cover](../design/faces/stat-cover/README.md) |
| `LayoutDefinition.pageFields` | a face declares the page fields it draws beyond heading, subheading and components: `kicker`, and on a boundary face `footnote`, so an ending can carry a disclaimer | [registry.ts](../src/layouts/registry.ts), [validate-core.ts](../src/validate-core.ts) (`checkBoundaryPageContent`) | [design/faces/close-word-ending](../design/faces/close-word-ending/README.md) |
| `title` on `data_table`, `comparison` and `timeline` | the name a report gives a table or a timeline. It prints over the block in bold, and in the panel setting in the panel's title bar | [block-title.tsx](../src/components/block-title.tsx), [data-table.ts](../src/ir/components/data-table.ts), [comparison.ts](../src/ir/components/comparison.ts), [timeline.ts](../src/ir/components/timeline.ts) | [design/compositions/records](../design/compositions/records/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| One figure style per deck | every chart in a deck prints its figures one way. The language comes from the deck's headings, and a Chinese deck groups four-digit figures when its author writes one grouped anywhere in the deck (GB/T 15835-2011 §5.1.1 allows either). Five digits and more are always grouped | [figure-style.ts](../src/lib/figure-style.ts) (`deckFigureStyle`), [quantity-format.ts](../src/lib/quantity-format.ts) | [design/components/chart](../design/components/chart/README.md) |
| A dumbbell names its axes | the rows' title and the values' title and unit print as one line under the rows, as a horizontal bar chart does | [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| A marked combo line prints its ends | when the values between would land on taller bars, the line still prints its first and last values | [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| A delta arrow follows its figure | a headline card's arrow follows its figure and unit on one line, and the figure is fitted to the room it leaves, where the arrow used to sit in the corner over a long figure | [kpi.tsx](../src/components/kpi.tsx) | [design/components/kpi_cards](../design/components/kpi_cards/README.md) |
| A hub and spoke too narrow declines | a hub and spoke set in a box too narrow for its words declines instead of cutting its labels, so the page steps aside or declares the drop | [hub-spoke.tsx](../src/components/hub-spoke.tsx) | none |
| A photo's caption has a place on a panel page | `image-split`'s panel column sets the caption over the source, so a captioned photograph keeps its column instead of falling back to a sheet that cannot hold the rest | [image-panel-split.tsx](../src/layouts/image-panel-split.tsx) | [design/faces/image-split](../design/faces/image-split/README.md) |

## vermilion government work report sample, 2026-10

The round redrew vermilion to a fifteen-page Chinese and English briefing on China's 2026 Government Work Report and the 15th Five-Year Plan, what has landed this year, and what it means for a manufacturer. Its decisions, the design system every vermilion page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-04-vermilion/`](../design/rounds/2026-10-04-vermilion/README.md). The rules are restated for the next design session in [Designing for vermilion](./design-vermilion.md).

### Compositions

The compositions take a fifth `setting`, `seal` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx), the numbered square, the inks, the tag and the type sizes in [seal.tsx](../src/layouts/compositions/seal.tsx), the deck's numerals in [numerals.ts](../src/layouts/compositions/numerals.ts)): a formal report on paper. Items are numbered in the deck's own numerals (一、二、三 in a Chinese deck, 1, 2, 3 in an English one) in small squares of the emphasis colour, tables are open under a 2px rule of it, the mark is spent once a page, and the accent only draws. Each composition's seal form lives in its own file beside the composition (`rows-seal.tsx`, `tiles-seal.tsx`, `table-seal.tsx`, `lanes-seal.tsx`, `rail-seal.tsx`, and `plot-seal.tsx` for `columns` and `trend`), and the composition hands the page to it when the face asks for the seal setting.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `roster` | six to ten short items in two columns of numbered cells, the marked one reversed out of the mark, an optional note under them | one `numbered_cards` of titles only, then optionally a `callout`. The seal setting only | [roster.tsx](../src/layouts/compositions/roster.tsx) | vermilion | [design/compositions/roster](../design/compositions/roster/README.md) |
| `scores` | a scorecard as an open table, each verdict a tag at the right edge, a goal off track on the mark's tint | one `scorecard` of up to six rows. The seal setting only | [scores.tsx](../src/layouts/compositions/scores.tsx) | vermilion | [design/compositions/scores](../design/compositions/scores/README.md) |
| `targets` | a plan's statement reversed out of the mark beside an open table of its targets, each with an arrow in the accent and a tag | an `insight_panel` of one row, then a `from_to` with no `kicker`, `span` or `change`. The seal setting only | [targets.tsx](../src/layouts/compositions/targets.tsx) | vermilion | [design/compositions/targets](../design/compositions/targets/README.md) |
| `trend` | one series as a line over its value axis, a marked value range tinted behind it, every point printing its value | one `line` chart of one series and at most one band. The seal setting only, and `rail` sets it beside figures | [trend.tsx](../src/layouts/compositions/trend.tsx), [plot-seal.tsx](../src/layouts/compositions/plot-seal.tsx) | vermilion | [design/compositions/trend](../design/compositions/trend/README.md) |
| `rings` | completion rates as large rings in a row, the amounts and the source under each | one `progress_donuts` of up to five items without icons. The seal setting only | [rings.tsx](../src/layouts/compositions/rings.tsx) | vermilion | [design/compositions/rings](../design/compositions/rings/README.md) |

Settled compositions that grew a seal form:

- `rows` sets two to five numbered cards, or "label: gloss" bullets, as numbered rows on hairlines, the marked one reversed out of the mark with its square white, a note panel under them. Board: [design/compositions/rows](../design/compositions/rows/README.md).
- `tiles` sets two, four or six numbered cards as panels two by two under a bar in the accent, the marked one's bar and title in the mark. Board: [design/compositions/tiles](../design/compositions/tiles/README.md).
- `table` sets a comparison as an open table read toward one column, each row's tag at the right edge under `tag_column`, the marked row on the mark's tint. Board: [design/compositions/table](../design/compositions/table/README.md).
- `rail` stands a column of up to three figures beside an upright chart past a hairline, the plot grouped columns, a trend or any other chart. Board: [design/compositions/rail](../design/compositions/rail/README.md).
- `columns` sets one to three series as grouped columns with every value printed, values below zero hanging under the zero line, the marked bar's series and category in the mark and the rest in the chart palette after its lead. Board: [design/compositions/columns](../design/compositions/columns/README.md).
- `lanes` sets a timeline on one axis, the first lane's cards above it and the second's below it, each lane named in the mark, the highlighted milestone in the mark, a note panel under them. Board: [design/compositions/lanes](../design/compositions/lanes/README.md).

The shared pieces of the seal forms are in [seal.tsx](../src/layouts/compositions/seal.tsx): `sealInks` for the inks, `paintNumeral` for a numbered square, `sealTagSpec` and `sealTagInks` for a tag, and `SEAL_SPEC` for the small type's exemption, and in [note-seal.tsx](../src/layouts/compositions/note-seal.tsx): `fitSealNote` and `paintSealNote` for a note panel.

The tests draw every seal form on vermilion and on bulletin, ember and crayon ([seal.test.tsx](../src/layouts/compositions/seal.test.tsx)). The gallery's 构图 band has vermilion pages for `roster`, `scores`, `targets`, `trend`, `rings`, `table` and `lanes`.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `seal-sheet` | the ordinary content page: the claim centred and bold in the brand colour over a short accent bar, the body handed to the compositions in the seal setting, the source at 14px. Its `cards` parameter sets numbered cards as rows or as panels | [content-seal-sheet.tsx](../src/layouts/content-seal-sheet.tsx), [seal-shared.tsx](../src/layouts/seal-shared.tsx) | vermilion (points, list with `cards: "tiles"`, comparison, process, data, evidence, hierarchy) | [design/faces/seal-sheet](../design/faces/seal-sheet/README.md) |
| `seal-figure` | one figure at 240px in the brand colour with its tag and note, and up to three supporting figures past a hairline | [content-seal-figure.tsx](../src/layouts/content-seal-figure.tsx) | vermilion (fact) | [design/faces/seal-figure](../design/faces/seal-figure/README.md) |
| `image-split` | a `column` parameter: `seal` lays the photograph down one side edge to edge, and beside it the gold rule, the claim and a column of figures over the source | [image-seal-split.tsx](../src/layouts/image-seal-split.tsx), [image-pages.tsx](../src/render/image-pages.tsx) | vermilion (`seal`) | [design/faces/image-split](../design/faces/image-split/README.md) |
| `red-head-cover` | redrawn: the issuing body red and bold at 52px with its Chinese characters spaced, a thick and a thin red rule, the title centred and evened over two lines | [cover-red-head-cover.tsx](../src/layouts/cover-red-head-cover.tsx) | vermilion | [design/faces/red-head-cover](../design/faces/red-head-cover/README.md) |
| `deliberation-ending` | redrawn: the ask in a small line, the decision at 52px in the brand colour, an accent bar, and two to four numbered cards of label and gloss from the first `bullets` | [ending-deliberation-ending.tsx](../src/layouts/ending-deliberation-ending.tsx) | vermilion | [design/faces/deliberation-ending](../design/faces/deliberation-ending/README.md) |

### Motif

| motif | what it draws | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `vermilion-motif` | redrawn: a gold double rule, 2px and 1px, from x64 to x1216, along the head of content pages, the foot of the cover and both on the ending | [motif-vermilion-motif.tsx](../src/motifs/motif-vermilion-motif.tsx) | vermilion | [design/motifs/vermilion-motif](../design/motifs/vermilion-motif/README.md) |

### Component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `tag` on `comparison` and `from_to` rows, `tag_column` on `comparison` | a few words after a row's values saying what happened to it, outlined in the accent, in grey when `quiet`, filled on the marked row, under a header | [tag.tsx](../src/components/tag.tsx), [comparison.ts](../src/ir/components/comparison.ts), [from-to.ts](../src/ir/components/from-to.ts) | [design/components/comparison](../design/components/comparison/README.md), [design/components/from_to](../design/components/from_to/README.md) |
| `emphasis` on `comparison` and `from_to` rows | marks the one row the page is about: a pale tint of the emphasis colour and its tag filled | [comparison.tsx](../src/components/comparison.tsx), [from-to.tsx](../src/components/from-to.tsx) | [design/components/comparison](../design/components/comparison/README.md) |
| `label_column` on `from_to` | the header over the measures' names | [from-to.ts](../src/ir/components/from-to.ts), [from-to.tsx](../src/components/from-to.tsx) | [design/components/from_to](../design/components/from_to/README.md) |
| `tag` on a `kpi_cards` item | a few words saying what a figure is, such as "Binding" | [kpi-cards.ts](../src/ir/components/kpi-cards.ts), [kpi.tsx](../src/components/kpi.tsx) | [design/components/kpi_cards](../design/components/kpi_cards/README.md) |
| `bands` on `chart` | a value range tinted across a line, area or upright bar plot with its label, up to two | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `detail` and `emphasis` on `progress_donuts` items | the amounts behind a rate, and the one rate the page is about | [progress-donuts.ts](../src/ir/components/progress-donuts.ts), [progress-donuts.tsx](../src/components/progress-donuts.tsx) | [design/components/progress_donuts](../design/components/progress_donuts/README.md) |
| `numbered_cards` up to ten items | past eight, the ordinary cards stand in two columns | [numbered-cards.ts](../src/ir/components/numbered-cards.ts), [numbered-cards.tsx](../src/components/numbered-cards.tsx) | [design/components/numbered_cards](../design/components/numbered_cards/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| Item numbers in the deck's numerals | a seal composition numbers items 一 to 九十九 in a Chinese deck and 1, 2, 3 in any other, from the deck's headings | [numerals.ts](../src/layouts/compositions/numerals.ts) | [design/compositions/rows](../design/compositions/rows/README.md) |
| Written decimals | a chart prints a whole value with the decimals its neighbours carry (「5.0」 beside 「5.4」), where JSON had dropped the zero | [quantity-format.ts](../src/lib/quantity-format.ts), [plot.tsx](../src/layouts/compositions/plot.tsx), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| A percent axis of shares ends at 100% | a percent chart with every value between 0 and 100 ends its axis at 100%, where the headroom used to reach 150% | [cartesian-axis.tsx](../src/components/cartesian-axis.tsx) | [design/components/chart](../design/components/chart/README.md) |
| Spacing written as character spacing | a `<tspan dx>` between glyphs is exported as character spacing on the glyph before it, so a spaced letterhead or a tight display figure prints as the preview draws it | [svg2pptx/text.ts](../src/pptx/svg2pptx/text.ts) | [design/faces/red-head-cover](../design/faces/red-head-cover/README.md) |
| A source line the body runs over is reported | the audit reports a block that runs over the page's source line | [deck-audit.ts](../src/audit/deck-audit.ts), [source-line.ts](../src/audit/source-line.ts) | none |
| A squeezed last line keeps its spaces | when a fit joins a text's last lines, the space between words is kept, and a paragraph break beside Chinese joins with none | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) | none |
| A scorecard measures its columns | the ordinary scorecard sizes its columns from the words, where it used to drop the card | [scorecard.tsx](../src/components/scorecard.tsx) | none |
| A statement keeps its quote's source | the statement face sets a quote and its source where a theme's skin has one line, instead of dropping the quote | [content-statement.tsx](../src/layouts/content-statement.tsx) | none |
