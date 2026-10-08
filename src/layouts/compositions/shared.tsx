import type React from "react"
import type { Component, Slide } from "@/ir"
import type { Tag } from "../../components/tag"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { blendOver, readableOn } from "../../render/ink"

/*
 * Compositions: hand-set arrangements of one content shape, shared by any
 * face that wants them.
 *
 * The ordinary component renderer stacks components in a band and draws each
 * one its own way. A composition draws a whole page body by hand instead: a
 * short list as ruled numbered rows, a comparison as an open table with the
 * pick lifted out, a roadmap as phase columns under colour bars, a two-level
 * team as an owner block over cards, a trend chart with a column of figures
 * beside it, a row of headline figures over a quote, a timeline on one rule,
 * a list of label and value pairs. They were drawn for brief's 2026-10
 * boards, and nothing in them is brief's: each one reads only the band its face hands it and the theme's
 * tokens, so the face keeps its own heading, source line and footer.
 *
 * The contract every composition keeps:
 *
 * - It recognises one content shape and declines everything else by
 *   returning `null`. The face then draws the page another way, normally
 *   with the ordinary component renderer in the same band.
 * - It never takes part of a page. It draws every component it was handed
 *   whole, at the sizes it states, or it declines. No text is shrunk past
 *   its stated size, cut, or marked `data-truncated`.
 * - It stays inside `rect`, and declines when `rect` is narrower or shorter
 *   than it needs.
 * - Its outer group carries `data-gauge-module="<id>"` (see
 *   `compositionTag`), so tests and audits can tell which one drew a page.
 *
 * The settled boards, with what each looks like and why, are archived under
 * `design/compositions/<id>/`.
 */

export type CompositionId =
  | "rows"
  | "table"
  | "waves"
  | "tree"
  | "rail"
  | "figures"
  | "track"
  | "pairs"
  | "columns"
  | "bars"
  | "bridge"
  | "records"
  | "stack"
  | "window"
  | "lanes"
  | "share"
  | "tiles"
  | "shifts"
  | "roster"
  | "scores"
  | "targets"
  | "trend"
  | "rings"
  | "cards"
  | "listing"
  | "log"
  | "span"
  | "plates"
  | "paths"
  | "screen"
  | "annex"
  | "tallies"
  | "slopes"
  | "diverging"
  | "citation"
  | "scales"
  | "catalog"
  | "rota"
  | "sum"
  | "schedule"
  | "checks"
  | "readings"
  | "inset"
  | "docket"
  | "controlled"
  | "duel"
  | "forest"
  | "multiples"
  | "fork"
  | "ruler"
  | "dumbbells"
  | "gate"
  | "watch"
  | "motion"
  | "calendar"
  | "horizon"
  | "formula"
  | "errata"
  | "breakdown"
  | "benchmark"
  | "paired"
  | "procedure"
  | "magnitude"
  | "segments"
  | "survey"
  | "outlook"
  | "phases"
  | "objectives"
  | "syllabus"
  | "studies"
  | "cohorts"
  | "diptych"
  | "estimates"
  | "quiz"
  | "answers"
  | "cases"
  | "ranking"
  | "rules"
  | "tiers"
  | "methods"
  | "blackboard"
  | "expanse"
  | "stairs"
  | "funnel"
  | "rivals"
  | "equation"
  | "spotlight"
  | "bets"
  | "divide"
  | "locks"
  | "register"
  | "runway"
  | "uses"
  | "crest"
  | "branch"
  | "season"
  | "makeup"
  | "origins"
  | "route"
  | "spots"
  | "wall"
  | "loop"
  | "stubs"
  | "fallbacks"
  | "timetable"
  | "scoreboard"
  | "allotment"
  | "asks"
  | "gains"
  | "hours"
  | "regions"
  | "workings"
  | "levers"
  | "cycles"
  | "drift"
  | "parts"
  | "plans"
  | "precedents"
  | "safeguards"
  | "remedies"
  | "checkpoints"
  | "quote"
  | "papers"
  | "inquiry"
  | "ladder"
  | "reach"
  | "backdrop"
  | "thresholds"
  | "tabulation"
  | "partition"
  | "findings"
  | "coverage"
  | "propositions"
  | "cadence"
  | "designs"
  | "hazards"
  | "itinerary"
  | "queries"
  | "foreword"
  | "chronicle"
  | "measures"
  | "elapsed"
  | "headline"
  | "witness"
  | "census"
  | "contrast"
  | "bracket"
  | "mix"
  | "twins"
  | "parallel"
  | "effects"
  | "longform"
  | "pledges"
  | "opening"
  | "strata"
  | "handscroll"
  | "revival"
  | "nations"
  | "genres"
  | "bases"
  | "ages"
  | "archive"
  | "scenes"
  | "daily"
  | "excerpts"
  | "glyphs"
  | "programme"
  | "climb"
  | "solo"
  | "descent"
  | "doubles"
  | "balance"
  | "swing"
  | "ebb"
  | "facing"
  | "lapse"
  | "triptych"
  | "mirror"
  | "vitrine"
  | "reply"
  | "statute"
  | "crayons"
  | "stickies"
  | "waiver"
  | "storeys"
  | "swatches"
  | "yardstick"
  | "arc"
  | "magnets"
  | "crosscheck"
  | "tray"
  | "checkup"
  | "backing"
  | "badges"
  | "ticks"
  | "order"
  | "standfirst"
  | "duet"
  | "collage"
  | "thread"
  | "lengths"
  | "shades"
  | "atelier"
  | "parade"
  | "look"
  | "bounds"
  | "floorplan"
  | "jars"
  | "squares"
  | "specimen"
  | "decades"
  | "lenses"
  | "halo"
  | "dateline"
  | "slice"
  | "blanks"
  | "cabinet"

/**
 * The type a composition sets its page in.
 *
 * - `board`: brief's boards, where every composition was first drawn. Labels
 *   and figures in the primary colour at regular weight, closing lines
 *   reversed out of a primary block.
 * - `notice`: bulletin's 2026-10 board. Black bold labels and figures, the
 *   primary colour kept for the one thing an author marks (a `**…**` run, an
 *   item or series with `emphasis`, a highlighted row), and closing lines on
 *   a light panel. A composition offered this setting also takes the shapes
 *   that board drew and the first one did not, such as `numbered_cards` as
 *   rows with the marked item reversed out of a primary block.
 *
 * - `grid`: swiss's 2026-10 board. The notice shapes on the notice band,
 *   recoloured for a page whose data is black: unmarked data in the text
 *   ink, what steps back in two greys, and the theme's emphasis ink (its
 *   red) kept for the one thing an author marks, a forecast's hatching and
 *   the bracket that states the page's change. Blocks that carry text stay
 *   black, never red. See `./grid.ts`.
 *
 * - `panel`: ledger's 2026-10 board. Every shape set inside dark panels
 *   with a 36px title bar naming the panel and its unit, the theme's
 *   emphasis ink kept for the one thing an author marks, its success and
 *   danger inks only for a value's direction, and unmarked series in the
 *   chart palette after its lead. A composition offered this setting also
 *   takes the shapes that board drew and no other did: numbered panels, a
 *   before-and-after dot plot, a row of figure panels. See `./panel.tsx`.
 *
 * - `seal`: vermilion's 2026-10 board. A formal report on paper: items
 *   numbered in the deck's own numerals inside small squares of the mark,
 *   open tables under a 2px rule in the mark, the mark spent once a page on
 *   a reversed row, a tinted row or a figure, and the accent only drawing
 *   rules, rings and outlines. A composition offered this setting also takes
 *   the shapes that board drew and no other did: a two-column roster of ten
 *   items, a scorecard, targets beside the statement they rest on, a trend
 *   over a marked range, completion rings. See `./seal.tsx`.
 *
 * - `console`: terminal's 2026-10 board. An incident console: square panels
 *   on a dark page, figures, times, labels and the source in a mono face, the
 *   mark spent once a page on a card or row set on its dark tint inside an
 *   edge of it, and the theme's danger, warning and success inks only for
 *   what kind of news a line is. A composition offered this setting also
 *   takes the shapes that board drew and no other did: HUD cards with icons,
 *   a code listing as a terminal window, a timeline as a log, durations to
 *   scale, pictures over their figures, a question's failure points beside
 *   their fixes, a device beside its log lines. See `./console.tsx`.
 *
 * - `memo`: memo's 2026-10 board. A typed memorandum on paper: titles,
 *   item numbers and the figures a page argues from in the heading face,
 *   labels, dates, sums and quoted originals in the typewriter's mono face,
 *   items numbered 「一、」 in the deck's own numerals, open tables under a
 *   2px rule of ink, the thing a page lands on on a pale tint of the mark,
 *   good news in the success ink and bad news in the mark itself, and
 *   photographs pasted in as turned exhibits. A composition offered this
 *   setting also takes the shapes that board drew and no other did: figures
 *   beside an exhibit, a slope chart of two groups, bars that diverge from
 *   the middle, a quoted original and what it means, a weighing in two
 *   columns, options under their photographs, a rota, a sum on ruled paper,
 *   a calendar over its dates, a checklist of stop conditions. See
 *   `./memo.tsx`.
 *
 * - `dossier`: clinic's 2026-10 board. A clinical assessment file: figures
 *   on rounded cards over hairlines, each source named in a rounded capsule
 *   outlined in the ink its kind of source takes, the thing a page is about
 *   in the mark (on its pale tint when it is a row), what it is read against
 *   (a placebo, a control) drawn as an outline, a hollow dot or a tick, the
 *   accent kept for lines and dots, and risk and cost reminders in the
 *   warning ink. A composition offered this setting also takes the shapes
 *   that board drew and no other did: figure cards over a share bar, cases
 *   beside a photograph, bars against their controls, a head-to-head, a
 *   forest plot, small multiples of rates, a trajectory that forks, ranges
 *   on a scale, before-and-after dumbbells, a gated process and a
 *   monitoring plan. See `./dossier.tsx`.
 *
 * - `yearbook`: almanac's 2026-10 board. A long-term account kept year by
 *   year: figures on flat cards over hairlines, figures, years, dates and
 *   formulas in the mono face, every figure that is not a settled fact
 *   marked by a small pill (a § before a provision of law, a dash around an
 *   estimate, a pending figure, a proposed rule or a company's claim), the
 *   mark for what the page settles on and the accent once a page for the
 *   money that comes due. A composition offered this setting draws the
 *   shapes that board drew and no other did: background beside a decision
 *   card, a calendar laid to scale, long curves over a table of years, a
 *   bridge beside its formula, a wrong sum beside the right one, a whole cut
 *   into amounts with a bracket, bars against a benchmark, paired columns, a
 *   procedure over its table, one figure set huge, a whole cut in two with
 *   what each part means, three routes under their photographs, rules on a
 *   year axis and phases with their budget lines. See `./yearbook.tsx`.
 *
 * - `lesson`: homeroom's 2026-10 board. A class taught from a handout:
 *   cards of handout paper rounded 10px over a hairline, their icons in the
 *   mark, a 4px edge of the correcting pen (the accent) on the card a page is
 *   about, questions on ruled paper with a red margin, answers stamped in the
 *   success, danger or warning ink, the recap chalked on a board of the
 *   primary darkened, a sticky note for the one line to remember, and every
 *   study's kind in a small pill (a journal's in the success ink, a working
 *   paper's in the warning ink, a law's in the pen). A composition offered
 *   this setting draws the shapes that board drew and no other did: goals
 *   with boxes to tick beside a photograph, a class laid out by the minute,
 *   studies side by side, the weaker group against the stronger, two studies
 *   with their charts, expectations against a measurement, a quiz and its
 *   answers, cases, a ranking with one item broken down, house rules with
 *   their grounds, levels from the most guarded down, methods under their
 *   photographs and the blackboard. See `./lesson.tsx`.
 *
 * - `pitch`: ember's 2026-10 board. A founder on a dark stage: figures set
 *   large, cards a step lighter than the ground with no outline, words in
 *   the ivory of the text and the warm grey of the muted ink, and the
 *   theme's accent (the fire) on one thing a page, with the dark ink on it.
 *   A composition offered this setting draws the shapes that board drew and
 *   no other did: a whole set over a field of squares with the part a dot,
 *   steps that climb, a funnel, rivals with the column none has published,
 *   a wedge worked out as a sum with what it leaves out struck, one figure
 *   lit beside a photograph, bets with their windows, two groups of figures
 *   that cannot be compared, gates locked in a row, a risk register, a
 *   runway with its gate, and the ask with its uses. See `./pitch.tsx`.
 *
 * - `marquee`: rally's 2026-10 board. A campaign proposal staged as a show:
 *   cards a step lighter than the house rounded 12px, words in the light of
 *   the text and the grey of the muted ink, charts and decoration in the
 *   palette's four confetti colours, and the theme's accent as the lead on
 *   what a page is about, with a dark ink drawn from the primary on it. A
 *   composition offered this setting draws the shapes that board drew and no
 *   other did: one figure set huge over its run of bars, two branches from
 *   one start, a year's heat with a season framed, crowds cut into shares
 *   with a bracket, stacked shares beside a photograph and a figure, a route
 *   through a weekend, touchpoints beside their photographs, a wall of
 *   cases, a loop that brings results back, ticket stubs, a plan B for each
 *   risk, a schedule by the month with its season, a scoreboard still to be
 *   filled, a budget cut into shares and requests to tick. See
 *   `./marquee.tsx`.
 *
 * - `binder`: proposal's 2026-10 board. A proposal handed to a client's
 *   management in a ring binder: white paper, cards of warm sand with no
 *   outline, the primary's petrol for titles, figures and the one dark block
 *   a page may carry, the chart palette's second petrol and sky for bars and
 *   steps, and the accent, a brick red, on one thing a page with white on it,
 *   small brick-red words in the theme's emphasis ink. A composition
 *   offered this setting draws the shapes that board drew and no other did:
 *   what the client gets as figure cards, a day's tariff bands, places side
 *   by side as cards, a sum worked out beside its inputs, what moves a
 *   result, what a store earns a day, what has moved, what a solution is made
 *   of, the ways to pay, public records, safeguards, a risk register with its
 *   remedies, steps with the papers that close them, a price list as one
 *   sheet and a checklist of what to hand over. See `./binder.tsx`.
 *
 * - `manuscript`: thesis's 2026-10 board. A research proposal or a defense
 *   set as a page of a thesis: ivory paper, emerald for the evidence and the
 *   one thing a page lands on, scholar's gold only as rules, dots and pale
 *   grounds, figures and tables numbered across the deck as a paper numbers
 *   them (「图 3」, 「表 1」), and sources as numbered footnotes the text
 *   points at with superscripts. A composition offered this setting draws
 *   the shapes that board drew and no other did: a question beside its
 *   figure, a statutory ladder, a dose against its whole, figures beside a
 *   trend, a line with its thresholds, a table of comparable studies, a whole
 *   and where it went, studies side by side, a map of the literature with its
 *   gaps, hypotheses, survey rounds against a reform, two designs with their
 *   sketches, threats and their answers, a schedule with its gate and
 *   questions for a committee. See `./manuscript.tsx`.
 *
 * - `periodical`: journal's 2026-10 board. A small magazine's own pages:
 *   warm paper, every bar and line the page does not lead with in the ink of
 *   the type, the accent (journal's ochre red) on the one thing a page is
 *   about, a figure's number in the accent before its caption and the
 *   editor's comment under it in an italic serif, and photographs with a
 *   plain italic caption. A composition offered this setting places the
 *   page's claim itself (`claim`), over the body or beside a photograph that
 *   runs up to the masthead, and draws the shapes that board drew and no
 *   other did: an editor's note with its drop cap beside three figures, ten
 *   years of a reading on one line, ways of reading as bars with their
 *   symbols, minutes against an earlier year, one figure set huge beside its
 *   small trend, figures over a pull quote beside a photograph, bars with
 *   the years nobody published, pairs of bars beside a card, bars with their
 *   change bracketed beside a column of figures, shares by column beside a
 *   photograph and a share bar, two small multiples on their own axes, a
 *   side-by-side table, effects on one scale, a long read in two columns
 *   under a pull quote, and plans numbered beside a photograph. See
 *   `./periodical.tsx`.
 *
 * - `scroll`: ink's 2026-10 board. A public lecture hung as a scroll: rice
 *   paper, ink for words and the darkest marks, a ramp of greys from the ink
 *   to the paper for what is told apart by depth, and cinnabar (the theme's
 *   accent) once a page on large type or the one thing the page is about.
 *   Titles, figures and the lines a page reads aloud are set in the heading
 *   face, labels and sources in the body sans, nothing slanted, and Chinese
 *   may stand upright down a column with its punctuation in vertical form. A
 *   composition offered this setting places the page's claim (`claim`) and
 *   its source (`source`) itself, over the body or beside a photograph that
 *   runs the height of the page, and draws the shapes that board drew and no
 *   other did: three figures over a line read aloud, a pyramid of tiers with
 *   what each holds beside it, a long scroll of years to scale with its
 *   running count, two figures beside a photograph, countries as bars beside
 *   how they are counted, items and their sub-items as twin bars, batches
 *   beside a table of counts that must not be added, a share bar of ages
 *   with its run bracketed, two figures and a progress bar beside a
 *   photograph, three photographs over four figures, a table by the day
 *   beside a photograph, quoted findings with their sources, five large
 *   characters each over its column of words, and a statute set upright.
 *   See `./scroll.tsx`.
 *
 * - `crayonbox`: crayon's 2026-10 board. A box of crayons on drawing
 *   paper: words in a deep navy ink, the deck's sections coloured in order
 *   by five crayons (the theme's `accentPool`), sunny yellow for what is
 *   only drawn, cards rounded and outlined twice as if traced, a filled
 *   crayon carrying the navy or white, and a colour that must carry words
 *   lifted toward the ink until it reads. A composition offered this
 *   setting places the page's claim (`claim`) and its source (`source`)
 *   itself, and draws the shapes that board drew and no other did: the
 *   contents as a row of crayons, rules as sticky notes, what is in and
 *   out with a worked sum, bars and a rate on two storeys, a card of its
 *   own colour a thing, a crossed-out ruler under a large claim, a day on
 *   the sun's arc, notes pinned to a fridge door, what several bodies say
 *   side by side, figures beside a framed photograph, an eye check beside
 *   its advice, studies beside things to tick, round safety badges and big
 *   boxes to tick beside a photograph. See `./crayonbox.tsx`.
 *
 * - `invitation`: luxe's 2026-10 board. A house's gilt invitation to guests
 *   it already knows: warm black stock, champagne gold (the theme's accent)
 *   for rules, letters and the one figure a page is about, ivory words, old
 *   gold labels, and nothing filled solid but a bar. What came before or is
 *   quieter is drawn as an outline, a card is a gilt frame. Titles, names,
 *   numerals and figures are set in the heading serif, labels and sources
 *   in the body sans. A composition offered this setting is handed the
 *   whole card and places the page's claim (`claim`) and its source
 *   (`source`) itself, centred over the body, beside a photograph that runs
 *   to the page's edge, or inside a reply card, and draws the shapes that
 *   board drew and no other did: a programme with its numerals and pages,
 *   a run of bars carried on hatched beside the figure it comes to, one
 *   figure beside a drawing of how it came about (a fall from a high, pairs
 *   of bars), two quantities on a balance, dumbbells in two stretches, bars
 *   that run left and right from one line, a rule before and after as two
 *   cards, a rule's dates with the long years cut short, a catalogue of
 *   pieces, two ways of doing one thing either side of a line, a half page
 *   photograph beside its items, and a reply card. See `./invitation.tsx`.
 *
 * - `lineup`: runway's 2026-10 board. A fashion show's running order:
 *   show-white paper, the ink of the type for words, rules and numerals, a
 *   stone grey for what is quieter, hairlines between rows, and one drop of
 *   crimson (the theme's accent) a page on the one figure or word it is
 *   about. Nothing sits on a card: rules, air and large serif numerals order
 *   the page, the pictures argue and the words caption them. Titles,
 *   numerals, figures and names are set in the heading serif at its regular
 *   weight, labels and captions small in the body sans. A composition
 *   offered this setting is handed the whole page and places the page's
 *   claim (`claim`) and its source (`source`) itself, and draws the shapes
 *   that board drew and no other did: a running order of parts, an editor's
 *   standfirst over its figures, two figures never added, a moodboard of six
 *   pictures, steps along one hairline over their photographs, quantities as
 *   lines to scale, a picture bracketed into grades, a sample beside the ways
 *   it was made, the looks in a row, one look on a page of its own, and what
 *   a piece of work did and did not do. It keeps the part of a picture an
 *   author crops to. See `./lineup.tsx`.
 *
 * - `placard`: museum's 2026-10 board. An exhibition label in a darkened
 *   gallery: a brown-black hall, lifted boards for labels and rooms, warm
 *   paper words, an old paper grey for what is quieter and a dimmer one for
 *   captions and sources, seams for what divides, and copper (the theme's
 *   accent) on the one thing a page is about. Exhibits stand in pools of
 *   warm light, photographs cut round like objects under a lamp. Titles,
 *   names, figures and the lines a label reads aloud are set in the heading
 *   serif at its regular weight, labels small and tracked wide in the body
 *   sans. A composition offered this setting is handed the whole page and
 *   places the page's claim (`claim`) and its source (`source`) itself, and
 *   draws the shapes that board drew and no other did: the visit as a floor
 *   plan, two samples side by side, quantities as squares to scale, one
 *   exhibit beside its label, ranges on a log scale, exhibits under a
 *   microscope, one figure in a pool of light, events at their true
 *   distance in time, a whole with its part cut out beside where it went,
 *   open questions on blank labels, and a case beside what to look for in
 *   it. See `./placard.tsx`.
 *
 * A setting is the face's choice, not the theme's: the face that offers the
 * compositions names the setting its own frame was drawn with.
 */
export type CompositionSetting = "board" | "notice" | "grid" | "panel" | "seal" | "console" | "memo" | "dossier" | "yearbook" | "lesson" | "pitch" | "marquee" | "binder" | "manuscript" | "periodical" | "scroll" | "crayonbox" | "invitation" | "lineup" | "placard"

export interface CompositionProps {
  /** The page's components, in the order the author wrote them. */
  components: readonly Component[]
  /** The paint context: theme colours, fonts and emphasis stroke, as the face hands them. */
  ctx: ComponentCtx
  /** The body band the face leaves for its content. */
  rect: ContentRect
  /** Starting inks a face supplies where its board names a colour the theme tokens do not carry. */
  inks?: CompositionInks
  /** The type the page is set in. Omitted, `board`. */
  setting?: CompositionSetting
  /**
   * The number the page's first exhibit takes (「附图 N」), counted across the
   * deck by the face that sets the page: one more than the pictures on the
   * pages before it. 1 when omitted. Only the memo setting numbers exhibits.
   */
  exhibitNumber?: number
  /**
   * The section the page sits in (its `kicker`), handed down by a face that
   * numbers a page's items after it: the dossier setting labels proposals
   * 「提议 1」 on a page whose section is 「提议」.
   */
  section?: string
  /**
   * The height a face's page tag (`Slide.tag`) takes at the top left of the
   * band, from `rect.y`, when the face sets one there. A composition that
   * knows the tag keeps its left column clear of it. 0 or omitted when the
   * page has none.
   */
  tagBand?: number
  /**
   * The page's own tag (`Slide.tag`), handed to a setting that sets it inside
   * the body where its board drew it: the yearbook cites the law a page rests
   * on under the figures it governs. A page with one is offered only to the
   * compositions that place it; the face sets it itself otherwise.
   */
  pageTag?: Tag
  /**
   * The page's ballot (`Slide.ballot`), handed to a setting that sets a box
   * for each choice beside every question: the lesson's quiz. A page with one
   * is offered to the compositions that draw it alone.
   */
  ballot?: Slide["ballot"]
  /**
   * Draws other components in a band of their own, with the compositions the
   * face offered and in the same setting, or returns `null` when none takes
   * them. `compose` hands it to every composition, so one that draws part of
   * a page (a share bar over a chart and its figures) can pass the rest on.
   */
  handOn?: (components: readonly Component[], rect: ContentRect) => React.ReactElement | null
  /**
   * The page's claim, drawn by the face's own rules into the column a
   * composition gives it (`x` from the band's left, `w` its measure), or
   * `null` when the claim would not fit that column whole, in which case the
   * composition declines. Handed down by a face whose board lets a
   * composition move the claim beside a photograph (journal's periodical
   * sheet): the band it hands starts at the top of the claim's box rather
   * than under the claim, and a composition offered it draws it once. A
   * board that sets the claim larger beside a photograph names its `size`
   * and the `foot` its last line ends on; a face whose board has one claim
   * size reads neither. A board that sets the claim from the left in a
   * column of its own (luxe's beside a photograph, or inside a reply card)
   * names its line height, `align: "start"`, where the chapter over it
   * stands and how it is tracked, and whether its diamond follows it.
   */
  claim?: (column: {
    x: number
    w: number
    size?: number
    foot?: number
    /** The claim's line box, for a board that sets it larger. */
    lineHeight?: number
    /** The most lines the claim may take in the column; it answers `null` past them. */
    maxLines?: number
    /** The stroke a crayonbox claim is underlined with: its length, its gap under the foot and its width. */
    underline?: { w: number; gap: number; stroke: number }
    align?: "center" | "start"
    labelTop?: number
    labelTracking?: number
    mark?: "center" | "start" | "none"
    markGap?: number
  }) => React.ReactElement | null
  /**
   * The page's source line, drawn by the face's own rules into the column a
   * composition gives it (`x` from the band's left, `w` its measure), or
   * `null` when it does not fit that column, in which case the composition
   * declines. Handed down only when the page has a source, by a face whose
   * board moves the source under the column beside a photograph (ink's
   * scroll sheet); a composition offered it draws it once. A board that
   * sets the source higher than the face's foot names the `top` of its
   * first line.
   */
  source?: (column: {
    x: number
    w: number
    top?: number
    /** The source's line box, for a board that sets it looser. */
    lineHeight?: number
    /** Centred on the column, for a board that centres it. */
    align?: "center"
    /** What it sits on, for a board that sets it inside a label. */
    ground?: string
  }) => React.ReactElement | null
  /**
   * The page's stamp (`Slide.stamp`), handed to a setting that sets it where
   * its board drew it: luxe's reply card stands it down the card's torn
   * stub. A page with one is offered to the compositions that draw it alone;
   * the face declares it dropped when none takes the page.
   */
  stamp?: Slide["stamp"]
}

export interface CompositionInks {
  /**
   * The starting colour for a quiet second line set on a `primary` block
   * (the role under the owner's name in `tree`). Contrast still decides: the
   * line keeps this colour only where it reads on `primary`. Without it the
   * composition derives one from the tokens, see `quietInkOn`.
   */
  quietOnPrimary?: string
  /**
   * The crayon of the section the page sits in, handed down by a face that
   * colours its sections (crayon's crayonbox sheet): a table's header band,
   * a list's boxes and a photograph's frame take it.
   */
  section?: string
}

/**
 * A composition draws one content shape by hand, or returns `null` to say it
 * does not take these components.
 */
export type Composition = (props: CompositionProps) => React.ReactElement | null

/**
 * The tag on a composition's outer group.
 *
 * The attribute keeps the name it had while these compositions lived inside
 * brief's gauge faces. Renaming it would change the bytes of every brief page
 * that carries one, so it waits for a round that re-records the gallery for
 * its own reasons.
 */
export function compositionTag(id: CompositionId): { "data-gauge-module": CompositionId } {
  return { "data-gauge-module": id }
}

/** The ink a hairline between rows takes. */
export function ruleInk(ctx: ComponentCtx): string {
  return ctx.colors.border ?? ctx.colors.muted
}

/**
 * How far the quiet line on a `primary` block sits from the block's own
 * readable ink toward the block. Brief's board grey on its navy, #B7BBC4,
 * sits about 68% of the way from navy to white, so a theme without a board
 * colour of its own gets the same step.
 */
const QUIET_ON_PRIMARY_MIX = 0.68

/**
 * The starting ink for a quiet second line on a block filled with `fill`:
 * the face's own colour when it hands one in, otherwise the block's readable
 * ink blended part of the way back toward the block. The caller still runs it
 * through `accessibleInk` against `fill`.
 */
export function quietInkOn(fill: string, preferred: string | undefined): string {
  return preferred ?? blendOver(readableOn(fill), fill, QUIET_ON_PRIMARY_MIX)
}

/**
 * The `data-blk` tag a component drawn by hand needs.
 *
 * A component drawn through `renderComponent` is tagged there, and the
 * per-component entrance animation (`meta.animation.elements: "auto"`) finds
 * its shapes by that tag. A composition draws its components itself, so each
 * one tags the group it draws a component into, the way the bento grid tags
 * its exploded cards. Empty when animation is off.
 */
export function blockTag(ctx: ComponentCtx, component: Component): { "data-blk"?: number } {
  const index = ctx.blockIndex?.get(component)
  return index != null ? { "data-blk": index } : {}
}
