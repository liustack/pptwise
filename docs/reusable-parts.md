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
| `track` | a timeline on one rule across the page, a dot per milestone, the marked one larger in the accent, then a closing block | one horizontal `timeline` of two to six milestones on no lanes, optionally followed by an `info` or `tip` `callout` | [track.tsx](../src/layouts/compositions/track.tsx) | brief | [design/compositions/track](../design/compositions/track/README.md) |
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
| `image-split` | a `column` parameter: `report` sets a 600px photograph, a 40px regular title, a 48 by 6 bar and the facts as `pairs`. Every other theme keeps `standard` | [image-pages.tsx](../src/render/image-pages.tsx) (`SPLIT_COLUMNS`) | brief (`report`), bulletin (`notice`), ember, journal, luxe, museum | [design/faces/image-split](../design/faces/image-split/README.md) |

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

## terminal cloud outage review sample, 2026-10

The round redrew terminal to a sixteen-page Chinese and English technical review of thirteen cloud outages from June 2025 to September 2026, read from the providers' own postmortems and status pages, ending in what the infrastructure team builds first. Its decisions, the design system every terminal page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-05-terminal/`](../design/rounds/2026-10-05-terminal/README.md). The rules are restated for the next design session in [Designing for terminal](./design-terminal.md).

### Compositions

The compositions take a sixth `setting`, `console` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): an incident console. Evidence sits in square panels, a finding's card carries HUD brackets, every figure, time, tag, label and source is mono, the mark is spent once a page on its dark tint, and the danger, warning and success inks say what kind of news a line is. Each settled composition's console form lives in its own file beside it (`rail-console.tsx`, `records-console.tsx`, `table-console.tsx`, `waves-console.tsx`, `contents-console.tsx`), and the composition hands the page to it when the face asks for the console setting.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `cards` | verdict cards two across (icon box, number, title, text), or HUD cards three across with brackets and a mono tag, the marked card on the mark's tint, a closing callout in the next cell or a closing verdict as a banner | a `row_cards` or `numbered_cards` of three to six, optionally then a `verdict_banner` or `callout`, or an `icon_cards` of two to six, optionally then a `callout`. The console setting only | [cards.tsx](../src/layouts/compositions/cards.tsx) | terminal | [design/compositions/cards](../design/compositions/cards/README.md) |
| `listing` | a code block as a terminal window: a title bar, numbered lines in mono, comments muted, quoted lines in the mark, marked lines bold in the warning ink | one `code`, alone. The console setting only | [listing.tsx](../src/layouts/compositions/listing.tsx) | terminal | [design/compositions/listing](../design/compositions/listing/README.md) |
| `log` | a timeline as an incident log in a panel, a dot in each milestone's tone, and up to three components in a column beside it | a `timeline` of two to seven milestones on no lanes, then up to three components another composition takes. The console setting only | [log.tsx](../src/layouts/compositions/log.tsx) | terminal | [design/compositions/log](../design/compositions/log/README.md) |
| `span` | two or three lengths of time to scale, the marked one solid in the mark, a toned one outlined with the marked length echoed inside, a note panel or two | a `kpi_cards` of durations written as a console prints them ("2h52m"), then up to two callouts. The console setting only | [span.tsx](../src/layouts/compositions/span.tsx) | terminal | [design/compositions/span](../design/compositions/span/README.md) |
| `plates` | photographs in a row, each over its mono caption, its figure in bold mono and its label, a banner under them | an `image_grid` of two to four, then a `kpi_cards` of as many plain figures, then optionally a `callout`. The console setting only | [plates.tsx](../src/layouts/compositions/plates.tsx) | terminal | [design/compositions/plates](../design/compositions/plates/README.md) |
| `paths` | an issue tree as failure points beside the path each one needs, under ✕ and ✓ headers, the marked branch's fix on the mark's tint | one `issue_tree` with a `children_column`, two to five branches of one or two sub-points. The console setting only | [paths.tsx](../src/layouts/compositions/paths.tsx) | terminal | [design/compositions/paths](../design/compositions/paths/README.md) |
| `screen` | a browser window with its address beside log lines, each line's icon and name in its tone, the highlighted one on the mark's tint | a `device_mockup` browser, then a `row_cards` of three to five with no `sub`. The console setting only | [screen.tsx](../src/layouts/compositions/screen.tsx) | terminal | [design/compositions/screen](../design/compositions/screen/README.md) |

Settled compositions that grew a console form:

- `rail` sets a horizontal bar chart in a panel with its legend on top and a mono note under each category name, beside one to three figure panels, the marked one larger on the mark's tint. Board: [design/compositions/rail](../design/compositions/rail/README.md).
- `records` sets a data table in a panel: a table of figures in mono in tall rows, any other table with ✓, ✕ and — cells as icons in their inks, figure panels beside it. Board: [design/compositions/records](../design/compositions/records/README.md).
- `table` sets a comparison's options as cards T1 to Tn, a rating row as a meter, a measure row in bold mono, the recommended card selected. Board: [design/compositions/table](../design/compositions/table/README.md).
- `waves` sets a roadmap as phases along one line, each a card of label and value rows, the marked phase on the mark's tint, a warning banner under them. Board: [design/compositions/waves](../design/compositions/waves/README.md).
- `contents` lists a chapter's pages as a directory, 「├─ 04」 in mono. Board: [design/compositions/contents](../design/compositions/contents/README.md).

The shared pieces of the console forms are in [console.tsx](../src/layouts/compositions/console.tsx): `consoleInks` for the inks, `paintPanel`, `paintCard` and `paintBrackets` for panels and HUD cards, `monoWidth`, `fitMono` and `paintMono` for mono text measured at the widest mono advance, `paintConsoleTag` for a tag, `paintMeter` for a rating, `fitNotePanel` and `paintNotePanel` for a note, `fitBanner` and `paintBanner` for a closing banner, and `CONSOLE_SPEC` for the small type's exemption. The crumb is in [crumb.tsx](../src/layouts/compositions/crumb.tsx) (`crumbFor`, `paintCrumb`) and the checklist in [checklist.tsx](../src/layouts/compositions/checklist.tsx) (`drawChecklist`): any face can call them.

The tests draw every console form on terminal and on vermilion and crayon ([console.test.tsx](../src/layouts/compositions/console.test.tsx), [console-compositions.test.tsx](../src/layouts/compositions/console-compositions.test.tsx)). The gallery's 构图 band has terminal pages for every new composition and for the console forms of `rail`, `records`, `table` and `waves`.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `console-sheet` | the ordinary content page: the crumb, the claim across the full measure over a hairline with a segment of the mark, the body handed to the compositions in the console setting, the source in 12px mono | [content-console-sheet.tsx](../src/layouts/content-console-sheet.tsx), [console-shared.tsx](../src/layouts/console-shared.tsx) | terminal (points, list, comparison, process, data, photo, evidence, hierarchy) | [design/faces/console-sheet](../design/faces/console-sheet/README.md) |
| `console-cover` | a full-bleed photograph darkened from the left, the crumb, the title at 60px, a bar, the subtitle and a mono `kicker` | [cover-console-cover.tsx](../src/layouts/cover-console-cover.tsx), [console-photo.tsx](../src/layouts/console-photo.tsx) | terminal | [design/faces/console-cover](../design/faces/console-cover/README.md) |
| `console-chapter` | the photograph darkened as on the cover, the chapter number at 110px mono, the title, and the chapter's pages as a directory | [chapter-console-chapter.tsx](../src/layouts/chapter-console-chapter.tsx) | terminal | [design/faces/console-chapter](../design/faces/console-chapter/README.md) |
| `console-ending` | the decision at 48px with its marked run, and up to four items from the first `timeline` or `bullets` as a checklist of 「[ ]」 boxes | [ending-console-ending.tsx](../src/layouts/ending-console-ending.tsx) | terminal | [design/faces/console-ending](../design/faces/console-ending/README.md) |

### Component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `icon` and `tone` on `timeline` milestones | a symbol in a ring on the node, and the node in the danger, warning or success ink | [timeline.ts](../src/ir/components/timeline.ts), [timeline.tsx](../src/components/timeline.tsx) | [design/components/timeline](../design/components/timeline/README.md) |
| `tone` on `kpi_cards` and `row_cards` items | the figure's or card's icon and label in the tone's ink | [shared.ts](../src/ir/components/shared.ts) (`ToneSchema`), [kpi.tsx](../src/components/kpi.tsx), [row-cards.tsx](../src/components/row-cards.tsx) | [design/components/kpi_cards](../design/components/kpi_cards/README.md), [design/components/row_cards](../design/components/row_cards/README.md) |
| `icon` on `roadmap` items | a symbol where the phase's number stood | [roadmap.ts](../src/ir/components/roadmap.ts), [roadmap.tsx](../src/components/roadmap.tsx) | [design/components/roadmap](../design/components/roadmap/README.md) |
| `icon` on `issue_tree` branches, `children_column` | a symbol before a branch's label, and the name of the sub-points' column | [issue-tree.ts](../src/ir/components/issue-tree.ts), [issue-tree.tsx](../src/components/issue-tree.tsx) | [design/components/issue_tree](../design/components/issue_tree/README.md) |
| `icon` on `data_table` rows | a symbol before a row's first cell | [data-table.ts](../src/ir/components/data-table.ts), [data-table.tsx](../src/components/data-table.tsx) | [design/components/data_table](../design/components/data_table/README.md) |
| `icon` on `image_grid` items | a symbol before a caption | [image-grid.ts](../src/ir/components/image-grid.ts), [image-grid.tsx](../src/components/image-grid.tsx) | [design/components/image_grid](../design/components/image_grid/README.md) |
| `tag` on `icon_cards` items | a few words under a card's icon, such as the incident behind it | [icon-cards.ts](../src/ir/components/icon-cards.ts), [icon-cards.tsx](../src/components/icon-cards.tsx) | [design/components/icon_cards](../design/components/icon_cards/README.md) |
| `title` and `highlight_lines` on `code` | a title bar naming the block, and the lines the page is about bold in the warning ink | [code.ts](../src/ir/components/code.ts), [code.tsx](../src/components/code.tsx) | [design/components/code](../design/components/code/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A face that draws its own photograph | a cover or chapter face with `drawsPhoto` keeps its page when the slide has a background photograph, and the engine lays no darkening of its own, so the face's kicker and components still draw | [registry.ts](../src/layouts/registry.ts), [layout-selection.ts](../src/render/layout-selection.ts), [full-slide-svg.tsx](../src/render/full-slide-svg.tsx) | [design/faces/console-cover](../design/faces/console-cover/README.md) |
| Tables span both columns | a `comparison` or `data_table` beside another component takes the full width, where it used to be split into half a page | [comparison.ts](../src/ir/components/comparison.ts), [data-table.ts](../src/ir/components/data-table.ts) | none |
| A milestone's lane on its own line | the ordinary timeline names a lane over the date, where it used to lead the date and cut it short | [timeline.tsx](../src/components/timeline.tsx) | [design/components/timeline](../design/components/timeline/README.md) |
| A no-break space holds | two words joined by a no-break space stay on one line in every wrap | [svg-text-layout.ts](../src/lib/svg-text-layout.ts) | none |
| A multiplication sign is part of the figure | a kpi unit "×" or "x" is glued to the figure at its size, "199×" | [quantity-format.ts](../src/lib/quantity-format.ts), [kpi.tsx](../src/components/kpi.tsx) (`kpiFigure`) | [design/components/kpi_cards](../design/components/kpi_cards/README.md) |
| Architecture inks read on their band | the layer names, items and numbers are checked against the band they sit on | [architecture.tsx](../src/components/architecture.tsx) | none |

## memo four-day week decision sample, 2026-10

The round redrew memo to a sixteen-page Chinese and English decision memo from management and human resources to all staff: a six-month trial of a 32-hour week at full pay from January 2027, the evidence behind it from four countries' pilots, the arithmetic it needs, the rota, the calendar, the stop conditions and who does what. Its decisions, the design system every memo page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-05-memo/`](../design/rounds/2026-10-05-memo/README.md). The rules are restated for the next design session in [Designing for memo](./design-memo.md).

### Compositions

The compositions take a seventh `setting`, `memo` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a typed memorandum. Tables are open on hairlines under a 2px rule of ink, figures, dates, labels and sources are typed in mono, figures the page argues from are large in the heading face, photographs are pasted in as numbered exhibits, and the red is spent once a page. The memo forms of the settled compositions live beside them (`rows-memo.tsx`, `records-memo.tsx`).

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `annex` | the page's body beside a column holding a pasted-in photograph, and under it a remark in the mark, evidence rows with icons, or a panel of two or three figures | one or more components, then an `image`, then optionally a `callout` with no icon or a `kpi_cards`. The memo setting only | [annex.tsx](../src/layouts/compositions/annex.tsx) | memo | [design/compositions/annex](../design/compositions/annex/README.md) |
| `tallies` | reasons as rows: an icon, a name, the figure large in the mark, the sentence behind it | a `kpi_cards` of two to four, each with an icon, a label and a note. The memo setting only | [tallies.tsx](../src/layouts/compositions/tallies.tsx) | memo | [design/compositions/tallies](../design/compositions/tallies/README.md) |
| `slopes` | slope charts side by side on one scale, the marked group a solid red line, a note panel beside them | two to four `line` charts of the same two categories and series, then optionally a `callout`. The memo setting only | [slopes.tsx](../src/layouts/compositions/slopes.tsx) | memo | [design/compositions/slopes](../design/compositions/slopes/README.md) |
| `diverging` | bars that run left (better) and right (worse) from the middle, every share printed, a figure column beside them | a `percent_stacked` chart whose series carry `tone`, then optionally a `kpi_cards` of one. The memo setting only | [diverging.tsx](../src/layouts/compositions/diverging.tsx) | memo | [design/compositions/diverging](../design/compositions/diverging/README.md) |
| `citation` | a quoted original typed in mono, who said it, and what it means in the heading face, a figures panel beside it | a `blockquote`, then optionally a meaning callout, a `kpi_cards` of two or three and a panel note. The memo setting only | [citation.tsx](../src/layouts/compositions/citation.tsx) | memo | [design/compositions/citation](../design/compositions/citation/README.md) |
| `scales` | the case for and against in two columns, the verdict in a banner of ink | one `pros_cons`. The memo setting only | [scales.tsx](../src/layouts/compositions/scales.tsx) | memo | [design/compositions/scales](../design/compositions/scales/README.md) |
| `catalog` | options each under its photograph, the comparison's rows down each column, the pick tagged | an `image_grid` of two to four, then a `comparison` with as many options. The memo setting only | [catalog.tsx](../src/layouts/compositions/catalog.tsx) | memo | [design/compositions/catalog](../design/compositions/catalog/README.md) |
| `rota` | who is in on which day as blocks of ink, the days off marked, the count each day | a `data_table` of names and day columns whose cells are blank or one word. The memo setting only | [rota.tsx](../src/layouts/compositions/rota.tsx) | memo | [design/compositions/rota](../design/compositions/rota/README.md) |
| `sum` | a sum worked on ruled paper, the answer large in the red, a note beside the pad | a `bullets` written "Label: working", a `kpi_cards` of one, then optionally a `callout`. The memo setting only | [sum.tsx](../src/layouts/compositions/sum.tsx) | memo | [design/compositions/sum](../design/compositions/sum/README.md) |
| `schedule` | a calendar of months with the stretches as bars, the marked one in red, over a typed table of dates | a `gantt` on whole units of its `axis_labels`, then optionally a `timeline`. The memo setting only | [schedule.tsx](../src/layouts/compositions/schedule.tsx) | memo | [design/compositions/schedule](../design/compositions/schedule/README.md) |
| `checks` | stop conditions as a checklist with a box to tick, the kind, the measure and the threshold after 「IF」, and a red banner | a `row_cards` of three to six with a text each, then optionally a `callout`. The memo setting only | [checks.tsx](../src/layouts/compositions/checks.tsx) | memo | [design/compositions/checks](../design/compositions/checks/README.md) |

Settled compositions that grew a memo form:

- `rows` sets numbered clauses with large red numerals in the deck's numerals, across the body in three columns or under one another beside an exhibit. Board: [design/compositions/rows](../design/compositions/rows/README.md).
- `records` sets a table of figures with source tags, one line a cell, or a table of duties with icons, up to two lines a cell. Board: [design/compositions/records](../design/compositions/records/README.md).

The shared pieces are in [memo.tsx](../src/layouts/compositions/memo.tsx): `memoInks` for the inks, `memoBaseline` for where each face's baseline sits in its line box, `fitMemo`, `paintMemo` and `paintMemoLine` for text at its exact size, `paintTracked` for spaced capitals, `paintMemoTag` for a tag, `memoNumeral` for clause numbers, `fitMemoTitle` for a title on the full measure, and `MEMO_SPEC` for the small type's exemption. The exhibit is in [exhibit.tsx](../src/layouts/compositions/exhibit.tsx) (`exhibitCaptionLayout`, `paintExhibit`), the stamp in [stamp.tsx](../src/layouts/compositions/stamp.tsx) (`fitStamp`, `paintStamp`) and the margin label in [margin.tsx](../src/layouts/compositions/margin.tsx) (`paintMargin`): any face can call them.

The tests draw every memo page on memo and on terminal and crayon ([memo.test.tsx](../src/layouts/compositions/memo.test.tsx), [memo-pages.test.tsx](../src/layouts/compositions/memo-pages.test.tsx)). The gallery's 构图 band has memo pages for every new composition and for the memo forms of `rows` and `records`.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `memo-sheet` | the ordinary content page: the `kicker` in the margin, the claim in a serif over a rule of ink, the body handed to the compositions in the memo setting, the source in 12px muted type, exhibits numbered across the deck | [content-memo-sheet.tsx](../src/layouts/content-memo-sheet.tsx), [memo-shared.tsx](../src/layouts/memo-shared.tsx) | memo (every content kind but statement) | [design/faces/memo-sheet](../design/faces/memo-sheet/README.md) |
| `memo-cover` | MEMORANDUM over a red double rule, the header lines from `fields`, the title at 60px, a red bar and the subtitle, the photograph as exhibit 1, the `stamp` | [cover-memo-cover.tsx](../src/layouts/cover-memo-cover.tsx) | memo | [design/faces/memo-cover](../design/faces/memo-cover/README.md) |
| `memo-ending` | the `kicker` in the margin, the decision at 40px, up to three numbered clauses from `bullets`, the sign-off lines from `fields`, the `stamp` | [ending-memo-ending.tsx](../src/layouts/ending-memo-ending.tsx) | memo | [design/faces/memo-ending](../design/faces/memo-ending/README.md) |

### Motif

`memo-motif` is redrawn: MEMORANDUM over a red double rule on every page but the cover, and on content pages, when the deck asks for a footer, the subject at the top right and a typed folio (「第 N 页 共 M 页」) at the foot. It paints the footer row itself. Board: [design/motifs/memo-motif](../design/motifs/memo-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `fields` and `stamp` on a slide | header lines (label, value, note) and a stamp (words and a date) a face draws; refused on a face that has no place for them | [index.ts](../src/ir/index.ts), [validate-core.ts](../src/validate-core.ts) | [design/faces/memo-cover](../design/faces/memo-cover/README.md), [design/faces/memo-ending](../design/faces/memo-ending/README.md) |
| `tag` on `data_table` rows | a few words leading the row's last cell as an outlined tag, the kind of source | [data-table.ts](../src/ir/components/data-table.ts), [data-table.tsx](../src/components/data-table.tsx) | [design/components/data_table](../design/components/data_table/README.md) |
| `recommended_label` on `comparison` | who the recommended option is for, as a filled tag after its name | [comparison.ts](../src/ir/components/comparison.ts) | [design/components/comparison](../design/components/comparison/README.md) |
| `tone` on chart series | a series in the success, danger or warning ink, so its colour says what kind of news it is | [chart.ts](../src/ir/components/chart.ts), [chart.tsx](../src/components/chart.tsx) | [design/components/chart](../design/components/chart/README.md) |
| a marked point on `stacked` and `percent_stacked` charts | the column the page is about at full strength, the others receding | [chart.ts](../src/ir/components/chart.ts), [chart.tsx](../src/components/chart.tsx) | [design/components/chart](../design/components/chart/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| Turned shapes export turned | a picture or shape inside a rotated group is written with its own rotation round the group's centre, so a turned print stays a picture, cropped and editable | [dispatch.ts](../src/pptx/svg2pptx/dispatch.ts) | [design/faces/memo-cover](../design/faces/memo-cover/README.md) |
| A serif heading pairs a Latin face | a heading stack of Times New Roman over SimSun writes the pair to PowerPoint, Latin and figures in Times New Roman, Chinese in SimSun, and the preview measures Times New Roman exactly | [fonts.ts](../src/render/fonts.ts), [pptx-ea-fonts.ts](../src/pptx/pptx-ea-fonts.ts), [svg-text-layout.ts](../src/lib/svg-text-layout.ts) | none |
| A cut row card description is reported | a `row_cards` description past its two lines is marked cut, so the audit reports it | [row-cards.tsx](../src/components/row-cards.tsx) | none |

## clinic GLP-1 formulary review sample, 2026-10

The round redrew clinic to an eighteen-page Chinese and English submission from a hospital pharmacy department to its pharmacy and therapeutics committee: which GLP-1 weight-loss drugs to list, who may prescribe them and under which rules, with the evidence behind each answer, ending on the three items the committee votes on. Its decisions, the design system every clinic page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-05-clinic/`](../design/rounds/2026-10-05-clinic/README.md). The rules are restated for the next design session in [Designing for clinic](./design-clinic.md).

### Compositions

The compositions take an eighth `setting`, `dossier` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a clinical assessment file. Figures sit on rounded white cards over hairlines, every source is named in a small capsule outlined in its kind's ink, the result a page argues from is in the mark and what it is read against is drawn in outline, the accent draws lines and dots only, and risks and costs take the warning ink. The dossier forms of the settled compositions live beside them (`rows-dossier.tsx`, `table-dossier.tsx`, `lanes-dossier.tsx`, `cards-dossier.tsx`).

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `readings` | figures on cards, each with its source capsule, the marked one in the mark, over a share bar with the marked parts' total | a `kpi_cards` of two to four with icons, then optionally a share bar. The dossier setting only | [readings.tsx](../src/layouts/compositions/readings.tsx) | clinic | [design/compositions/readings](../design/compositions/readings/README.md) |
| `inset` | a 400px photograph at the left or right of the band with its caption, the rest of the page beside it drawn by the other compositions | an `image` first or last and one or more components. The dossier setting only | [inset.tsx](../src/layouts/compositions/inset.tsx) | clinic | [design/compositions/inset](../design/compositions/inset/README.md) |
| `docket` | cases on file, one a row: who reported it and when, what happened, the figure it turns on, bad news in the danger ink | a `kpi_cards` of two to five, each with an icon and a source. The dossier setting only | [docket.tsx](../src/layouts/compositions/docket.tsx) | clinic | [design/compositions/docket](../design/compositions/docket/README.md) |
| `controlled` | each trial's drug as a solid bar and its control as an outline (or a tick when it moved the other way), the gain over the control at the right | a horizontal `bar` chart of two series, one marked, then a `kpi_cards` with an item per category. The dossier setting only | [controlled.tsx](../src/layouts/compositions/controlled.tsx) | clinic | [design/compositions/controlled](../design/compositions/controlled/README.md) |
| `duel` | two options' headline figures with bars, their shares as grouped columns under the chart's tag, a row of 「a vs b」 figures | `kpi_cards` of two, an upright `bar` chart of two series, a `data_table` of one to three rows. The dossier setting only | [duel.tsx](../src/layouts/compositions/duel.tsx) | clinic | [design/compositions/duel](../design/compositions/duel/README.md) |
| `forest` | endpoints in a table with a forest plot of their hazard ratios against a dashed line at 1, the primary endpoint marked, a note card under it | a `data_table` of four columns whose last reads as a ratio, then optionally a `callout` with an icon. The dossier setting only | [forest.tsx](../src/layouts/compositions/forest.tsx) | clinic | [design/compositions/forest](../design/compositions/forest/README.md) |
| `multiples` | each drug's rates as bars with its control as a tick, one scale a measure, beside risk cards | a `data_table` pairing each drug's row with its control's, then optionally a `row_cards` with icons. The dossier setting only | [multiples.tsx](../src/layouts/compositions/multiples.tsx) | clinic | [design/compositions/multiples](../design/compositions/multiples/README.md) |
| `fork` | one line to a split, then the marked group on in the mark and the other off dashed with its note, evidence cards beside it | a `line` chart of two series that part, then optional callouts and a `kpi_cards`. The dossier setting only | [fork.tsx](../src/layouts/compositions/fork.tsx) | clinic | [design/compositions/fork](../design/compositions/fork/README.md) |
| `ruler` | bands on one ticked scale, a row's highest band solid, a breach dashed, a tag at the right of each row | a `comparison` whose cells are ranges, then optionally a `callout`. The dossier setting only | [ruler.tsx](../src/layouts/compositions/ruler.tsx) | clinic | [design/compositions/ruler](../design/compositions/ruler/README.md) |
| `dumbbells` | before and after as a hollow dot and a dot in the mark, the change at the right, a reminder panel beside them | a `dumbbell` chart of two series, then optionally an `insight_panel`. The dossier setting only | [dumbbells.tsx](../src/layouts/compositions/dumbbells.tsx) | clinic | [design/compositions/dumbbells](../design/compositions/dumbbells/README.md) |
| `gate` | steps as cards with arrows, dashed lines from the steps that can stop it into a stop box, a note beside it | a `steps` of two to five, then a `warn` callout and optionally an `info` one. The dossier setting only | [gate.tsx](../src/layouts/compositions/gate.tsx) | clinic | [design/compositions/gate](../design/compositions/gate/README.md) |
| `watch` | a card per kind of check with boxes to tick, a photograph, and the review dates on one axis | a `row_cards` with icons, an `image` and a horizontal `timeline`. The dossier setting only | [watch.tsx](../src/layouts/compositions/watch.tsx) | clinic | [design/compositions/watch](../design/compositions/watch/README.md) |

Settled compositions that grew a dossier form:

- `rows` sets proposals as cards under the page's section (「提议 1」), the marked one filled with the mark, or duties beside a photograph. Board: [design/compositions/rows](../design/compositions/rows/README.md).
- `table` sets each option's proposal as a capsule that says how settled it is. Board: [design/compositions/table](../design/compositions/table/README.md).
- `lanes` sets two kinds of event on one calendar, the second lane's labels placed by a search over four tiers. Board: [design/compositions/lanes](../design/compositions/lanes/README.md).
- `cards` sets rules on cards two by two. Board: [design/compositions/cards](../design/compositions/cards/README.md).

The shared pieces are in [dossier.tsx](../src/layouts/compositions/dossier.tsx): `dossierInks` for the inks, `dossierSeries` for the series inks without the accent, `dossierText` and `dossierOn` for words that read on what they sit on, `dossierSolid` for a solid fill that carries words, `fitDossier`, `paintDossier` and `paintDossierLine` for text at its exact size, `paintDossierTracked` for spaced labels, `chipInk`, `chipWidth` and `paintChip` for a source capsule, `paintDossierCard` and `paintTopEdge` for a card, `paintDossierIcon` for a symbol, `heartbeatPoints` for the heartbeat, and `DOSSIER_SPEC` for the small type's exemption. `paintPhoto` in [inset.tsx](../src/layouts/compositions/inset.tsx) sets a cropped photograph. Any face can call them.

The tests draw every board page on clinic and on ember and crayon ([dossier.test.tsx](../src/layouts/compositions/dossier.test.tsx), [dossier-pages.test.tsx](../src/layouts/compositions/dossier-pages.test.tsx)). The gallery's 构图 band has clinic pages for every new composition and for the dossier forms of `rows`, `table`, `lanes` and `cards`.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `dossier-sheet` | the ordinary content page: the `kicker` beside the heartbeat, the claim bold at 30px over a hairline with a bar of the mark, the page's `tag` as a capsule over the body, the body handed to the compositions in the dossier setting, the source in 12px muted type | [content-dossier-sheet.tsx](../src/layouts/content-dossier-sheet.tsx), [dossier-shared.tsx](../src/layouts/dossier-shared.tsx) | clinic (every content kind on its menu) | [design/faces/dossier-sheet](../design/faces/dossier-sheet/README.md) |
| `dossier-cover` | the office and its request, the title at 44px, a heartbeat across to a full-height photograph, the header lines from `fields` | [cover-dossier-cover.tsx](../src/layouts/cover-dossier-cover.tsx) | clinic | [design/faces/dossier-cover](../design/faces/dossier-cover/README.md) |
| `dossier-ending` | the question at 40px, up to four items from `bullets` on numbered cards with their kinds, a box per choice from `ballot`, the `fields` and a line to sign | [ending-dossier-ending.tsx](../src/layouts/ending-dossier-ending.tsx) | clinic | [design/faces/dossier-ending](../design/faces/dossier-ending/README.md) |

### Motif

`clinic-motif` is redrawn: a short heartbeat at the top left of every page but the cover, and on content pages, when the deck asks for a footer, the subject at the top right and a folio (「N / M」) at the foot. It paints the footer row itself. Board: [design/motifs/clinic-motif](../design/motifs/clinic-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `tag` on a slide | the evidence the whole page rests on, a capsule the face sets with the heading; refused on a face that has no place for it | [index.ts](../src/ir/index.ts), [validate-core.ts](../src/validate-core.ts) | [design/faces/dossier-sheet](../design/faces/dossier-sheet/README.md) |
| `ballot` on a slide | the choices a committee votes with and a line to sign; refused on a face that has no place for it | [index.ts](../src/ir/index.ts), [validate-core.ts](../src/validate-core.ts) | [design/faces/dossier-ending](../design/faces/dossier-ending/README.md) |
| `evidence`, `settled` and `tone` on a tag | the kind of source behind a figure, a verdict that is settled, the kind of news | [shared.ts](../src/ir/components/shared.ts), [tag.tsx](../src/components/tag.tsx) | [design/components/tag](../design/components/tag/README.md) |
| `tag` on `chart` | a capsule for the evidence one chart rests on | [chart.ts](../src/ir/components/chart.ts), [chart.tsx](../src/components/chart.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `label_column` and row `icon` on `comparison` | a header for the labels' column, a symbol before a row's label | [comparison.ts](../src/ir/components/comparison.ts), [comparison.tsx](../src/components/comparison.tsx) | [design/components/comparison](../design/components/comparison/README.md) |
| `icon` on `numbered_cards` items | a symbol between the number and the title | [numbered-cards.ts](../src/ir/components/numbered-cards.ts) | [design/components/numbered_cards](../design/components/numbered_cards/README.md) |
| `icon` and `tone` on `steps` items | a symbol in place of the number, a ring in the tone's ink for a step that can stop the process | [steps.ts](../src/ir/components/steps.ts), [steps.tsx](../src/components/steps.tsx) | [design/components/steps](../design/components/steps/README.md) |
| `icon` on `insight_panel` | a symbol before the panel's title | [insight-panel.ts](../src/ir/components/insight-panel.ts) | [design/components/insight_panel](../design/components/insight_panel/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A word unit stands a space after its figure | a figure's unit is set after a space when it is a word (「6 个」, "4 weeks"), and glued when it is a percent, a magnitude or a multiplier (「80%」「1.2万」「3x」) | [kpi.tsx](../src/components/kpi.tsx) | none |
| A solid fill carries its words | a fill too light for the words on it steps toward the ink until they read, and on a dark page the words turn dark | [dossier.tsx](../src/layouts/compositions/dossier.tsx) | [design/compositions/readings](../design/compositions/readings/README.md) |
| A dropped separator is declared | a face that sets text apart at a colon, comma or full stop the author wrote says so on the element (`data-gloss-break`), so the audit reads it back | [ending-dossier-ending.tsx](../src/layouts/ending-dossier-ending.tsx), [forest.tsx](../src/layouts/compositions/forest.tsx), [watch.tsx](../src/layouts/compositions/watch.tsx) | none |

## almanac CBAM sample, 2026-10

The round redrew almanac to a seventeen-page Chinese and English briefing from a steel and aluminium exporter's sustainability department to its board ESG committee: the EU's carbon border charge now that 2026 imports count, what it costs on default values to 2034, what verified actual emissions save, what China's carbon price, green power and new routes can and cannot do, which rules are still proposals, ending on three decisions. Its decisions, the design system every almanac page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-05-almanac/`](../design/rounds/2026-10-05-almanac/README.md). The rules are restated for the next design session in [Designing for almanac](./design-almanac.md).

### Compositions

The compositions take a ninth `setting`, `yearbook` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a long-term account kept year by year. Figures sit on flat cards over hairlines and are set in the mono face with years, dates and formulas, every figure or rule that is not a settled fact carries a small pill that says what it rests on, the mark is what a page settles on and the accent is spent once a page.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `motion` | the background in rows with icons beside the ask on a card filled with the mark, each ask numbered large in mono | a `row_cards` of two to four, then an `insight_panel` of one to three rows. The yearbook setting only | [motion.tsx](../src/layouts/compositions/motion.tsx) | almanac | [design/compositions/motion](../design/compositions/motion/README.md) |
| `calendar` | months to scale, the timeline's periods as tinted bands, milestones on two tiers, figure cards and a note under the axis, the page's tag under them | a `timeline` dated to the month or day across one to three years, a `kpi_cards` of one to four, optionally a `callout`. The yearbook setting only | [calendar.tsx](../src/layouts/compositions/calendar.tsx) | almanac | [design/compositions/calendar](../design/compositions/calendar/README.md) |
| `horizon` | long lines over the years, the followed one heavy, end labels spread apart, the timeline as a table row under the years, figure cards beside | a `line` chart over years, a `timeline` dated by those years, a `kpi_cards` of one to three. The yearbook setting only | [horizon.tsx](../src/layouts/compositions/horizon.tsx) | almanac | [design/compositions/horizon](../design/compositions/horizon/README.md) |
| `formula` | a waterfall with notes under its bars beside a card with the formula in mono and its parameters, the page's tag under the bridge | a `waterfall` of three to six with no level below zero, a `code` of one to five lines, a `bullets` of "symbol: meaning". The yearbook setting only | [formula.tsx](../src/layouts/compositions/formula.tsx) | almanac | [design/compositions/formula](../design/compositions/formula/README.md) |
| `errata` | a wrong sum struck through beside the right one, the result large, a band saying why they differ | a `comparison` of two columns, one recommended, two to four rows, one marked, optionally a plain `callout`. The yearbook setting only | [errata.tsx](../src/layouts/compositions/errata.tsx) | almanac | [design/compositions/errata](../design/compositions/errata/README.md) |
| `breakdown` | a share bar of amounts, the marked run bracketed in the accent under the author's line, figure cards under it | a share bar with an `emphasis_label`, then a `kpi_cards` of one to four. The yearbook setting only | [breakdown.tsx](../src/layouts/compositions/breakdown.tsx) | almanac | [design/compositions/breakdown](../design/compositions/breakdown/README.md) |
| `benchmark` | bars against a dashed reference value, the marked bar in the accent, beside a photograph or a column of figure cards | optionally an `image`, a horizontal `bar` chart of one series, a `kpi_cards` of one to three, optionally a plain `callout`. The yearbook setting only | [benchmark.tsx](../src/layouts/compositions/benchmark.tsx) | almanac | [design/compositions/benchmark](../design/compositions/benchmark/README.md) |
| `paired` | upright bars in pairs, the way argued for in the mark, beside a photograph and a note card dashed when it warns of a pending figure | an upright `bar` chart of two series, one marked, an `image`, a `callout`. The yearbook setting only | [paired.tsx](../src/layouts/compositions/paired.tsx) | almanac | [design/compositions/paired](../design/compositions/paired/README.md) |
| `procedure` | steps as cards with arrowheads, the step the page turns on in the accent, over an open table with the recommended column tinted | a `steps` of two to five, then a two-column `comparison`. The yearbook setting only | [procedure.tsx](../src/layouts/compositions/procedure.tsx) | almanac | [design/compositions/procedure](../design/compositions/procedure/README.md) |
| `magnitude` | one figure at 200px with its formula and tag, beside a card of bars and a second figure | a `kpi_cards` of one, a one-line `code`, a horizontal `bar` chart of two to four, a `kpi_cards` of one. The yearbook setting only | [magnitude.tsx](../src/layouts/compositions/magnitude.tsx) | almanac | [design/compositions/magnitude](../design/compositions/magnitude/README.md) |
| `segments` | a photograph beside a bar cut in two or three, what each part means under it, figure cards across the foot | an `image`, a share bar of two or three, optionally a plain `callout`, a `kpi_cards` of two to four. The yearbook setting only | [segments.tsx](../src/layouts/compositions/segments.tsx) | almanac | [design/compositions/segments](../design/compositions/segments/README.md) |
| `survey` | photographs in a row over bars on one scale, a dashed card for the way that is only claimed | an `image_grid` of two to four, a horizontal `bar` chart of two to five, a `callout`. The yearbook setting only | [survey.tsx](../src/layouts/compositions/survey.tsx) | almanac | [design/compositions/survey](../design/compositions/survey/README.md) |
| `outlook` | a year axis with the law's span tinted and a proposal's dashed, each rule a node, a stem and a card with its tag and source | a `timeline` of two to four milestones dated by years with up to three periods, optionally a plain `callout`. The yearbook setting only | [outlook.tsx](../src/layouts/compositions/outlook.tsx) | almanac | [design/compositions/outlook](../design/compositions/outlook/README.md) |
| `phases` | phases on one line, each card with rows to tick and the budget line still to be set in a dashed pill at its foot | a `roadmap` of two to four phases with periods. The yearbook setting only | [phases.tsx](../src/layouts/compositions/phases.tsx) | almanac | [design/compositions/phases](../design/compositions/phases/README.md) |

The shared pieces are in [yearbook.tsx](../src/layouts/compositions/yearbook.tsx): `yearbookInks` for the inks, `yearbookText` and `yearbookMeta` for words that read on what they sit on, `fitYearbook`, `fitYearbookMono`, `paintYearbook`, `paintYearbookLine` and `paintYearbookTracked` for text at its exact size, `paintYearbookCard`, `paintYearbookEdge` and `paintYearbookIcon` for a card, `pillText`, `pillWidth`, `pillUnsettled` and `paintPill` for a pill, `fitFigureCard` and `paintFigureCard` for a figure card, `YearStrip` for the strip of years, `Sprout` for the sprout, `yearOf` and `monthsOf` for dates on a scale, and `YEARBOOK_SPEC` for the small type's exemption. Any face can call them.

The tests draw every board page on almanac and on ember and crayon ([yearbook-pages.test.tsx](../src/layouts/compositions/yearbook-pages.test.tsx)). The gallery's 构图 band has an almanac page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `yearbook-sheet` | the ordinary content page: the `kicker` beside the sprout, the strip of `years` at the top right, the claim bold at 30px over a hairline, the body handed to the compositions in the yearbook setting, the page's `tag` where they place it, the source in 12px muted type | [content-yearbook-sheet.tsx](../src/layouts/content-yearbook-sheet.tsx), [yearbook-shared.tsx](../src/layouts/yearbook-shared.tsx) | almanac (every content kind on its menu but `statement`) | [design/faces/yearbook-sheet](../design/faces/yearbook-sheet/README.md) |
| `yearbook-cover` | the page's photograph squared on the right, contour lines, the office and occasion, the title at 50px, a rule in the accent, a scale of years from the page's `timeline`, the date | [cover-yearbook-cover.tsx](../src/layouts/cover-yearbook-cover.tsx) | almanac | [design/faces/yearbook-cover](../design/faces/yearbook-cover/README.md) |
| `yearbook-ending` | the photograph under a scrim of the page colour, the question at 44px, up to four decisions from `bullets` on cards with boxes to tick, the one written `**…**` edged in the accent | [ending-yearbook-ending.tsx](../src/layouts/ending-yearbook-ending.tsx) | almanac | [design/faces/yearbook-ending](../design/faces/yearbook-ending/README.md) |

### Motif

`almanac-motif` is redrawn: an 18px sprout at the top left of every content page, and when the deck asks for a footer, the office at the left of the foot and a folio (「N / M」) at the right. It paints the footer row itself. Board: [design/motifs/almanac-motif](../design/motifs/almanac-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `years` on a slide | the run of years the deck follows and the years the page is about, lit on the strip. Refused on a face that has no place for it | [index.ts](../src/ir/index.ts), [validate-core.ts](../src/validate-core.ts) | [design/faces/yearbook-sheet](../design/faces/yearbook-sheet/README.md) |
| `basis` on a tag | what a figure or rule rests on: a provision of law, an estimate at a stated assumption, a pending figure, a proposal | [shared.ts](../src/ir/components/shared.ts), [tag.tsx](../src/components/tag.tsx) | [design/components/tag](../design/components/tag/README.md) |
| `periods`, and `tag` and `source` on milestones, on `timeline` | named spans of time, each with an optional basis, a milestone's tag and its source line | [timeline.ts](../src/ir/components/timeline.ts), [timeline.tsx](../src/components/timeline.tsx) | [design/components/timeline](../design/components/timeline/README.md) |
| `title` and `tag` on `callout` | a bold title over the text, a tag under it | [callout.ts](../src/ir/components/callout.ts), [callout.tsx](../src/components/callout.tsx) | [design/components/callout](../design/components/callout/README.md) |
| `note` on waterfall items | a short line under a bar's label | [waterfall.ts](../src/ir/components/waterfall.ts), [waterfall.tsx](../src/components/waterfall.tsx) | [design/components/waterfall](../design/components/waterfall/README.md) |
| `reference`, `data[].note` and `emphasis_label` on `chart` | a value drawn across bars as a dashed line, a note after a bar's value, the author's own line for a share bar's marked run | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx), [share-bar.tsx](../src/components/share-bar.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `basis` on roadmap rows | a row whose value is not settled, underlined dashed or set in a dashed pill | [roadmap.ts](../src/ir/components/roadmap.ts), [roadmap.tsx](../src/components/roadmap.tsx) | [design/components/roadmap](../design/components/roadmap/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A cut roadmap value is reported | a roadmap row's value past its two lines is marked cut, so the audit reports it | [roadmap.tsx](../src/components/roadmap.tsx) | none |
| Accent words over a photograph read | on the shared photo cover and chapter, the accent the marked words and a chapter's number take is lifted toward white until it reads over the darkened photograph | [image-pages.tsx](../src/render/image-pages.tsx), [ink.ts](../src/render/ink.ts) (`liftedInk`) | none |
| A bar legend names each series in the colour its bars are drawn in | in a bar chart with one bar marked, a swatch takes the fill of the bars it names: the grey they step back to for any series with a bar besides the marked one, and the series' own colour only when the marked bar is its one bar. A Forecast or Target entry follows its bars the same way | [chart.tsx](../src/components/chart.tsx) | none |

## homeroom AI-at-work training sample, 2026-10

The round redrew homeroom to a twenty-one-page Chinese and English all-staff class from a training department: forty-five minutes in three parts with two quizzes on using generative AI at work, what the published studies say it helps with and where it backfires, three real cases and a staff survey, the company's six rules and three working methods, a recap on the board and the homework. Its decisions, the design system every homeroom page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-06-homeroom/`](../design/rounds/2026-10-06-homeroom/README.md). The rules are restated for the next design session in [Designing for homeroom](./design-homeroom.md).

### Compositions

The compositions take a tenth `setting`, `lesson` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a class taught from a handout. Cards are the handout's paper over a hairline, icons in the mark, the correcting pen spent on what a page is about, every study with a pill saying what kind of study it is, questions on ruled paper, answers stamped, the recap on a blackboard and the note to remember on a sticky note.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `objectives` | a photograph beside a card per goal, each with an empty box to tick, its icon, name, a line or two and the part that teaches it as a pill, a closing line in the pen | an `image`, an `icon_cards` of two to four with optional tags, optionally a plain `callout`. The lesson setting only | [objectives.tsx](../src/layouts/compositions/objectives.tsx) | homeroom | [design/compositions/objectives](../design/compositions/objectives/README.md) |
| `syllabus` | a bar of the whole class with each part as long as it lasts and its checks ringed, a card per part with its points, check and goal, a tip | a `roadmap` of two to four phases that all carry a `duration`, optionally a `callout`. The lesson setting only | [syllabus.tsx](../src/layouts/compositions/syllabus.tsx) | homeroom | [design/compositions/syllabus](../design/compositions/syllabus/README.md) |
| `studies` | a card per study: field, figure, measure, finding, sample and the kind of study as a pill, the lead study in the pen, a caution | a `kpi_cards` of two to four with no delta or tone, labels written "field: measure", optionally a `callout`. The lesson setting only | [studies.tsx](../src/layouts/compositions/studies.tsx) | homeroom | [design/compositions/studies](../design/compositions/studies/README.md) |
| `cohorts` | for each study the weaker group's bar in the pen against the stronger in the ghost, a key, a note, a card weighing two people, a tip | a `comparison` of two columns and one or two rows of "group: figure" cells, then optionally a note `callout`, an `insight_panel` of two rows and a tip `callout`. The lesson setting only | [cohorts.tsx](../src/layouts/compositions/cohorts.tsx) | homeroom | [design/compositions/cohorts](../design/compositions/cohorts/README.md) |
| `diptych` | two studies side by side, each its panel's rows, its chart as bars from zero or as ranges on a track, what to do and the kind of study, a tip under both | two pairs of an `insight_panel` and a horizontal bar `chart` of two or three bars, optionally a `callout`. The lesson setting only | [diptych.tsx](../src/layouts/compositions/diptych.tsx) | homeroom | [design/compositions/diptych](../design/compositions/diptych/README.md) |
| `estimates` | expectations as grey dots on stems from zero, the measurement in the pen with a dashed bracket to the expectation before it, a card stating the gap | a horizontal bar `chart` of three to six bars, the last marked, optionally a `kpi_cards` of one. The lesson setting only | [estimates.tsx](../src/layouts/compositions/estimates.tsx) | homeroom | [design/compositions/estimates](../design/compositions/estimates/README.md) |
| `quiz` | a photograph beside questions on ruled paper, each with a box for every answer on the page's `ballot` | on a page with a `ballot` of two to four choices: optionally an `image`, then a `row_cards` of two to four cases. The lesson setting only | [quiz.tsx](../src/layouts/compositions/quiz.tsx) | homeroom | [design/compositions/quiz](../design/compositions/quiz/README.md) |
| `answers` | the same questions with a turned stamp each (yes, no, not yet), the reason and the page to look back at, a closing line | a `row_cards` of two to four with titles written "case: verdict", a sub and a tone each, optionally a plain `callout`. The lesson setting only | [answers.tsx](../src/layouts/compositions/answers.tsx) | homeroom | [design/compositions/answers](../design/compositions/answers/README.md) |
| `cases` | a card per case: what happened, who paid and the source under their headers, a quote and a figure under the cards | a `comparison` of two to four rows with icons and two or three columns, optionally a `callout` and a `kpi_cards` of one. The lesson setting only | [cases.tsx](../src/layouts/compositions/cases.tsx) | homeroom | [design/compositions/cases](../design/compositions/cases/README.md) |
| `ranking` | how many do each thing, the marked bar in the pen, beside a card breaking that one down | a horizontal bar `chart` of three to six, a `callout` with a title, a second horizontal bar `chart` of two to four. The lesson setting only | [ranking.tsx](../src/layouts/compositions/ranking.tsx) | homeroom | [design/compositions/ranking](../design/compositions/ranking/README.md) |
| `rules` | house rules three to a row, each icon on a disc, its name, the rule and the provision it rests on after 「依据」 | an `icon_cards` of three to six, each with a tag. The lesson setting only | [rules.tsx](../src/layouts/compositions/rules.tsx) | homeroom | [design/compositions/rules](../design/compositions/rules/README.md) |
| `tiers` | a pyramid whose levels are red, amber and green, each joined by a dashed line to a card saying what to do and giving examples | a `pyramid` of two to four levels with no notes, then an `icon_cards` with one card per level. The lesson setting only | [tiers.tsx](../src/layouts/compositions/tiers.tsx) | homeroom | [design/compositions/tiers](../design/compositions/tiers/README.md) |
| `methods` | photographs in a row, each with a number in the pen, the method's name and how it goes, a turned sticky note under them | an `image_grid` of two to four with captions written "name: how", optionally a `callout`. The lesson setting only | [methods.tsx](../src/layouts/compositions/methods.tsx) | homeroom | [design/compositions/methods](../design/compositions/methods/README.md) |
| `blackboard` | a framed blackboard with two to four words to copy down in white, the marked one underlined in the pen, a closing line | a `row_cards` of two to four with icons and texts, at most one marked, optionally a plain `callout`. The lesson setting only | [blackboard.tsx](../src/layouts/compositions/blackboard.tsx) | homeroom | [design/compositions/blackboard](../design/compositions/blackboard/README.md) |

The shared pieces are in [lesson.tsx](../src/layouts/compositions/lesson.tsx): `lessonInks` for the inks, `atLightness` and `fillUnderWhite` for a pale paper and a fill white words read on, `lessonText` and `lessonMeta` for words that read on what they sit on, `fitLesson`, `paintLesson`, `paintLessonLine` and `paintLessonTracked` for text at its exact size, `paintLessonCard`, `paintLessonEdge` and `paintLessonIcon` for a card, `pillWidth`, `pillInk` and `paintPill` for a pill, `paintCheckbox` for a box to tick, `squigglePath` and `Squiggle` for the pen's wavy line, `CourseStrip` and `courseStripLeft` for the course strip, `paintBoard` for the blackboard, `paintRuled` for ruled paper, `paintNote` for a sticky note, `paintStamp` for a stamp, `paintTipBox` for a tip's box, `toneInk` and `toneIcon` for a verdict, `itemNumeral` for numbers in the deck's numerals, `splitLead` and `glossBreak` for a label split at its colon (the colon declared rather than printed, as on other faces), `paintLessonPhoto` for a photograph, and `LESSON_SPEC` for the small type's exemption. The closing lines under a body (a tip, a caution, a bare line) are in [lesson-tips.tsx](../src/layouts/compositions/lesson-tips.tsx). Any face can call them.

The tests draw every board page on homeroom and on ember, a dark theme whose primary and accent are one orange ([lesson.test.tsx](../src/layouts/compositions/lesson.test.tsx), [lesson-pages.test.tsx](../src/layouts/compositions/lesson-pages.test.tsx)). The gallery's 构图 band has a homeroom page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `lesson-sheet` | the ordinary content page: the `kicker` at the top left, the course strip with the page's `stage` lit at the top right, the claim bold at 30px over the pen's wavy line, the body handed to the compositions in the lesson setting, the source in 12px muted type | [content-lesson-sheet.tsx](../src/layouts/content-lesson-sheet.tsx), [lesson-shared.tsx](../src/layouts/lesson-shared.tsx) | homeroom (every content kind on its menu) | [design/faces/lesson-sheet](../design/faces/lesson-sheet/README.md) |
| `lesson-cover` | a blackboard over a ledge of wood beside the page's photograph: the office and the occasion, the title at 50px, the wavy line in chalk, the subtitle, the course's facts as pills from `bullets`, the date | [cover-lesson-cover.tsx](../src/layouts/cover-lesson-cover.tsx) | homeroom | [design/faces/lesson-cover](../design/faces/lesson-cover/README.md) |
| `lesson-chapter` | a band of board across the page with the part's own `kicker` in a box, the title and what it answers, three cards under it from `row_cards`, a photograph only inside the band | [chapter-lesson-chapter.tsx](../src/layouts/chapter-lesson-chapter.tsx) | homeroom | [design/faces/lesson-chapter](../design/faces/lesson-chapter/README.md) |
| `lesson-ending` | the homework: two to five tasks from `numbered_cards` on ruled paper with boxes to tick, a sticky note from the `callout`, the page's `stamp`, the office and the date | [ending-lesson-ending.tsx](../src/layouts/ending-lesson-ending.tsx) | homeroom | [design/faces/lesson-ending](../design/faces/lesson-ending/README.md) |

### Motif

`homeroom-motif` is redrawn: on content pages, when the deck asks for a footer, the office and the course at the left of the foot and a folio (「N / M」) at the right. The ruled lines of the last round are retired: ruled paper is now the quiz cards' and the homework's own. It paints the footer row itself. Board: [design/motifs/homeroom-motif](../design/motifs/homeroom-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `course` on a deck and `stage` on a slide | the stages a class runs through, quizzes marked, and the one a page is in, lit on the course strip. `stage` is refused on a face that does not draw it, on a deck with no `course` and when it names a stage the course does not have | [index.ts](../src/ir/index.ts), [validate-core.ts](../src/validate-core.ts), [course-marks.ts](../src/render/course-marks.ts) | [design/faces/lesson-sheet](../design/faces/lesson-sheet/README.md) |
| `ballot` on a slide, in the lesson setting | the answers a question can be ticked in, a box for each beside every case | [index.ts](../src/ir/index.ts) | [design/compositions/quiz](../design/compositions/quiz/README.md) |
| `evidence: "preprint"` on a tag | a working paper or preprint, apart from a journal's study | [shared.ts](../src/ir/components/shared.ts), [tag.tsx](../src/components/tag.tsx) | [design/components/tag](../design/components/tag/README.md) |
| `upper` on chart points | a value known only as a range, drawn solid to `y` and dashed on to `upper`, both ends named | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `duration`, `duration_unit`, `checkpoint` and `points` on `roadmap` | a phase's length, the check at its end and what it covers, so a face can lay the phases to scale | [roadmap.ts](../src/ir/components/roadmap.ts), [roadmap.tsx](../src/components/roadmap.tsx) | [design/components/roadmap](../design/components/roadmap/README.md) |
| `tone` on pyramid levels | a level in the success, warning or danger ink, so its colour says how guarded it is | [pyramid.ts](../src/ir/components/pyramid.ts), [pyramid.tsx](../src/components/pyramid.tsx) | [design/components/pyramid](../design/components/pyramid/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A bento keeps equal items in order | items of equal weight that outrank the rest take the grid's biggest cells in the order they were written, so three icon cards beside a photograph read 1, 2, the photograph, 3 | [bento-layout.ts](../src/render/bento-layout.ts) (`sortUnitsByHeroWeight`) | none |

## ember low-altitude delivery pitch sample, 2026-10

The round redrew ember to a sixteen-page Chinese and English seed-round pitch from a drone delivery startup that has not flown yet: how big the order pool is and how empty the sky still is, why now, which planned landing points are set aside for medical use, what six pioneers have proven and not published, the wedge, three hypotheses to prove in 18 months, the cost figures they are measured against, five gates before flying, six risks that have each happened before, the milestones with the gate that can stop them, and the ask. Its decisions, the design system every ember page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-06-ember/`](../design/rounds/2026-10-06-ember/README.md). The rules are restated for the next design session in [Designing for ember](./design-ember.md).

### Compositions

The compositions take an eleventh `setting`, `pitch` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a founder on a dark stage asking a room for money or belief. Cards are a step lighter than the stage, figures are set large in the ivory, everything that has to be told apart steps down from the hairline toward the stage, and the accent, the one light on stage, lights one thing a page with the dark ink on it.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `expanse` | the whole set huge over a field of squares, the part a dot of the fire in its corner with a leader to its figure, the ratio large beside them over the page's point | a `kpi_cards` of three (the whole, the part written `**…**`, the ratio), optionally a `paragraph`. The pitch setting only | [expanse.tsx](../src/layouts/compositions/expanse.tsx) | ember | [design/compositions/expanse](../design/compositions/expanse/README.md) |
| `stairs` | a card a year, each a step higher than the one before and joined by a dashed riser, the year large over it, the lit year in the fire, a closing line | a horizontal `timeline` of two to four milestones, at most one highlighted, optionally a plain `callout`. The pitch setting only | [stairs.tsx](../src/layouts/compositions/stairs.tsx) | ember | [design/compositions/stairs](../design/compositions/stairs/README.md) |
| `funnel` | levels stacked as trapezoids as wide as their values, the last in the fire, a card with what has happened and a card with what it means | a `chart` of `chart_type: "funnel"`, one series of two to four levels, optionally a `kpi_cards` of one and a `callout` with a title. The pitch setting only | [funnel.tsx](../src/layouts/compositions/funnel.tsx) | ember | [design/compositions/funnel](../design/compositions/funnel/README.md) |
| `rivals` | an open table, a row a rival with its icon, the last column framed in the fire over its tint, a closing line | a `data_table` of three to six columns whose last is marked, two to six rows, optionally a plain `callout`. The pitch setting only | [rivals.tsx](../src/layouts/compositions/rivals.tsx) | ember | [design/compositions/rivals](../design/compositions/rivals/README.md) |
| `equation` | the terms as cards with plus and equals between, the result a card of the fire, what it leaves out struck through in a dashed box | a `concept_equation` of two or three terms and a result, each with a figure, optionally `excluded`. The pitch setting only | [equation.tsx](../src/layouts/compositions/equation.tsx) | ember | [design/compositions/equation](../design/compositions/equation/README.md) |
| `spotlight` | one figure at 120px in the fire beside a photograph, the others side by side under it | a `kpi_cards` of two or three, the first marked. The pitch setting only, on `pitch-photo` | [spotlight.tsx](../src/layouts/compositions/spotlight.tsx) | ember | [design/compositions/spotlight](../design/compositions/spotlight/README.md) |
| `bets` | a full-width card a bet with its number, claim and benchmark, and a window: the plan's whole stretch with the bet's stretch laid on it | a `gantt` of two to four rows with a `range`, a `period` on each row and two `axis_labels`. The pitch setting only | [bets.tsx](../src/layouts/compositions/bets.tsx) | ember | [design/compositions/bets](../design/compositions/bets/README.md) |
| `divide` | two groups of figure cards by the tag they share, a dashed line between, the conclusion as a bar of the fire | a `kpi_cards` of two to six in two runs of one to three sharing a tag, optionally a neutral `verdict_banner`. The pitch setting only | [divide.tsx](../src/layouts/compositions/divide.tsx) | ember | [design/compositions/divide](../design/compositions/divide/README.md) |
| `locks` | a card a gate with its number and icon, a lock between gates, the last gate a card of the fire, a card a figure under them | a `chevron_process` of three to six stages, optionally a `kpi_cards` of one to three. The pitch setting only | [locks.tsx](../src/layouts/compositions/locks.tsx) | ember | [design/compositions/locks](../design/compositions/locks/README.md) |
| `register` | a risk register, a row a risk with its icon, the cells in the ivory and the grey, the short last column bold, the lead row on the fire's tint | a `data_table` of three to five columns, none marked, two to six rows, at most one highlighted. The pitch setting only | [register.tsx](../src/layouts/compositions/register.tsx) | ember | [design/compositions/register](../design/compositions/register/README.md) |
| `runway` | the whole run to scale with its ticks, the check as a diamond of the fire, a card a phase with its period, title and points, the gate's rule in an outline of the fire | a `roadmap` of two to four phases that all carry a `duration`, at most one `checkpoint`, optionally a `callout` with no title. The pitch setting only | [runway.tsx](../src/layouts/compositions/runway.tsx) | ember | [design/compositions/runway](../design/compositions/runway/README.md) |
| `uses` | the ask large at the left, one bar cut by share at the right with a key and a caption, a card of what the ask is measured against | a `kpi_cards` of one, a horizontal stacked `chart` of two to five parts, optionally a `callout` with no title. The pitch setting only | [uses.tsx](../src/layouts/compositions/uses.tsx) | ember | [design/compositions/uses](../design/compositions/uses/README.md) |

The shared pieces are in [pitch.tsx](../src/layouts/compositions/pitch.tsx): `pitchInks` for the inks, `pitchText` and `pitchMeta` for words that read on what they sit on, `fitPitch`, `paintPitch`, `paintPitchLine`, `pitchWidth`, `paintPitchTracked` and `pitchTrackedWidth` for text at its exact size, `paintPitchCard` and `paintPitchIcon` for a card and its icon, `Fire` for the one thing a page lights (`data-pitch-fire`), `paintWedge` for the corner wedge, `PitchRail`, `railLeft` and `RAIL` for the running order, `paintPitchPhoto` and `PitchScrim` for a photograph and its darkening, `pitchNumeral` for an act's number, `splitSentence` and `glossBreak` for a description split at its first sentence end (the end declared rather than printed, as on other faces), and `PITCH_SPEC` for the small type's exemption. The claim, the standfirst and the source are in [pitch-shared.tsx](../src/layouts/pitch-shared.tsx). Any face can call them.

The tests draw every board page on ember and on homeroom and brief, two light themes that share nothing with it ([pitch.test.tsx](../src/layouts/compositions/pitch.test.tsx), [pitch-pages.test.tsx](../src/layouts/compositions/pitch-pages.test.tsx)), and check that each page lights one thing. The gallery's 构图 band has an ember page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `pitch-sheet` | the ordinary content page: the running order with the page's `stage` lit at the top right, the claim bold at 34px, the body handed to the compositions in the pitch setting, the source in 12px type | [content-pitch-sheet.tsx](../src/layouts/content-pitch-sheet.tsx), [pitch-shared.tsx](../src/layouts/pitch-shared.tsx) | ember (every content kind but photo) | [design/faces/pitch-sheet](../design/faces/pitch-sheet/README.md) |
| `pitch-photo` | the photograph down the left 560px, a pitch page of its own in the column beside it with `spotlight` as its body | [content-pitch-photo.tsx](../src/layouts/content-pitch-photo.tsx) | ember (photo) | [design/faces/pitch-photo](../design/faces/pitch-photo/README.md) |
| `pitch-cover` | the page's photograph darkened from the foot, a wedge of the fire with the occasion and the date, the title at 64px, the subtitle, the facts as pills from `bullets` | [cover-pitch-cover.tsx](../src/layouts/cover-pitch-cover.tsx) | ember | [design/faces/pitch-cover](../design/faces/pitch-cover/README.md) |
| `pitch-chapter` | the page's photograph darkened from the left, the act's number outlined at 200px in the fire, the title, up to four points from `row_cards` | [chapter-pitch-chapter.tsx](../src/layouts/chapter-pitch-chapter.tsx) | ember | [design/faces/pitch-chapter](../design/faces/pitch-chapter/README.md) |
| `pitch-ending` | the wedge, the closing line at 64px, the steps the round pays for from a `timeline`, a button of the fire with the author's words from a `paragraph` | [ending-pitch-ending.tsx](../src/layouts/ending-pitch-ending.tsx) | ember | [design/faces/pitch-ending](../design/faces/pitch-ending/README.md) |

### Motif

`ember-motif` is redrawn: on content pages, when the deck asks for a footer, the deck's `label` at the top left beside the running order, the page number at the bottom right, and the office and the notice at the bottom left. Beside a photograph the face keeps at the left, the folio moves past it and the label joins it there. It paints the footer row itself. Board: [design/motifs/ember-motif](../design/motifs/ember-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `course` on a deck and `stage` on a slide, on the pitch faces | the beats a pitch runs through and the one a page is in, lit on the running order (the fields homeroom's course strip settled) | [course-marks.ts](../src/render/course-marks.ts), [pitch.tsx](../src/layouts/compositions/pitch.tsx) | [design/faces/pitch-sheet](../design/faces/pitch-sheet/README.md) |
| `icon` on `concept_equation` terms and result, and `excluded` | a symbol on each term, and what the result leaves out on purpose, drawn struck through in a dashed box | [concept-equation.ts](../src/ir/components/concept-equation.ts), [concept-equation.tsx](../src/components/concept-equation.tsx) | [design/components/concept_equation](../design/components/concept_equation/README.md) |
| `icon` on `chevron_process` stages | a symbol at the top right of a stage | [chevron-process.ts](../src/ir/components/chevron-process.ts), [chevron-process.tsx](../src/components/chevron-process.tsx) | [design/components/chevron_process](../design/components/chevron_process/README.md) |
| `emphasis` and `icon` on `data_table` columns | the one column a page is about, and a symbol before each of a column's cells | [data-table.ts](../src/ir/components/data-table.ts), [data-table.tsx](../src/components/data-table.tsx) | [design/components/data_table](../design/components/data_table/README.md) |
| `range` on `gantt`, `icon` and `period` on its rows | the stretch the axis runs over when it is longer than the bars, a row's symbol, and its stretch in words | [gantt.ts](../src/ir/components/gantt.ts), [gantt.tsx](../src/components/gantt.tsx) | [design/components/gantt](../design/components/gantt/README.md) |
| `axes.y_unit` on a pie, a donut and a funnel | the value's unit printed after every value these charts name | [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| An outlined word exports as one | a text drawn with no fill and a stroke exports as outlined text in PowerPoint, the stroke's colour and width over a transparent fill | [text.ts](../src/pptx/svg2pptx/text.ts), [render.ts](../src/pptx/svg2pptx/render.ts) | [design/faces/pitch-chapter](../design/faces/pitch-chapter/README.md) |
| The audit reads an outlined word by its stroke | contrast for a text with no fill is measured on its stroke | [deck-audit.ts](../src/audit/deck-audit.ts) | none |
| A line struck through on purpose passes L1 | a line marked `data-strike` is not counted as a line through a word | [l1.ts](../evals/gallery/l1.ts) | [design/compositions/equation](../design/compositions/equation/README.md) |
| The ask ending prints the author's button | the shared ask ending's button carries the page's first bullet or its paragraph, and is not drawn without either. It used to print "Let's talk" in English on every deck | [ending-ask-ending.tsx](../src/layouts/ending-ask-ending.tsx) | none |
| A stacked poster names its chapter in the deck's language | the breadcrumb reads 「第一章 · …」 on a Chinese deck and "Chapter 01 · …" on any other | [content-stacked-poster.tsx](../src/layouts/content-stacked-poster.tsx) | none |

## rally summer concert season proposal sample, 2026-10

The round redrew rally to an eighteen-page Chinese and English campaign proposal from a drinks brand's marketing team: the plan in one sentence, how big large shows have grown, how concerts and festivals parted ways, when the season peaks, who the fans are and how many travel in, how they spend a concert weekend, the four places the brand can meet them, what peers have done and why none could count a sale, a code at every touchpoint that brings each sale back to its show, the cities already rewarding ticket stubs, a plan B for six risks that have each happened before, the schedule, a scoreboard whose targets wait for the first stop, the budget as six shares, four requests and the next steps. Its decisions, the design system every rally page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-06-rally/`](../design/rounds/2026-10-06-rally/README.md). The rules are restated for the next design session in [Designing for rally](./design-rally.md).

### Compositions

The compositions take a twelfth `setting`, `marquee` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a campaign proposal staged as a show. Every page is a section named on a ticket stub, cards are a step lighter than the house, charts take the confetti's colours, and the accent, the lead singer, lights one thing a page with the dark ink on it.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `crest` | one figure huge in the accent with its unit, label and note, a card of what it rests on, and an upright bar a year beside it, the marked year in the accent | a `kpi_cards` of one, a `bar` chart of one upright series of two to six bars, optionally a `callout` with a title. The marquee setting only | [crest.tsx](../src/layouts/compositions/crest.tsx) | rally | [design/compositions/crest](../design/compositions/crest/README.md) |
| `branch` | two curves parting from one dot, the marked one solid in the accent and the other dotted, each end with its icon, its change large and what lies behind it | a `line` chart of two series over two categories from one start, one marked, and two `callout`s titled by series. The marquee setting only | [branch.tsx](../src/layouts/compositions/branch.tsx) | rally | [design/compositions/branch](../design/compositions/branch/README.md) |
| `season` | rounded cells a month and a row a kind, the peaks full with a flame, the band framed in a dashed outline of the accent, a key and a note | a `heatmap` of one to three rows and four to twelve columns with at most one band, a `callout` a row and optionally a note. The marquee setting only | [season.tsx](../src/layouts/compositions/season.tsx) | rally | [design/compositions/season](../design/compositions/season/README.md) |
| `makeup` | a share bar a crowd with the marked run bracketed and named, every share printed, a key, a card with one figure, and a dashed box with a line to keep in mind | two or three share bars with the same parts and run, optionally a `kpi_cards` of one and a `callout`. The marquee setting only | [makeup.tsx](../src/layouts/compositions/makeup.tsx) | rally | [design/compositions/makeup](../design/compositions/makeup/README.md) |
| `origins` | a bar a group cut by where its crowd comes from, a photograph with its caption, and one figure large under it | a `percent_stacked` chart, an `image`, a `kpi_cards` of one. The marquee setting only | [origins.tsx](../src/layouts/compositions/origins.tsx) | rally | [design/compositions/origins](../design/compositions/origins/README.md) |
| `route` | a disc a stop on a dotted line, the stop the plan stays out of dimmed with its line over it, a figure card and a card of bars on their side | a `steps` of two to five with icons, a `kpi_cards` of one, a horizontal `bar` chart. The marquee setting only | [route.tsx](../src/layouts/compositions/route.tsx) | rally | [design/compositions/route](../design/compositions/route/README.md) |
| `spots` | a photograph and a card a place in two columns, the first card outlined in the accent, a closing line | an `image_grid` of two to four with icons and captions written "name：what is done", optionally a `callout`. The marquee setting only | [spots.tsx](../src/layouts/compositions/spots.tsx) | rally | [design/compositions/spots](../design/compositions/spots/README.md) |
| `wall` | a wall of case cards, each with its deed, its reported result and a tag of its source, beside one card of the accent with the count huge | an `icon_cards` of two to six with tags, titled "name · trade · year", a `kpi_cards` of one. The marquee setting only | [wall.tsx](../src/layouts/compositions/wall.tsx) | rally | [design/compositions/wall](../design/compositions/wall/README.md) |
| `loop` | a numbered card a step, the first of the accent, a dashed return from the last to the first, and an open table under it | a `chevron_process` of three to six, optionally a `callout` for the return, a `data_table` of two to five columns. The marquee setting only | [loop.tsx](../src/layouts/compositions/loop.tsx) | rally | [design/compositions/loop](../design/compositions/loop/README.md) |
| `stubs` | a ticket an offer with a perforated stub saying what to show for it, beside a card with one figure | an `icon_cards` of two to four titled "place：offer" with plain tags, a `kpi_cards` of one. The marquee setting only | [stubs.tsx](../src/layouts/compositions/stubs.tsx) | rally | [design/compositions/stubs](../design/compositions/stubs/README.md) |
| `fallbacks` | a bar a risk with its icon, name, what happened, an arrow of the accent and the plan B, the lead row on the accent's tint | a `data_table` of two columns with an icon on every row, first cells written "risk：what happened". The marquee setting only | [fallbacks.tsx](../src/layouts/compositions/fallbacks.tsx) | rally | [design/compositions/fallbacks](../design/compositions/fallbacks/README.md) |
| `timetable` | a rule a month, the season tinted behind the bars, a capsule a piece of work, the marked one in the accent with its icon on its bar | a `gantt` of two to six rows with axis labels and at most one band. The marquee setting only | [timetable.tsx](../src/layouts/compositions/timetable.tsx) | rally | [design/compositions/timetable](../design/compositions/timetable/README.md) |
| `scoreboard` | a panel a measure on the stage's dark, three empty slots where its figure will stand, when its target is set and how it is counted, a closing line | an `icon_cards` of three to six whose tags say the target is pending, optionally a `callout`. The marquee setting only | [scoreboard.tsx](../src/layouts/compositions/scoreboard.tsx) | rally | [design/compositions/scoreboard](../design/compositions/scoreboard/README.md) |
| `allotment` | one tall bar cut into shares in the confetti colours, the set-apart run bracketed with its line, a key, one or two cards | a share bar of two to eight parts with a marked run and an `emphasis_label`, optionally an `icon_cards` of two or three. The marquee setting only | [allotment.tsx](../src/layouts/compositions/allotment.tsx) | rally | [design/compositions/allotment](../design/compositions/allotment/README.md) |
| `asks` | a ticket a request with a box per choice on its stub, the lead request a ticket of the accent | a `numbered_cards` of three or four titled "about：request", on a page with a `ballot` of two choices. The marquee setting only | [asks.tsx](../src/layouts/compositions/asks.tsx) | rally | [design/compositions/asks](../design/compositions/asks/README.md) |

The shared pieces are in [marquee.tsx](../src/layouts/compositions/marquee.tsx): `marqueeInks` for the inks, `marqueeText` and `marqueeMeta` for words that read on what they sit on, `fitMarquee`, `paintMarquee`, `paintMarqueeLine`, `marqueeWidth`, `paintMarqueeTracked` and `marqueeTrackedWidth` for text at its exact size, `paintMarqueeCard`, `paintMarqueeIcon` and `paintMarqueePhoto` for a card, an icon and a rounded photograph, `Lead` for the one thing a page lights (`data-marquee-lead`), `Ticket` and `ticketWidths` for the ticket stub, `SeededRandom`, `confettiPieces` and `Confetti` for confetti thrown where the board's generator threw it, `splitName`, `splitDot`, `splitSentence` and `glossBreak` for a line written "name：rest", "name · rest" or two sentences (the separator declared rather than printed, as on other faces), and `MARQUEE_SPEC` for the small type's exemption. The ticket's numbering, the claim, the standfirst and the source are in [marquee-shared.tsx](../src/layouts/marquee-shared.tsx). Any face can call them.

The tests draw every board page on rally and on homeroom and brief, two light themes that share nothing with it ([marquee.test.tsx](../src/layouts/compositions/marquee.test.tsx), [marquee-pages.test.tsx](../src/layouts/compositions/marquee-pages.test.tsx)), over a source line and without one, and check that each page lights one thing. The gallery's 构图 band has a rally page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `marquee-sheet` | the ordinary content page: the section's ticket stub at the top left, numbered by the engine, the claim bold at 34px, the body handed to the compositions in the marquee setting, the source in 12px type | [content-marquee-sheet.tsx](../src/layouts/content-marquee-sheet.tsx), [marquee-shared.tsx](../src/layouts/marquee-shared.tsx) | rally (every content kind but statement) | [design/faces/marquee-sheet](../design/faces/marquee-sheet/README.md) |
| `marquee-statement` | the one-line plan: a grey lead-in, the claim at 72px in the author's lines with its marked words in the accent, a rule, the touchpoints from `icon_cards`, two bands of confetti | [content-marquee-statement.tsx](../src/layouts/content-marquee-statement.tsx) | rally (statement) | [design/faces/marquee-statement](../design/faces/marquee-statement/README.md) |
| `marquee-cover` | the page's photograph darkened from the foot, the ticket stub with what the deck is and who brings it when, the title at 72px, a line in the accent, the facts as pills from `row_cards` | [cover-marquee-cover.tsx](../src/layouts/cover-marquee-cover.tsx) | rally | [design/faces/marquee-cover](../design/faces/marquee-cover/README.md) |
| `marquee-chapter` | the section's ticket stub, the title at 72px, what the section answers in the accent, a burst of confetti | [chapter-marquee-chapter.tsx](../src/layouts/chapter-marquee-chapter.tsx) | rally | [design/faces/marquee-chapter](../design/faces/marquee-chapter/README.md) |
| `marquee-ending` | the closing line at 72px over a photograph darkened from the foot, the next steps from a `timeline` on a dotted line, a button of the accent with the author's words from a `paragraph` | [ending-marquee-ending.tsx](../src/layouts/ending-marquee-ending.tsx) | rally | [design/faces/marquee-ending](../design/faces/marquee-ending/README.md) |

### Motif

`rally-motif` is redrawn: on content pages, seven strips of confetti at the top right, seeded by the page number with the board's own generator, and, when the deck asks for a footer, 「N / M」 at the bottom right with the office, the label and the notice at the bottom left. It paints the footer row itself. Board: [design/motifs/rally-motif](../design/motifs/rally-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `kicker` on a content and a chapter page, on the marquee faces | the section's name on the ticket stub, numbered by the order the names first appear | [marquee-shared.tsx](../src/layouts/marquee-shared.tsx) | [design/faces/marquee-sheet](../design/faces/marquee-sheet/README.md) |
| twelve columns and `bands` on `heatmap` | a year of months, and a run of them framed and named | [heatmap.ts](../src/ir/components/heatmap.ts), [heatmap.tsx](../src/components/heatmap.tsx) | [design/components/heatmap](../design/components/heatmap/README.md) |
| `bands` on `gantt` | a span of the axis tinted behind the bars and named under it | [gantt.ts](../src/ir/components/gantt.ts), [gantt.tsx](../src/components/gantt.tsx) | [design/components/gantt](../design/components/gantt/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A callout's icon reads on its panel | an icon whose variant colour would sit on the panel nearly unseen (an info callout's primary on a dark theme, a pale yellow tip on a light one) takes the readable ink | [callout.tsx](../src/components/callout.tsx) | none |
| A marked card and ring stand out on a dark primary | a marked numbered card fills in the text ink when the primary does not stand off the cards, and a marked progress ring takes the first ink that reads on the page | [numbered-cards.tsx](../src/components/numbered-cards.tsx), [progress-donuts.tsx](../src/components/progress-donuts.tsx) | none |
| A share bar names its crowded thin parts in a key | parts too narrow for their words and too close to name over the bar are named in a key under it, with a swatch each, and the totals follow under the key. The whole bar used to be declared dropped | [share-bar.tsx](../src/components/share-bar.tsx) | none |
| Tagged icon cards get a bento tile each | each tile sets its tag beside its icon. Kept whole, four tagged cards shared one tile and lost their words to its width | [bento-layout.ts](../src/render/bento-layout.ts), [icon-card-body.tsx](../src/components/icon-card-body.tsx) | none |
| A dashed outline exports dashed from any shape | a rect, a rounded rect, a circle or a path with a `stroke-dasharray` opens in PowerPoint dashed, not only a line | [style.ts](../src/pptx/svg2pptx/style.ts) | [design/compositions/season](../design/compositions/season/README.md) |
| A subpath after a close exports whole | a path that draws on after closing a shape starts again at the closed shape's first point, as in SVG. PowerPoint used to drop the whole path (the scale icon's pans) | [path.ts](../src/pptx/svg2pptx/path.ts) | none |
| The ticket's words are plain | a section name or a subheading with `**…**` marks prints on the stub without its asterisks | [marquee.tsx](../src/layouts/compositions/marquee.tsx) | none |

## proposal rooftop solar and storage proposal sample, 2026-10

The round drew proposal, the 25th built-in theme, to a nineteen-page Chinese and English proposal from a supplier to a manufacturer's management for rooftop solar and battery storage: what the client gets, how the new time-of-use bands change the sums in three provinces, what 1 MW of solar saves a year worked line by line, what the payback hangs on, the most a MWh of storage can earn in a day and why that figure is discounted, the four parts of the plan, three ways to pay, five public precedents, storage safety, five risks with their remedies, six steps to delivery, a quote laid out by cost line, the six papers the client hands over, and three decisions. Its decisions, the design system every proposal page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-06-proposal/`](../design/rounds/2026-10-06-proposal/README.md). The rules are restated for the next design session in [Designing for proposal](./design-proposal.md).

### Compositions

The compositions take a thirteenth `setting`, `binder` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a client proposal in a ring binder. Cards are sand on white paper with no outline, figures are petrol, bars and steps take the second petrol and the sky, and the brick red lights one thing a page with white on it.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `gains` | a line naming the offer, a card a thing the client gets with its figure, the marked figure in the brick red, a bar of the pale petrol | optionally a `verdict_banner`, a `kpi_cards` of two to four with icons, optionally a `callout`. The binder setting only | [gains.tsx](../src/layouts/compositions/gains.tsx) | proposal | [design/compositions/gains](../design/compositions/gains/README.md) |
| `hours` | a row a place, its day as runs of hours coloured by step with short names, the band framed in a dashed outline of the brick red, ticks, a key, each row's figure and prices | a `heatmap` of two or three rows, twelve to 24 columns and named `steps`, then a `kpi_cards` with one figure a row. The binder setting only | [hours.tsx](../src/layouts/compositions/hours.tsx) | proposal | [design/compositions/hours](../design/compositions/hours/README.md) |
| `regions` | a card a place with its line, its labelled rows, its figure large with an aside chip and a verdict chip, a block of petrol under them | a `comparison` of two to four columns with one marked row, optionally a `callout` with a title. The binder setting only | [regions.tsx](../src/layouts/compositions/regions.tsx) | proposal | [design/compositions/regions](../design/compositions/regions/README.md) |
| `workings` | the inputs as a ruled table with symbol discs and source chips, the working in a card, the answer on a block of the brick red, a line on what it leaves out | a `data_table` of four columns whose names lead with a symbol, a `kpi_cards` of two written "formula = figures", optionally a `callout`. The binder setting only | [workings.tsx](../src/layouts/compositions/workings.tsx) | proposal | [design/compositions/workings](../design/compositions/workings/README.md) |
| `levers` | bars on their side with the read case in the brick red and a reference in the sky, a card a lever, a box of what none of the figures deducts | a horizontal `bar` chart of one or two series, an `icon_cards` of two, optionally a `callout`. The binder setting only | [levers.tsx](../src/layouts/compositions/levers.tsx) | proposal | [design/compositions/levers](../design/compositions/levers/README.md) |
| `cycles` | the formula on a bar, a card a place with a line a cycle, the day's figure large and the year's range, a warning outlined in the brick red | a `callout` with a tag, a `comparison` of two columns whose rows are written "buy → sell：earns", a `callout` with a title. The binder setting only | [cycles.tsx](../src/layouts/compositions/cycles.tsx) | proposal | [design/compositions/cycles](../design/compositions/cycles/README.md) |
| `drift` | a row a measure with its icon and note, the old value faded, an arrow, the new value in petrol, a chip for the move | a `from_to` of three or four rows with icons, optionally a `callout`. The binder setting only | [drift.tsx](../src/layouts/compositions/drift.tsx) | proposal | [design/compositions/drift](../design/compositions/drift/README.md) |
| `parts` | a card a part with its photograph, a numbered disc and a tag chip, an unsettled part outlined dashed | an `image_grid` of two to four with icons and captions written "name：what". The binder setting only | [parts.tsx](../src/layouts/compositions/parts.tsx) | proposal | [design/compositions/parts](../design/compositions/parts/README.md) |
| `plans` | a card a way to pay with who it suits, a chip of the brick red, its figure large and its labelled rows, a bar of the pale petrol | a `comparison` of two to four columns with one marked row, optionally a `callout`. The binder setting only | [plans.tsx](../src/layouts/compositions/plans.tsx) | proposal | [design/compositions/plans](../design/compositions/plans/README.md) |
| `precedents` | a bar of sand a public record with its icon, scale, figure and source chip, the lead record with a brick-red edge, a title chip saying whose they are not | a `data_table` with a title and three unheaded columns, every row with an icon and a tag, optionally a `callout`. The binder setting only | [precedents.tsx](../src/layouts/compositions/precedents.tsx) | proposal | [design/compositions/precedents](../design/compositions/precedents/README.md) |
| `safeguards` | the rules and the lessons as two titled columns of cards, and who answers for what on a block of petrol | two titled `icon_cards` of two and an `insight_panel` of two to four rows. The binder setting only | [safeguards.tsx](../src/layouts/compositions/safeguards.tsx) | proposal | [design/compositions/safeguards](../design/compositions/safeguards/README.md) |
| `remedies` | a risk register under a 2px rule of petrol, each answer after a shield in the success ink, the lead risk on the brick red's tint | a `data_table` of three columns with an icon on the last and on every row. The binder setting only | [remedies.tsx](../src/layouts/compositions/remedies.tsx) | proposal | [design/compositions/remedies](../design/compositions/remedies/README.md) |
| `checkpoints` | a chain of arrows, a card a step with the paper it closes on and its rule, the dwelt-on step in the brick red, a bar of the pale petrol | a horizontal `timeline` of three to six written "what。label：paper", optionally a `callout`. The binder setting only | [checkpoints.tsx](../src/layouts/compositions/checkpoints.tsx) | proposal | [design/compositions/checkpoints](../design/compositions/checkpoints/README.md) |
| `quote` | one framed price sheet in groups, every amount a blank to fill, the lead row on the brick red's tint with its chip | two to four titled `data_table`s with the same columns, every row with an icon. The binder setting only | [quote.tsx](../src/layouts/compositions/quote.tsx) | proposal | [design/compositions/quote](../design/compositions/quote/README.md) |
| `papers` | a card a paper with a box to tick, its use and who holds it, a closing line under a rule of petrol | an `icon_cards` of two to six with tags, optionally a `callout`. The binder setting only | [papers.tsx](../src/layouts/compositions/papers.tsx) | proposal | [design/compositions/papers](../design/compositions/papers/README.md) |

The shared pieces are in [binder.tsx](../src/layouts/compositions/binder.tsx): `binderInks` for the inks, `binderText` and `binderMeta` for words that read on what they sit on, `fitBinder`, `paintBinder`, `paintBinderLine`, `binderWidth`, `paintBinderTracked` and `binderTrackedWidth` for text at its exact size, `paintBinderCard`, `paintChip`, `paintBinderIcon`, `paintBinderPhoto`, `paintCheckbox` and `edgePath` for a card, a chip, an icon, a photograph, a box to tick and a lead row's edge, `Lead` for the one thing a page lights (`data-binder-lead`), `BinderTabs`, `tabRun` and `tabsFit` for the binder's tabs, `splitName`, `splitSentence`, `splitDot`, `splitAside`, `leadGap`, `glossBreak`, `wholeMark` and `blankToFill` for the ways a line is written (the separator declared rather than printed, as on other faces), and `BINDER_SPEC` for the small type's exemption. The bars and closing lines a page ends on are in [binder-bars.tsx](../src/layouts/compositions/binder-bars.tsx), the claim, the standfirst, the label and the source in [binder-shared.tsx](../src/layouts/binder-shared.tsx). Any face can call them.

The tests draw every board page on proposal and on brief and rally, a light theme and a dark one that share nothing with it ([binder.test.tsx](../src/layouts/compositions/binder.test.tsx), [binder-pages.test.tsx](../src/layouts/compositions/binder-pages.test.tsx)), and check that each page lights one thing. The gallery's 构图 band has a proposal page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `binder-sheet` | the ordinary content page: the binder's tabs down the right edge with the page's section lit, the claim bold in petrol at 32px, the body handed to the compositions in the binder setting, the source in 12px type | [content-binder-sheet.tsx](../src/layouts/content-binder-sheet.tsx), [binder-shared.tsx](../src/layouts/binder-shared.tsx) | proposal (every content kind but statement and quote) | [design/faces/binder-sheet](../design/faces/binder-sheet/README.md) |
| `binder-cover` | a white proposal page beside the page's photograph: the date, a chip of the brick red naming the reader, the title at 50px, its line, three figures from `kpi_cards`, the footnote | [cover-binder-cover.tsx](../src/layouts/cover-binder-cover.tsx) | proposal | [design/faces/binder-cover](../design/faces/binder-cover/README.md) |
| `binder-chapter` | the page's photograph under petrol from the left, the section's number at 120px in the brick red, the title in white, the questions from `row_cards`, the tabs | [chapter-binder-chapter.tsx](../src/layouts/chapter-binder-chapter.tsx) | proposal | [design/faces/binder-chapter](../design/faces/binder-chapter/README.md) |
| `binder-ending` | the decisions from `numbered_cards` as cards with a box a choice, an item's own choices from `ballot.item_choices`, a button of the brick red with the author's words from a `paragraph` | [ending-binder-ending.tsx](../src/layouts/ending-binder-ending.tsx) | proposal | [design/faces/binder-ending](../design/faces/binder-ending/README.md) |

### Motif

`proposal-motif` is new: on content pages of a deck with a footer, the footer's label at the top left, its first part in petrol, and the page number at the bottom right at x1196, with the office and the notice at the bottom left. It paints the footer row itself. Board: [design/motifs/proposal-motif](../design/motifs/proposal-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `stage` on a content, chapter and ending page, with `course` on the deck | the page's tab lit among the binder's tabs | [binder-shared.tsx](../src/layouts/binder-shared.tsx) | [design/faces/binder-sheet](../design/faces/binder-sheet/README.md) |
| `steps`, `label_every`, 24 columns and a band's `icon` on `heatmap` | a day of hours coloured by named steps with a key, labels every so many columns, an icon before a band's name | [heatmap.ts](../src/ir/components/heatmap.ts), [heatmap.tsx](../src/components/heatmap.tsx) | [design/components/heatmap](../design/components/heatmap/README.md) |
| `icon` and `note` on a `from_to` row | a symbol before the row's name and its source under it | [from-to.ts](../src/ir/components/from-to.ts), [from-to.tsx](../src/components/from-to.tsx) | [design/components/from_to](../design/components/from_to/README.md) |
| `tag` on an `image_grid` picture | a chip at the picture's top right, an unsettled `basis` marking the part as optional | [image-grid.tsx](../src/components/image-grid.tsx) | [design/components/image_grid](../design/components/image_grid/README.md) |
| `title` and an item's `tone` on `icon_cards` | a small title over a set of cards, and a card's icon in its tone's ink | [icon-cards.tsx](../src/components/icon-cards.tsx) | [design/components/icon_cards](../design/components/icon_cards/README.md) |
| `item_choices` on the page's `ballot` | an item's own boxes, such as a pick among three ways to pay beside items voted for or against | [ir/index.ts](../src/ir/index.ts) | [design/faces/binder-ending](../design/faces/binder-ending/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| The audit reads turned text where it is drawn | the overflow walk follows each element's whole transform list, so a Latin tab name turned a quarter is checked down the page rather than reported off its right edge | [svg-audit.ts](../src/audit/svg-audit.ts) | none |
| A season leaves a stepped grid to the ordinary one | rally's `season` declines a heat grid in named steps, which it has no key for | [season.tsx](../src/layouts/compositions/season.tsx) | none |
| The JSON schema prints a shared tone and the page ballot once | `Tone` and `Ballot` sit under `$defs`, so the schema an agent reads stays inside its budget as fields grow | [json-schema.ts](../src/ir/json-schema.ts) | none |

## thesis retirement age thesis proposal sample, 2026-10

The round redrew thesis to an eighteen-page Chinese and English master's thesis proposal on how China's gradual rise in the statutory retirement age affects the employment of urban workers aged 50 to 60: the research question, the statutory ladder by date of birth, how far the reform has gone by the end of 2026, why it matters, the employment cliff at the old ages, six comparable studies abroad, where France's lost retirement went, four Chinese studies, the literature map and its gap, three hypotheses, the data gate, two identification designs, the threats, the schedule and four questions for the committee. Its decisions, the design system every thesis page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-06-thesis/`](../design/rounds/2026-10-06-thesis/README.md). The rules are restated for the next design session in [Designing for thesis](./design-thesis.md).

### Compositions

The compositions take a fourteenth `setting`, `manuscript` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): the pages of a thesis manuscript. Cards are manuscript white with a hairline on ivory paper, figures are emerald in the heading serif, gold draws only rules, dots and pale grounds, and figures and tables carry the number the face hands down (`ctx.exhibitLabels`).

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `inquiry` | a photograph with its numbered caption, the question large in emerald with its note's superscript, its terms as ruled rows | an `image`, a `paragraph` and a `bullets` of two to five written "name：what". The manuscript setting only | [inquiry.tsx](../src/layouts/compositions/inquiry.tsx) | thesis | [design/compositions/inquiry](../design/compositions/inquiry/README.md) |
| `ladder` | stepped lines by date of birth with a dot where each ends, a card a series with its range large and how it climbs | a titled `scatter` of one to three series joined as `steps`, a `kpi_cards` with an item a series. The manuscript setting only | [ladder.tsx](../src/layouts/compositions/ladder.tsx) | thesis | [design/compositions/ladder](../design/compositions/ladder/README.md) |
| `reach` | a row a group, where it stands now huge in emerald, a bar of the whole filled to now with a dashed tick where it stood, the three readings named, a closing line | an untitled horizontal `bar` of three series (earlier, now marked, whole), optionally a `callout`. The manuscript setting only | [reach.tsx](../src/layouts/compositions/reach.tsx) | thesis | [design/compositions/reach](../design/compositions/reach/README.md) |
| `backdrop` | two figures and a photograph down the left, a numbered line chart with its noted turns at the right, a reading under it | a `kpi_cards` of two, an `image`, a titled `line` of one series and a `paragraph`. The manuscript setting only | [backdrop.tsx](../src/layouts/compositions/backdrop.tsx) | thesis | [design/compositions/backdrop](../design/compositions/backdrop/README.md) |
| `thresholds` | one or two lines with every point valued, dashed gold thresholds named over the plot, a card a drop, a caution | a titled `line` with `markers`, a `kpi_cards` of one to three with notes, optionally a `paragraph`. The manuscript setting only | [thresholds.tsx](../src/layouts/compositions/thresholds.tsx) | thesis | [design/compositions/thresholds](../design/compositions/thresholds/README.md) |
| `tabulation` | a numbered open table, the marked column in emerald on the pale emerald, a row's tag as a chip, a caveat on the pale gold | a titled `data_table` of three to seven columns, optionally a `callout`. The manuscript setting only | [tabulation.tsx](../src/layouts/compositions/tabulation.tsx) | thesis | [design/compositions/tabulation](../design/compositions/tabulation/README.md) |
| `partition` | a dashed box of the whole that fell away over its parts laid end to end on one scale, the sum line, figures, a closing line | a titled horizontal `bar` of one negative and two to six positive bars that add up, optionally a `kpi_cards` and a `callout`. The manuscript setting only | [partition.tsx](../src/layouts/compositions/partition.tsx) | thesis | [design/compositions/partition](../design/compositions/partition/README.md) |
| `findings` | a card a study with its unit as a chip, authors and journal, data and method, the result large in emerald, unnumbered | a `kpi_cards` of two to four with icon, tag, source "authors · journal" and note, optionally a `callout`. The manuscript setting only | [findings.tsx](../src/layouts/compositions/findings.tsx) | thesis | [design/compositions/findings](../design/compositions/findings/README.md) |
| `coverage` | a numbered literature map, questions over the columns, sources down the rows, empty cells as dashed frames, the gap in gold, the gap stated under it | a titled `matrix` with `columns` and `rows`, optionally a `callout`. The manuscript setting only | [coverage.tsx](../src/layouts/compositions/coverage.tsx) | thesis | [design/compositions/coverage](../design/compositions/coverage/README.md) |
| `propositions` | a card a hypothesis with its label large, a gold direction icon, its expected sign as a chip and its basis, a photograph | an `icon_cards` of two to four titled "H1：claim" with tags, an `image`, optionally a `callout`. The manuscript setting only | [propositions.tsx](../src/layouts/compositions/propositions.tsx) | thesis | [design/compositions/propositions](../design/compositions/propositions/README.md) |
| `cadence` | survey rounds on lanes along a year axis, hollow dots for rounds not released, the span after a reform on the pale gold, the gate under it | a titled horizontal `timeline` with two `lanes` and one `periods` entry, a `callout` with a title and icon. The manuscript setting only | [cadence.tsx](../src/layouts/compositions/cadence.tsx) | thesis | [design/compositions/cadence](../design/compositions/cadence/README.md) |
| `designs` | a card a design with its sketch and its terms as ruled rows, when it can be done as a chip | a `comparison` of two columns written "name · when", two `sketch`es. The manuscript setting only | [designs.tsx](../src/layouts/compositions/designs.tsx) | thesis | [design/compositions/designs](../design/compositions/designs/README.md) |
| `hazards` | a numbered threats table, a row a threat with its icon, why it is dangerous and the answer, the lead threat on the pale gold | a titled `comparison` with a label column and two columns, every row with an icon. The manuscript setting only | [hazards.tsx](../src/layouts/compositions/hazards.tsx) | thesis | [design/compositions/hazards](../design/compositions/hazards/README.md) |
| `itinerary` | a row a piece of work with its stretch in words, a dashed bar for a stretch not settled, the gate as a gold line and diamond, a closing line | a `gantt` with a `range`, `axis_labels`, icons and periods on every row and one `milestones` entry, optionally a `callout`. The manuscript setting only | [itinerary.tsx](../src/layouts/compositions/itinerary.tsx) | thesis | [design/compositions/itinerary](../design/compositions/itinerary/README.md) |
| `queries` | a card a question with its label large, its icon, what it hangs on, a photograph | an `icon_cards` of two to four titled "Q1：question", an `image`. The manuscript setting only | [queries.tsx](../src/layouts/compositions/queries.tsx) | thesis | [design/compositions/queries](../design/compositions/queries/README.md) |

The shared pieces are in [manuscript.tsx](../src/layouts/compositions/manuscript.tsx): `manuscriptInks` for the inks, `manuscriptText` and `manuscriptMeta` for words that read on what they sit on, `fitManuscript`, `manuscriptWidth`, `paintManuscript`, `paintManuscriptLine`, `paintManuscriptTracked` and `manuscriptTrackedWidth` for text at its exact size with a note's superscript lit, `paintManuscriptCard`, `paintManuscriptChip`, `paintManuscriptIcon` and `paintManuscriptPhoto` for a card, a chip, an icon and a photograph, `Caption` for a figure's or table's number and title, `Aside` for a closing line with a gold bar, `inkBox` and `cutRule` for hairlines cut clear of the words on them, `splitLabel`, `splitSentenceEnd`, `splitMiddleDot`, `glossBreak`, `wholeMark` and `fitBroken` for the ways a line is written (the separator declared rather than printed), `figureText`, `withUnit` and `decimalsOf` for figures, and `MANUSCRIPT_SPEC` for the small type's exemption. The running head, the claim, the standfirst, the notes, the body band and the numbering across the deck are in [manuscript-shared.tsx](../src/layouts/manuscript-shared.tsx). Any face can call them.

The tests draw every board page on thesis and on brief and rally, a light theme and a dark one that share nothing with it ([manuscript.test.tsx](../src/layouts/compositions/manuscript.test.tsx), [manuscript-pages.test.tsx](../src/layouts/compositions/manuscript-pages.test.tsx)), and check that each page leads with one thing. The gallery's 构图 band has a thesis page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `manuscript-sheet` | the ordinary content page: the running head with the page's section in emerald over a gold rule, the claim at 30px in the heading serif ending on y150, the body handed to the compositions in the manuscript setting with figures and tables numbered across the deck, the page's sources as numbered notes | [content-manuscript-sheet.tsx](../src/layouts/content-manuscript-sheet.tsx), [manuscript-shared.tsx](../src/layouts/manuscript-shared.tsx) | thesis (every content kind but statement and quote) | [design/faces/manuscript-sheet](../design/faces/manuscript-sheet/README.md) |
| `manuscript-cover` | a title page beside the page's photograph: the deck's label over a gold rule, the title in emerald broken where the author broke it, a short gold rule, the report's `fields` on ruled lines, the footnote | [cover-manuscript-cover.tsx](../src/layouts/cover-manuscript-cover.tsx) | thesis | [design/faces/manuscript-cover](../design/faces/manuscript-cover/README.md) |
| `manuscript-chapter` | the page's photograph under ivory from the left, the section's number at 120px in emerald, the title, the subheading, the deck's contents with this section lit and each section's pages | [chapter-manuscript-chapter.tsx](../src/layouts/chapter-manuscript-chapter.tsx) | thesis | [design/faces/manuscript-chapter](../design/faces/manuscript-chapter/README.md) |
| `manuscript-ending` | the deck's label over a gold rule, the author's own small title (`kicker`), the points from `bullets` numbered in gold, a hairline, the closing line at 46px in emerald | [ending-manuscript-ending.tsx](../src/layouts/ending-manuscript-ending.tsx) | thesis | [design/faces/manuscript-ending](../design/faces/manuscript-ending/README.md) |

`thesis-plate-cover`, `folio-ghost-chapter` and `defense-close-ending`, thesis's earlier boundary faces, stay registered for any theme that names them.

### Motif

`rail-motif` is redrawn: on content pages of a deck with a footer, the footer's label at the top left of the running head, tracked, and the page number centred at the foot in the heading serif, with the office and the notice at the bottom left and the draft and confidentiality marks at the bottom right. It paints the footer row itself. Board: [design/motifs/rail-motif](../design/motifs/rail-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `stage` on a content and chapter page, with `course` on the deck | the page's section at the top right of the running head, its row lit in the section page's contents | [manuscript-shared.tsx](../src/layouts/manuscript-shared.tsx) | [design/faces/manuscript-sheet](../design/faces/manuscript-sheet/README.md) |
| `footnote` written one note a line | numbered notes over the folio, pointed to by superscripts in the text | [manuscript-shared.tsx](../src/layouts/manuscript-shared.tsx) | [design/faces/manuscript-sheet](../design/faces/manuscript-sheet/README.md) |
| `fields` on the cover, `kicker` on the ending | the report's fields on ruled lines, the close's own small title | [cover-manuscript-cover.tsx](../src/layouts/cover-manuscript-cover.tsx), [ending-manuscript-ending.tsx](../src/layouts/ending-manuscript-ending.tsx) | [design/faces/manuscript-cover](../design/faces/manuscript-cover/README.md) |
| `title` on `chart` | a short name over the chart, numbered where the face numbers figures | [chart.ts](../src/ir/components/chart.ts), [chart.tsx](../src/components/chart.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `note` on a `line` point, `markers` on a `line` chart, `steps` on a `scatter` series | a point's reading named beside it, a threshold drawn down the plot, a series joined as a staircase | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `title`, `columns`, `rows` and an item's `empty` on `matrix` | a numbered map with headed columns and rows, an empty cell as a dashed frame | [matrix.ts](../src/ir/components/matrix.ts), [matrix.tsx](../src/components/matrix.tsx) | [design/components/matrix](../design/components/matrix/README.md) |
| `status: "pending"` on a `timeline` milestone | a hollow dot for a step carried out and not yet released | [timeline.ts](../src/ir/components/timeline.ts), [timeline.tsx](../src/components/timeline.tsx) | [design/components/timeline](../design/components/timeline/README.md) |
| `milestones` and an item's `basis` on `gantt` | a moment drawn down the rows with a diamond, a stretch not settled as a dashed bar | [gantt.ts](../src/ir/components/gantt.ts), [gantt.tsx](../src/components/gantt.tsx) | [design/components/gantt](../design/components/gantt/README.md) |
| the `sketch` component | how an effect is told apart, a discontinuity or a difference in differences, drawn without figures | [sketch.ts](../src/ir/components/sketch.ts), [sketch.tsx](../src/components/sketch.tsx) | [design/components/sketch](../design/components/sketch/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A block prints its number where its face numbers exhibits | a titled block prints the number its face hands down before its title, a captioned image before its caption | [block-title.tsx](../src/components/block-title.tsx), [image.tsx](../src/components/image.tsx) | none |
| The audit reads a source of several lines as that many notes | a source drawn as numbered notes is not reported missing | [source-line.ts](../src/audit/source-line.ts) | none |
| A picture's caption paints its marks | the photo takeovers and the image read `**…**` in a caption rather than printing the asterisks | [caption-line.tsx](../src/render/caption-line.tsx) | none |
| A lone point on a line is a dot | a point that missing categories leave alone is drawn as a dot in its series' colour | [chart-svg.tsx](../src/components/chart-svg.tsx) | none |
| A counting axis names every k-th point | a line or area chart whose categories count evenly names every k-th one instead of cutting each to a stub when the room between points is too small | [chart-svg.tsx](../src/components/chart-svg.tsx) | none |
| The JSON schema prints the page's kicker, fields, stamp and stage once | `Kicker`, `Fields`, `Stamp` and `Stage` sit under `$defs`, so the schema stays inside its budget | [json-schema.ts](../src/ir/json-schema.ts) | none |

## journal annual letter to readers sample, 2026-10

The round redrew journal to an eighteen-page Chinese and English annual letter from a small magazine to its subscribers, reading ten years of China's national reading survey: the editor's note, ten years of readers and books, the ways people now read, minutes a day on print and on phones, periodicals falling hardest, why people say they do not read, heavy readers, the gaps between town and country and between children and adults, the book trade, where books are sold, libraries, how other countries ask the question, print against screens, a long read, the editors' four plans and an afterword. Its decisions, the design system every journal page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-07-journal/`](../design/rounds/2026-10-07-journal/README.md). The rules are restated for the next design session in [Designing for journal](./design-journal.md).

### Compositions

The compositions take a fifteenth `setting`, `periodical` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): the pages of a small magazine. Bars are lead black on magazine paper, the one lead is the accent, every figure carries the number the face hands down (`ctx.exhibitLabels`) with the editor's comment under it, and the composition places the page's claim itself (`claim` on `CompositionProps`), over the body or beside a photograph that runs up to the masthead.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `foreword` | the editor's note with its first character dropped three lines deep, two or three figures in a column past a hairline | a `paragraph` with no marked runs, a `kpi_cards` of two or three with symbols and notes. The periodical setting only | [foreword.tsx](../src/layouts/compositions/foreword.tsx) | journal | [design/compositions/foreword](../design/compositions/foreword/README.md) |
| `chronicle` | a line a series from zero, the lead in ink and the rest in grey, both ends valued, a noted point ringed, the numbered caption and comment | a titled `line` of one to three series over three to fifteen categories, optionally a `callout`. The periodical setting only | [chronicle.tsx](../src/layouts/compositions/chronicle.tsx) | journal | [design/compositions/chronicle](../design/compositions/chronicle/README.md) |
| `measures` | a row a way with its symbol, name, bar and figure, the marked row in the accent, a photograph at the right | a titled horizontal `bar` of one series of two to five points with symbols, optionally a `callout` and an `image`. The periodical setting only | [measures.tsx](../src/layouts/compositions/measures.tsx) | journal | [design/compositions/measures](../design/compositions/measures/README.md) |
| `elapsed` | a photograph up to the masthead with the claim beside it, a row a habit with its bar now and a dashed cut where it stood, a key of the two years, a closing paragraph | an `image`, an untitled horizontal `bar` of two series (earlier, now) over one to three categories with symbols and notes, a `paragraph`. The periodical setting only | [elapsed.tsx](../src/layouts/compositions/elapsed.tsx) | journal | [design/compositions/elapsed](../design/compositions/elapsed/README.md) |
| `headline` | one figure at 200px in the accent beside a small line chart from zero, broken at a gap, every year named | a `kpi_cards` of one, a titled `line` of one to three series with gaps allowed, optionally a `callout`. The periodical setting only | [headline.tsx](../src/layouts/compositions/headline.tsx) | journal | [design/compositions/headline](../design/compositions/headline/README.md) |
| `witness` | a photograph up to the masthead, the claim beside it, figures in a row over a pull quote in the accent | an `image`, a `kpi_cards` of two or three, a `blockquote` with no attribution. The periodical setting only | [witness.tsx](../src/layouts/compositions/witness.tsx) | journal | [design/compositions/witness](../design/compositions/witness/README.md) |
| `census` | a bar a year with dashed places for the years nobody published, two cards at the right | a titled upright `bar` of one series with gaps, optionally a `callout`, a `kpi_cards` of one or two. The periodical setting only | [census.tsx](../src/layouts/compositions/census.tsx) | journal | [design/compositions/census](../design/compositions/census/README.md) |
| `contrast` | pairs of bars a year with a dashed place for a gap, a card about a third group | a titled upright `bar` of two series with gaps, optionally a `callout`, a `kpi_cards` of two. The periodical setting only | [contrast.tsx](../src/layouts/compositions/contrast.tsx) | journal | [design/compositions/contrast](../design/compositions/contrast/README.md) |
| `bracket` | a run of bars with its change bracketed and its basis over it, a column of figures with the lead larger | a titled upright `bar` of one series with one `changes` entry, a `kpi_cards` of two to four, optionally a `callout` and a `paragraph`, either order. The periodical setting only | [bracket.tsx](../src/layouts/compositions/bracket.tsx) | journal | [design/compositions/bracket](../design/compositions/bracket/README.md) |
| `mix` | shares by column with every value printed, a photograph and a share bar at the right | a titled `percent_stacked`, optionally a `callout`, an `image`, a share bar, optionally a `paragraph`. The periodical setting only | [mix.tsx](../src/layouts/compositions/mix.tsx) | journal | [design/compositions/mix](../design/compositions/mix/README.md) |
| `twins` | two bar charts side by side, each on its own scale, one caption for both | two upright `bar`s of one series each with one shared title, optionally a `callout`. The periodical setting only | [twins.tsx](../src/layouts/compositions/twins.tsx) | journal | [design/compositions/twins](../design/compositions/twins/README.md) |
| `parallel` | an open table of findings that answer different questions, a closing line that forbids a ranking | an untitled four-column `data_table` of two to five rows, a `callout`. The periodical setting only | [parallel.tsx](../src/layouts/compositions/parallel.tsx) | journal | [design/compositions/parallel](../design/compositions/parallel/README.md) |
| `effects` | effect sizes from two studies on one scale with a zero line, each side named, values with their signs | an untitled horizontal `bar` of one or two series with two `bands` that meet at zero, optionally a `callout`. The periodical setting only | [effects.tsx](../src/layouts/compositions/effects.tsx) | journal | [design/compositions/effects](../design/compositions/effects/README.md) |
| `longform` | two paragraphs side by side in the heading serif under a pull quote in the accent | two `paragraph`s and a `blockquote` with no attribution. The periodical setting only | [longform.tsx](../src/layouts/compositions/longform.tsx) | journal | [design/compositions/longform](../design/compositions/longform/README.md) |
| `pledges` | a ruled row a plan numbered 一 to 四 (1 to 4 outside Chinese) with its symbol and why, a photograph | an untitled `icon_cards` of two to four, an `image`, optionally a `callout`. The periodical setting only | [pledges.tsx](../src/layouts/compositions/pledges.tsx) | journal | [design/compositions/pledges](../design/compositions/pledges/README.md) |

The shared pieces are in [periodical.tsx](../src/layouts/compositions/periodical.tsx): `periodicalInks` for the inks, `periodicalText`, `periodicalMeta` and `periodicalMark` for words and marks that read on what they sit on, `fitPeriodical`, `periodicalWidth`, `paintPeriodical`, `paintPeriodicalLine`, `paintPeriodicalTracked` and `periodicalTrackedWidth` for text at its exact size, `paintPeriodicalIcon` and `paintPeriodicalPhoto` with `fitPhotoCaption` for a symbol and a photograph with its plain caption, `fitFigCaption` and `FigCaption` for a figure's number, title and comment, `jointLabel` for two figures under one caption, `figureWidth` and `paintFigure` for a figure with its unit, `niceTop`, `writtenValue`, `decimalsIn`, `fixedValue` and `withUnitText` for figures as the author wrote them, `placeClaim` for the claim in the column a composition gives it, `quoteMarkFamily` for a quotation mark in the deck's face, `cjkOnly` for tracking Chinese wide, and `PERIODICAL_SPEC` for the small type's exemption. The masthead, the claim, the standfirst, the source, the bands and what counts as a figure are in [periodical-shared.tsx](../src/layouts/periodical-shared.tsx). Any face can call them.

The tests draw every board page on journal and on brief and rally, a light theme and a dark one that share nothing with it ([periodical.test.tsx](../src/layouts/compositions/periodical.test.tsx), [periodical-pages.test.tsx](../src/layouts/compositions/periodical-pages.test.tsx)), and check that each page leads with one thing and prints every word the author wrote. The gallery's 构图 band has a journal page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `periodical-sheet` | the ordinary content page: the masthead with the page's section in the accent over a heavy rule and a hairline, the claim at 32px in the heading serif ending on y158, the body handed to the compositions in the periodical setting with figures numbered across the deck, the source at the foot | [content-periodical-sheet.tsx](../src/layouts/content-periodical-sheet.tsx), [periodical-shared.tsx](../src/layouts/periodical-shared.tsx) | journal (every content kind but statement and quote) | [design/faces/periodical-sheet](../design/faces/periodical-sheet/README.md) |
| `periodical-cover` | a magazine's cover beside the page's photograph: the masthead at 96px over a heavy rule and a hairline, the issue, the cover story in the accent, the cover lines (`fields`) with the pages they point to, the footnote | [cover-periodical-cover.tsx](../src/layouts/cover-periodical-cover.tsx) | journal | [design/faces/periodical-cover](../design/faces/periodical-cover/README.md) |
| `periodical-quote` | the masthead, whose words these are in a small line in the accent, a huge quotation mark, the words at 40/64 a sentence a line, the attribution exactly as written under a short rule, the source | [content-periodical-quote.tsx](../src/layouts/content-periodical-quote.tsx) | journal (quote) | [design/faces/periodical-quote](../design/faces/periodical-quote/README.md) |
| `periodical-ending` | the masthead with the page's own section, the closing words at 44/74 as the author broke them, the sign-off right-aligned under a rule | [ending-periodical-ending.tsx](../src/layouts/ending-periodical-ending.tsx) | journal | [design/faces/periodical-ending](../design/faces/periodical-ending/README.md) |

`issue-head-cover`, `afterword-ending` and `pull-quote`, journal's earlier cover, close and quotation faces, stay registered for any theme that names them. The cover and the close now appear in the gallery's appendix of faces no menu offers.

### Motif

`corner-ornament-motif` is redrawn (v3): on content pages of a deck with a footer, the column's name at the top left of the masthead and the issue at the top right, and the folio 「· 3 ·」 centred at the foot, with the office and the notice at the bottom left and the draft and confidentiality marks at the bottom right. It paints the footer row itself. Board: [design/motifs/corner-ornament-motif](../design/motifs/corner-ornament-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `kicker` on a content page and the ending | the page's section in the accent in the middle of the masthead | [periodical-shared.tsx](../src/layouts/periodical-shared.tsx) | [design/faces/periodical-sheet](../design/faces/periodical-sheet/README.md) |
| `fields` on the cover, `subheading` on the ending | the cover lines with their pages, the sign-off as the author breaks it | [cover-periodical-cover.tsx](../src/layouts/cover-periodical-cover.tsx), [ending-periodical-ending.tsx](../src/layouts/ending-periodical-ending.tsx) | [design/faces/periodical-cover](../design/faces/periodical-cover/README.md) |
| `icon` on a point of a bar chart on its side | a symbol before the category's name | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `gaps` on an upright bar or a line chart | a dashed place for a value nobody published, a break in the line | [chart.ts](../src/ir/components/chart.ts), [chart-model.ts](../src/components/chart-model.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |
| `bands` on a bar chart on its side | value ranges tinted down the rows and named over the plot | [chart.ts](../src/ir/components/chart.ts), [chart-svg.tsx](../src/components/chart-svg.tsx) | [design/components/chart](../design/components/chart/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A composition places the claim | the face hands the page's claim to the composition (`claim` on `CompositionProps`), which sets it over the body or in the column beside a photograph | [shared.tsx](../src/layouts/compositions/shared.tsx), [periodical.tsx](../src/layouts/compositions/periodical.tsx) | none |
| Compose leaves a chart with a symbol, a gap or a side band to the compositions that draw them | a composition that does not draw `icon`, `gaps` or `bands` on a bar on its side never takes such a chart | [index.ts](../src/layouts/compositions/index.ts) | none |
| No bar turns red for being the tallest | the periodical sheet hands the component renderer a palette without the accent, so only what the author marks is brick red | [content-periodical-sheet.tsx](../src/layouts/content-periodical-sheet.tsx) | none |
| A face counts its own figures | `exhibitLabels` takes the face's own rule for what counts as a figure | [manuscript-shared.tsx](../src/layouts/manuscript-shared.tsx) | none |

## ink intangible heritage public lecture sample, 2026-10

The round redrew ink to an eighteen-page Chinese and English public lecture from a cultural lecture hall on how China's intangible heritage lives on today: the figures it opens on, what the law counts as heritage, the four tiers of lists, the 45 elements on UNESCO's lists year by year, Yimakan's fourteen years, how China's count stands on UNESCO's country pages, the ten categories, six batches of national bearers beside the counts that must not be added, the ages of the batch named in 2018, the bearers who died before their record was done, workshops, training and schools, the first Spring Festival holidays after inscription, the problems on record, five things to do and the close. Its decisions, the design system every ink page follows, and every place the engine departs from the board are in [`design/rounds/2026-10-07-ink/`](../design/rounds/2026-10-07-ink/README.md). The rules are restated for the next design session in [Designing for ink](./design-ink.md).

### Compositions

The compositions take a sixteenth `setting`, `scroll` (`CompositionSetting` in [shared.tsx](../src/layouts/compositions/shared.tsx)): a public lecture hung as a scroll. Words are in the ink on rice paper, whatever is told apart by depth takes a ramp of greys from burnt ink toward the paper, the accent goes to one thing a page, nothing is slanted, and Chinese may stand upright down a column with its punctuation in vertical form. The composition places the page's claim (`claim` on `CompositionProps`, now with a `size` and a `foot` for a larger claim beside a photograph) and the page's source (`source` on `CompositionProps`, new) itself, over the body or beside a photograph that runs the height of the page.

New:

| composition | what it draws | takes | code | used by | board |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `opening` | two to four figures side by side past hairlines, each with its symbol, what it counts and when, over the line the speaker reads | a `kpi_cards` of two to four with labels, optionally a `paragraph`. The scroll setting only | [opening.tsx](../src/layouts/compositions/opening.tsx) | ink | [design/compositions/opening](../design/compositions/opening/README.md) |
| `strata` | a pyramid of tiers on a ramp of greys with each tier's name and figure in its band, a summing line under it, the system's other parts as ruled rows beside it | a `pyramid` of three to six layers, an `icon_cards` of two to four with symbols, optionally a `paragraph`. The scroll setting only | [strata.tsx](../src/layouts/compositions/strata.tsx) | ink | [design/compositions/strata](../design/compositions/strata/README.md) |
| `handscroll` | years to scale with named spans as bands, every milestone's name in one of three rows clear of the others and of every stem, the running count as a staircase under it named at its steepest step and its end | a horizontal `timeline` of two to twelve milestones dated by year with up to three `periods`, optionally a `scatter` of one series with `steps`. The scroll setting only | [handscroll.tsx](../src/layouts/compositions/handscroll.tsx) | ink | [design/compositions/handscroll](../design/compositions/handscroll/README.md) |
| `revival` | a photograph the height of the page, the claim beside it, a figure then and a figure now with an arrow between them, the story and an upright caution | an `image`, a `kpi_cards` of two, a `paragraph`, optionally a `callout` with words alone. The scroll setting only | [revival.tsx](../src/layouts/compositions/revival.tsx) | ink | [design/compositions/revival](../design/compositions/revival/README.md) |
| `nations` | a row a country with its bar and figure, the marked one in the accent, a card beside it that says how they were counted | an untitled bar chart on its side of one series of three to ten points, a `callout` with a title. The scroll setting only | [nations.tsx](../src/layouts/compositions/nations.tsx) | ink | [design/compositions/nations](../design/compositions/nations/README.md) |
| `genres` | two counts of the same categories as twin bars, each on its own scale under its own name, the marked point and the line about it in the accent | an untitled bar chart on its side of two series over three to ten categories, optionally a `callout` with words alone. The scroll setting only | [genres.tsx](../src/layouts/compositions/genres.tsx) | ink | [design/compositions/genres](../design/compositions/genres/README.md) |
| `bases` | counts as upright bars under their title, an open table of totals each from its own count beside them, why they must not be added under it | a titled upright bar chart of one series of two to eight points, a `data_table` of three or four columns with one of figures and two to five rows, optionally a `paragraph`. The scroll setting only | [bases.tsx](../src/layouts/compositions/bases.tsx) | ink | [design/compositions/bases](../design/compositions/bases/README.md) |
| `ages` | a share bar of groups from young to old on a ramp, each part named inside it or under the bar, the marked run bracketed with the author's words, a row of figures under it | a share bar of three to six series with a marked run and an `emphasis_label`, a `kpi_cards` of two to four. The scroll setting only | [ages.tsx](../src/layouts/compositions/ages.tsx) | ink | [design/compositions/ages](../design/compositions/ages/README.md) |
| `archive` | a photograph the height of the page, the claim beside it, two figures, a progress bar with each part named inside it, a closing line | an `image`, a `kpi_cards` of two, a share bar of two or three series with one marked, optionally a `paragraph`. The scroll setting only | [archive.tsx](../src/layouts/compositions/archive.tsx) | ink | [design/compositions/archive](../design/compositions/archive/README.md) |
| `scenes` | two to four photographs in a row with their symbols and names, a row of figures under them each with its own source | an `image_grid` of two to four with captions, a `kpi_cards` of two to four. The scroll setting only | [scenes.tsx](../src/layouts/compositions/scenes.tsx) | ink | [design/compositions/scenes](../design/compositions/scenes/README.md) |
| `daily` | a photograph the height of the page, the claim beside it, an open table that compares by the day with the figure it turns on in the accent, the reading, an aside on a wash | an `image`, a `data_table` of three to five columns and one to four rows, optionally a `paragraph` and a `callout` with words alone. The scroll setting only | [daily.tsx](../src/layouts/compositions/daily.tsx) | ink | [design/compositions/daily](../design/compositions/daily/README.md) |
| `excerpts` | a ruled row a finding: its symbol and name, the record's own words, and where they come from in small grey type | an untitled `icon_cards` of two to four with symbols and plain tags. The scroll setting only | [excerpts.tsx](../src/layouts/compositions/excerpts.tsx) | ink | [design/compositions/excerpts](../design/compositions/excerpts/README.md) |
| `glyphs` | a column a thing to do, its one word huge and what it means under it, upright and read from the right in Chinese, across in Latin | a `row_cards` of three to six, every card with a title and words. The scroll setting only | [glyphs.tsx](../src/layouts/compositions/glyphs.tsx) | ink | [design/compositions/glyphs](../design/compositions/glyphs/README.md) |
| `statute` | a passage of law upright in columns of fourteen characters with a cinnabar bar at its head and its attribution in a column of its own, across the band in Latin | one `blockquote` with an attribution. The scroll setting only | [statute.tsx](../src/layouts/compositions/statute.tsx) | ink (`scroll-quote`) | [design/compositions/statute](../design/compositions/statute/README.md) |

The shared pieces are in [scroll.tsx](../src/layouts/compositions/scroll.tsx): `scrollInks` and `scrollRamp` for the inks and the ramp of greys, `scrollText`, `scrollMeta` and `scrollMark` for words and marks that read on what they sit on, `fitScroll`, `scrollWidth`, `paintScroll`, `paintScrollLine`, `paintScrollTracked` and `scrollTrackedWidth` for text at its exact size, `uprightText`, `fitVertical`, `paintVertical`, `verticalForm` and `horizontalForm` for Chinese standing upright with its punctuation in vertical form and read back as written, `fitTurned`, `paintTurned`, `fitColumnLabel`, `paintColumnLabel` and `joinColumnLabels` for a label down a column that stands upright in Chinese and turns a quarter in Latin, `paintSeal` for a seal, `scrollFigureWidth`, `paintScrollFigure` and `figureBaseline` for a figure with its unit, `scrollValue` for a value grouped the deck's way, `nameAndCount` and `wholeLit` for names and marks, `paintScrollIcon`, `paintScrollPhoto`, `ScrollPhoto`, `fitPhotoNote` and `ScrollWash` for a symbol, a photograph with its white note and a wash, `placeScrollClaim` and `placeScrollSource` for the claim and the source in the column a composition gives them, and `SCROLL_SPEC` and `SCROLL_META` for the small type's exemption and the 3:1 meta tier. The margins, the claim and the source are in [scroll-shared.tsx](../src/layouts/scroll-shared.tsx). Any face can call them.

The tests draw every board page on ink and on brief and rally, a light theme and a dark one that share nothing with it ([scroll.test.tsx](../src/layouts/compositions/scroll.test.tsx), [scroll-pages.test.tsx](../src/layouts/compositions/scroll-pages.test.tsx)), and check that each page leads with one thing and prints every word the author wrote. The gallery's 构图 band has an ink page for every new composition.

### Faces

| face | what it is | code | used by | board |
| :-- | :-- | :-- | :-- | :-- |
| `scroll-sheet` | the ordinary content page: the volume upright in the accent down the left margin, the claim at 34px in the heading face ending on y152, the body handed to the compositions in the scroll setting, the source at the foot | [content-scroll-sheet.tsx](../src/layouts/content-scroll-sheet.tsx), [scroll-shared.tsx](../src/layouts/scroll-shared.tsx) | ink (every content kind but statement and quote) | [design/faces/scroll-sheet](../design/faces/scroll-sheet/README.md) |
| `scroll-quote` | a passage set upright by `statute`, what the speaker draws from it upright in the accent at the far left, the source at the foot | [content-scroll-quote.tsx](../src/layouts/content-scroll-quote.tsx) | ink (quote) | [design/faces/scroll-quote](../design/faces/scroll-quote/README.md) |
| `scroll-cover` | a title slip hung beside the page's photograph: the title upright with a seal (`stamp`) at its foot, the subtitle, the hall with the `kicker` and the date in columns beside it, a widened strip with the title across it in Latin | [cover-scroll-cover.tsx](../src/layouts/cover-scroll-cover.tsx) | ink | [design/faces/scroll-cover](../design/faces/scroll-cover/README.md) |
| `scroll-chapter` | a volume opens beside a tall painting in its mount: the volume number (`kicker`) upright in the accent, the name over a stroke of ink | [chapter-scroll-chapter.tsx](../src/layouts/chapter-scroll-chapter.tsx) | ink | [design/faces/scroll-chapter](../design/faces/scroll-chapter/README.md) |
| `scroll-ending` | the closing words upright a clause a column over a veiled photograph, the hall and the date beside them, a seal (`stamp`), the day to remember (`subheading`) at the bottom left | [ending-scroll-ending.tsx](../src/layouts/ending-scroll-ending.tsx) | ink | [design/faces/scroll-ending](../design/faces/scroll-ending/README.md) |

`vertical-title-cover`, `volume-slip-chapter` and `seal-close-ending`, ink's earlier cover, chapter and close, stay registered for any theme that names them and now appear in the gallery's appendix of faces no menu offers. ink's points, list, comparison, process, data, photo, fact and hierarchy pages leave `quiet-frame`, `bento-panel`, `two-column`, `rail-numbered`, `split-band`, `image-split`, `stat-hero` and `asymmetric-triptych` for `scroll-sheet`, and its quote leaves `pull-quote` for `scroll-quote`. The statement page keeps `statement`.

### Motif

`ink-motif` is redrawn (v2): on every content page the scroll's two edges at x70 and x1210, and on content pages of a deck with a footer the hall and the date upright down the right margin (the deck's `organization` and the footer's `label`, turned a quarter in Latin) and the folio against the right edge, with the notice at the bottom left and the draft and confidentiality marks before the folio. It paints the footer row itself. The cover's half mountain, the content pages' organization column with its small seal and the close's half mountain are retired. Board: [design/motifs/ink-motif](../design/motifs/ink-motif/README.md).

### Page and component fields

| field | what it does | code | board |
| :-- | :-- | :-- | :-- |
| `kicker` on every ink content page | the volume the page belongs to, upright in the accent down the left margin | [scroll-shared.tsx](../src/layouts/scroll-shared.tsx) | [design/faces/scroll-sheet](../design/faces/scroll-sheet/README.md) |
| `stamp` on the cover and the ending | the seal's character, or the hall's first character when the page names none | [cover-scroll-cover.tsx](../src/layouts/cover-scroll-cover.tsx), [ending-scroll-ending.tsx](../src/layouts/ending-scroll-ending.tsx), [scroll.tsx](../src/layouts/compositions/scroll.tsx) (`paintSeal`) | [design/faces/scroll-cover](../design/faces/scroll-cover/README.md) |
| `background` on the chapter | a tall painting in its mount beside the volume number, instead of the shared photo chapter | [chapter-scroll-chapter.tsx](../src/layouts/chapter-scroll-chapter.tsx) | [design/faces/scroll-chapter](../design/faces/scroll-chapter/README.md) |

### Engine behaviour

| behaviour | what it does | code | board |
| :-- | :-- | :-- | :-- |
| A composition places the source | the face hands the page's source to the composition (`source` on `CompositionProps`), which sets it at the foot or under the column beside a photograph, and declines when it does not fit | [shared.tsx](../src/layouts/compositions/shared.tsx), [scroll.tsx](../src/layouts/compositions/scroll.tsx) | none |
| A larger claim beside a photograph | `claim` takes an optional `size` and `foot`, so a board that sets the claim larger beside a photograph can say so | [shared.tsx](../src/layouts/compositions/shared.tsx), [scroll-shared.tsx](../src/layouts/scroll-shared.tsx) | none |
| Compose leaves detail to the compositions that draw it | a timeline's `periods`, a chart's `steps`, a titled callout, a run label, a chart title and a table column's mark are offered to `handscroll`, `nations`, `ages`, `archive`, `bases` and `daily` as well as the compositions that drew them before | [index.ts](../src/layouts/compositions/index.ts) | none |
| Upright Chinese sets its punctuation in vertical form | a comma or a full stop in the upper right of its cell, brackets and title marks in their vertical forms, an ellipsis turned, in the scroll faces and in ink's `statement` | [scroll.tsx](../src/layouts/compositions/scroll.tsx), [sparse/ink.tsx](../src/layouts/sparse/ink.tsx) | [design/compositions/statute](../design/compositions/statute/README.md) |
| The fidelity check reads vertical forms back | the gallery's text check maps 「︽」 back to 「《」 and the other vertical forms to what the author wrote | [fidelity.ts](../evals/gallery/fidelity.ts) | none |
| An English deck's YaHei text has Western quotes | Microsoft YaHei sets ‘ ’ “ ” on the full em, and PowerPoint paints them from the run's Latin face, so an English sentence in YaHei opened with a gap the width of a Chinese character beside every quote. A deck not written in Chinese (`deckWritesChinese`) now sets YaHei text in Microsoft YaHei UI, the same font's Western cut, as its Latin face, with YaHei kept as its East Asian face: the same glyphs and advances but those four marks (0.38em and 0.23em). A Chinese deck keeps YaHei in both slots, so its quotes stay on the full em. SimSun, SimHei, KaiTi and FangSong have no Western cut and are left as they are | [fonts.ts](../src/render/fonts.ts) (`WESTERN_CUT`), [svg-text-layout.ts](../src/lib/svg-text-layout.ts), [symbol-advances.ts](../src/lib/symbol-advances.ts), [baseline.ts](../src/pptx/svg2pptx/baseline.ts) | none |
| A paired KaiTi heading previews in Kaiti SC | a heading face that pairs a Latin face with KaiTi falls back to Kaiti SC or STKaiti in the preview, where KaiTi is missing | [fonts.ts](../src/render/fonts.ts) | none |
| The scroll's small type is an approved size | labels, notes, the margins, the source and the folio at 11 to 15px carry the `scroll-spec` exemption the L1 audit knows | [l1.ts](../evals/gallery/l1.ts) | none |
