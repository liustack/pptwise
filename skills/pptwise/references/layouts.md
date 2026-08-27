# Layouts and pins

Read this when pinning a `layout`, including climax, quote, and evidence sparse pages.

### Sparse pin-only layouts

The generated catalog below is the complete pin-only inventory. The seven layouts described here are the sparse speaking surfaces that need extra writing guidance. None appears through ordinary auto-selection. Set `layout` explicitly every time you want one. `validate` hard-errors if a pin-only content layout carries more components than its declared capacity (an ordinary layout pinned over capacity only warns).

`quote-stage` is a thesis page on a content slide: one short, powerful heading is the entire visual, with at most one short attribution component (a source, a name, a one-line follow-up). Zero components is legitimate — a pure quote needs no attribution. This one still draws the theme's brand footer and motif.

`statement` is a whole-page verse or epigram on a content slide. At most one component, rendered as a small source line (quote / paragraph / citation), never as a card. Optional kicker from the preceding chapter. Brand footer and logo stay off. The theme motif still paints. The face is theme-specific (a boarded theme is not the generic italic 500 lines).

`pull-quote` is a quotation page on a content slide: heading, source line, optional muted paragraph. Source comes from a quote component's `attribution` when present, otherwise `subheading`. Brand footer and logo stay off. The theme motif still paints.

`verse-chapter` is a centered verse as a chapter open (`type: "chapter"`). Tracking chapter-index kicker, 2-line heading, optional italic subheading. No watermark numeral, no body, no footnote — the usual chapter boundary still applies. Logo stays off. The theme motif still paints.

`stat-hero` is a whole-page number on a content slide. The hero value comes from the first `kpi_cards` item when present, otherwise the heading. One caption line, optional source. At most one component. Brand footer and logo stay off. The theme motif still paints.

`one-evidence` is an assertion-plus-evidence page on a content slide. Heading is a full-sentence claim. At most one component, rendered as the evidence (a chart, table, or image). Brand footer and logo stay off. The theme motif still paints.

`mono-bleed` is a full-bleed brand-color field on a content slide, type as the picture. Capacity 0: write the words in the heading, no body component. Brand footer and logo stay off. The theme motif still paints.

### Sparse-page contract

A deck is for speaking. Extra words that will not fit on the slide go in `slide.notes`. If the file must stand alone as a document, recommend a PDF rather than packing the canvas.

This is not a new `pacing` value. The enum stays `dense` / `balanced` / `spacious`. The contract is pin-only layouts, `notes`, and deck `branding`.

Climax, quote, and evidence pages pin a sparse pin-only layout when the theme offers it. Name it: `statement`, `pull-quote`, `verse-chapter`, `stat-hero`, `one-evidence`, `mono-bleed`. Do not leave those pages to auto-selection. A page that truly is one sentence still gets this pin even when pacing is `dense`. crayon, classroom, enterprise, pulse, runway, and ember do not offer these layouts. If `validate` warns that the pin is not a sparse page this theme offers, drop the pin and write a regular content page.

When the interview or request chose `spacious`: tighten the on-slide budget. Heading is the visual. At most one body component on a pinned sparse page (a source line, a single number, a single chart or table). Zero bullets on those pages. Split instead of stacking.

When `balanced` or `dense`: write to the pacing budget. Still pin a sparse layout when a page is one sentence, one number, one quote, or one piece of evidence.

The spoken script goes in `slide.notes`. `render` exports it as native PowerPoint speaker notes (View → Notes, Presenter View). Never draw the script onto the canvas.

Branding omit/full lives in `references/branding.md`.

Use the generated table below for every standard layout, including all pin-only cover, chapter, content, and ending faces. Its capacity and slots come from the same registry used by `pptwise layouts --json`.

<!-- generated:begin layouts -->
### Complete standard-layout catalog

This section is generated from the layout registry and each layout's slot metadata. `capacity` is the sum of declared slot capacities. `n/a` means the layout declares no countable capacity.

#### Cover

| id | pinOnly | capacity | one-sentence use |
| --- | --- | ---: | --- |
| `banner-title` | no | n/a | Provides `kicker`, `meta`, `heading`, `rule`, and `subheading` slots. |
| `poster-center` | no | n/a | Provides `heading`, `rule`, `subheading`, and `meta` slots. |
| `left-anchor` | no | n/a | Provides `kicker`, `decor`, `heading`, `meta`, `subheading`, and `rule` slots. |
| `constellation` | no | n/a | Provides `kicker`, `rule`, `subheading`, `heading`, `meta`, and `decor` slots. |
| `editorial-masthead` | no | n/a | Provides `heading`, `rule`, `subheading`, and `meta` slots. |
| `tone-adaptive-header` | no | n/a | Provides `kicker`, `meta`, `heading`, `subheading`, and `rule` slots. |
| `fashion-masthead` | no | n/a | Provides `kicker`, `rule`, `heading`, `subheading`, and `meta` slots. |
| `split-diagonal` | no | n/a | Provides `kicker`, `decor`, `heading`, `rule`, `subheading`, and `meta` slots. |
| `colophon` | no | n/a | Provides `decor`, `heading`, `kicker`, `subheading`, and `meta` slots. |
| `institutional-block` | no | n/a | Provides `kicker`, `heading`, `decor`, and `meta` slots. |
| `memo-head` | no | n/a | Provides `kicker`, `rule`, `heading`, and `meta` slots. |
| `board-head` | no | n/a | Provides `kicker`, `heading`, `rule`, `subheading`, and `meta` slots. |
| `bill-head` | no | n/a | Provides `heading`, `rule`, and `meta` slots. |
| `verdict-index` | no | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `band-title` | no | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `header-band` | no | n/a | Provides `meta`, `heading`, and `subheading` slots. |
| `paper-masthead` | no | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `horizon-wedge` | no | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `corner-wedge` | no | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `ikb-field-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `stat-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `type-rule-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `thesis-plate-cover` | yes | n/a | Provides `kicker`, `heading`, `meta`, and `rule` slots. |
| `chalk-band-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `capsule-open-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `issue-head-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `double-frame-cover` | yes | n/a | Provides `kicker`, `heading`, `rule`, and `meta` slots. |
| `vertical-title-cover` | yes | n/a | Provides `heading`, `subheading`, `rule`, and `meta` slots. |
| `invitation-plate-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `lookbook-open-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `red-head-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `pledge-open-cover` | yes | n/a | Provides `kicker`, `heading`, and `meta` slots. |
| `report-open-cover` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `cut-panel-cover` | yes | n/a | Provides `kicker`, `panel`, `heading`, `subheading`, and `meta` slots. |
| `gauge-verdict` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, `meta`, and `rule` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `crayonbox-open` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `meta` slots. |
| `show-headline` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `image`, `caption`, `meta`, and `decor` slots, where the `image` slot accepts a `image` component with capacity 1. |

#### Chapter

| id | pinOnly | capacity | one-sentence use |
| --- | --- | ---: | --- |
| `masthead-chapter` | no | n/a | Provides `rule`, `watermark`, `heading`, and `subheading` slots. |
| `constellation-chapter` | no | n/a | Provides `watermark`, `heading`, `subheading`, and `rule` slots. |
| `rail-chapter` | no | n/a | Provides `watermark`, `heading`, `subheading`, and `rail` slots. |
| `banner-chapter` | no | n/a | Provides `watermark`, `heading`, `subheading`, and `rule` slots. |
| `poster-chapter` | no | n/a | Provides `kicker`, `rule`, `watermark`, and `heading` slots. |
| `roman-chapter` | no | n/a | Provides `kicker`, `watermark`, `heading`, `subheading`, `rule`, and `decor` slots. |
| `tone-adaptive-chapter` | no | n/a | Provides `watermark` and `heading` slots. |
| `fashion-chapter` | no | n/a | Provides `kicker`, `watermark`, `heading`, and `rule` slots. |
| `verse-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `ghost-rule-chapter` | yes | n/a | Provides `watermark`, `rule`, `heading`, and `subheading` slots. |
| `block-numeral-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `ghost-section-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `watermark` slots. |
| `ember-index-chapter` | yes | n/a | Provides `watermark`, `heading`, `subheading`, and `decor` slots. |
| `stroke-index-chapter` | yes | n/a | Provides `watermark`, `heading`, `subheading`, and `rule` slots. |
| `act-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `folio-ghost-chapter` | yes | n/a | Provides `watermark`, `kicker`, `rule`, `heading`, and `subheading` slots. |
| `lesson-box-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `sticker-numeral-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `fascicle-ghost-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `watermark` slots. |
| `mirror-volume-chapter` | yes | n/a | Provides `kicker`, `heading`, `rule`, and `subheading` slots. |
| `volume-slip-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `gilt-ordinal-chapter` | yes | n/a | Provides `kicker`, `heading`, and `rule` slots. |
| `look-range-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `seal-numeral-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `field-band-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `subject-rule-chapter` | yes | n/a | Provides `rule`, `kicker`, `heading`, and `subheading` slots. |
| `round-mark-chapter` | yes | n/a | Provides `rail`, `kicker`, `heading`, `subheading`, and `rule` slots. |
| `one-word-chapter` | yes | n/a | Provides `heading`, `kicker`, and `subheading` slots. |
| `chalk-rule-chapter` | yes | n/a | Provides `kicker`, `heading`, `rule`, and `subheading` slots. |
| `decimal-index-chapter` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `issue-line-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `day-bill-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `hall-label-chapter` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `gauge-section` | yes | n/a | Provides `watermark`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `crayonbox-sticker` | yes | n/a | Provides `kicker`, `heading`, and `subheading` slots. |
| `show-plate` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `image`, `watermark`, and `decor` slots, where the `image` slot accepts a `image` component with capacity 1. |

#### Content

| id | pinOnly | capacity | one-sentence use |
| --- | --- | ---: | --- |
| `narrow-column` | no | 4 | Provides `rule`, `kicker`, `heading`, `subheading`, `body`, `watermark`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `two-column` | no | 4 | Provides `kicker`, `heading`, `subheading`, `rule`, and `body` slots, where the `body` slot accepts any component with capacity 4. |
| `rail-numbered` | no | 4 | Provides `rail`, `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `stacked-poster` | no | 6 | Provides `kicker`, `rule`, `heading`, `subheading`, `body`, `hero`, `strip`, and `meta` slots, where the `body` slot accepts any component with capacity 4, the `hero` slot accepts any component with capacity 1, and the `strip` slot accepts any component with capacity 1. |
| `bento-panel` | no | 12 | Provides `kicker`, `heading`, `subheading`, `body`, `grid`, and `meta` slots, where the `body` slot accepts any component with capacity 6 and the `grid` slot accepts any component with capacity 6. |
| `tone-adaptive-content` | no | 4 | Provides `kicker`, `heading`, `subheading`, `rule`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `asymmetric-triptych` | no | 5 | Provides `kicker`, `heading`, `subheading`, `body`, `lead`, `top`, `bottom`, and `meta` slots, where the `body` slot accepts any component with capacity 4, the `lead` slot accepts any component with capacity 1, the `top` slot accepts any component, and the `bottom` slot accepts any component. |
| `quiet-frame` | no | 4 | Provides `kicker`, `heading`, `subheading`, `rule`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `split-band` | no | 4 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `quote-stage` | yes | 1 | Provides `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 1. |
| `statement` | yes | 1 | Provides `kicker`, `heading`, `body`, and `meta` slots, where the `body` slot accepts `paragraph`, `quote`, and `citation` components with capacity 1. |
| `pull-quote` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts `paragraph`, `quote`, and `citation` components with capacity 1. |
| `stat-hero` | yes | 1 | Provides `kicker`, `heading`, `body`, and `meta` slots, where the `body` slot accepts `kpi_cards`, `paragraph`, and `citation` components with capacity 1. |
| `one-evidence` | yes | 1 | Provides `heading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 1. |
| `mono-bleed` | yes | 0 | Provides `heading`, `subheading`, and `body` slots, where the `body` slot holds derived content with capacity 0. |
| `gauge-stats` | yes | 4 | Provides `kicker`, `heading`, `subheading`, `body`, `rule`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `gauge-point` | yes | 1 | Provides `kicker`, `heading`, `body`, and `meta` slots, where the `body` slot accepts `quote`, `paragraph`, and `citation` components with capacity 1. |
| `crayonbox-cards` | yes | 4 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 4. |
| `crayonbox-point` | yes | 1 | Provides `kicker`, `heading`, `body`, and `meta` slots, where the `body` slot accepts `quote`, `paragraph`, and `citation` components with capacity 1. |
| `show-gallery` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 1. |
| `show-spotlight` | yes | 3 | Provides `kicker`, `heading`, `subheading`, `image`, `body`, and `meta` slots, where the `image` slot accepts a `image` component with capacity 1 and the `body` slot accepts any component with capacity 2. |
| `show-statement` | yes | 1 | Provides `kicker`, `heading`, `body`, and `rule` slots, where the `body` slot accepts any component with capacity 1. |
| `show-figures` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts any component with capacity 1. |

#### Ending

| id | pinOnly | capacity | one-sentence use |
| --- | --- | ---: | --- |
| `masthead-ending` | no | n/a | Provides `heading`, `subheading`, and `meta` slots. |
| `constellation-ending` | no | n/a | Provides `heading`, `subheading`, `rule`, and `meta` slots. |
| `rail-ending` | no | n/a | Provides `decor`, `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `banner-ending` | no | n/a | Provides `kicker`, `heading`, `subheading`, `rule`, and `meta` slots. |
| `poster-ending` | no | n/a | Provides `heading`, `rule`, `subheading`, and `meta` slots. |
| `tone-adaptive-ending` | no | n/a | Provides `kicker`, `heading`, `rule`, and `meta` slots. |
| `fashion-ending` | no | n/a | Provides `kicker`, `heading`, `rule`, `subheading`, and `meta` slots. |
| `action-pad-ending` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `signoff-ending` | yes | 1 | Provides `heading`, `body`, `rule`, and `meta` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `close-word-ending` | yes | n/a | Provides `heading`, `subheading`, and `meta` slots. |
| `ask-ending` | yes | n/a | Provides `heading`, `subheading`, and `meta` slots. |
| `rule-close-ending` | yes | n/a | Provides `heading`, `rule`, and `meta` slots. |
| `pill-cta-ending` | yes | 1 | Provides `heading`, `subheading`, and `body` slots, where the `body` slot accepts `bullets` and `paragraph` components with capacity 1. |
| `defense-close-ending` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `meta` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `homework-close-ending` | yes | 1 | Provides `kicker`, `heading`, `subheading`, and `body` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `reminder-list-ending` | yes | 1 | Provides `heading`, `body`, and `subheading` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `afterword-ending` | yes | n/a | Provides `kicker`, `heading`, `subheading`, and `rule` slots. |
| `invite-field-ending` | yes | n/a | Provides `heading`, `subheading`, `rule`, and `meta` slots. |
| `seal-close-ending` | yes | n/a | Provides `heading`, `subheading`, and `rule` slots. |
| `gilt-word-ending` | yes | n/a | Provides `heading` and `meta` slots. |
| `window-close-ending` | yes | n/a | Provides `heading`, `subheading`, `rule`, and `meta` slots. |
| `deliberation-ending` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `rule` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `scorecard-ending` | yes | 1 | Provides `heading`, `body`, and `subheading` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `care-plan-ending` | yes | 1 | Provides `heading`, `body`, `subheading`, and `rule` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `seat-cta-ending` | yes | n/a | Provides `heading`, `subheading`, and `meta` slots. |
| `release-close-ending` | yes | n/a | Provides `heading`, `subheading`, and `meta` slots. |
| `next-lecture-ending` | yes | 1 | Provides `kicker`, `body`, `rule`, and `subheading` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `resolution-ending` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `rule` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `decision-close-ending` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, and `rule` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `ticket-cta-ending` | yes | n/a | Provides `heading`, `subheading`, and `meta` slots. |
| `exit-word-ending` | yes | n/a | Provides `heading`, `subheading`, `rule`, and `meta` slots. |
| `gauge-next` | yes | 1 | Provides `kicker`, `heading`, `subheading`, `body`, `rule`, and `meta` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `crayonbox-todo` | yes | 1 | Provides `kicker`, `heading`, `body`, and `subheading` slots, where the `body` slot accepts a `bullets` component with capacity 1. |
| `show-finale` | yes | n/a | Provides `kicker`, `heading`, `subheading`, `meta`, and `decor` slots. |
<!-- generated:end layouts -->
