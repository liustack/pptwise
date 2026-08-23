# @liustack/pptwise

## 0.21.0

### Minor Changes

- d6f8df5: Architecture diagrams are now a layer stack: index on the left, layer name in the middle, notes on the right, hairline rules between rows. Too many layers fail validate instead of folding into a leftover +N. The renderer no longer drops rows.
- 7ed0a70: Five seventh-wave themes now lock their cover to the design-board composition, and the cover pool grows by four.

  **Covers change on decks that don't pin one.** Registering four new cover layouts changes the denominator the seeded picker samples from, so a deck with a fixed seed can land on a different cover than it did in 0.20. Pin `slide.layout` on a cover to hold it exactly.

  `stage` reuses `poster-center` (its type scale already does the giant keynote type). `lecture`, `swiss`, `memo`, and `playbill` each get a new shared cover: `board-head` (chalkboard serif, chalk stroke), `institutional-block` (left giant type, accent signature block), `memo-head` (MEMORANDUM eyebrow, double rules, last-word underline), `bill-head` (bleed display type, thick baseline). Each of those five themes now curates only that one cover. Other page types stay on the full set.

  The four new layouts join the shared pool. They read every color through tokens. `playbill`'s date chip stays in the motif, not the layout. `memo`'s edge MEMORANDUM steps off the cover so it does not print twice.

- 2c9579c: The cover pool grows by six, and nine themes lock their cover to the face drawn on the design board.

  **Covers change on decks that don't pin one.** Registering six new cover layouts changes the denominator the seeded picker samples from, and those nine themes now always pick their locked face. A deck with a fixed seed can land on a different cover than it did in 0.20. Pin `slide.layout` on a cover to hold it exactly.

  The six new shared covers are `verdict-index` (verdict heading, optional accent block, up to three numbered arguments), `band-title` (full-width band carrying the reversed title), `header-band` (tone band for meta only, title on paper), `paper-masthead` (giant type on paper, year stacked one glyph per line), `horizon-wedge` (full-width bottom ramp), and `corner-wedge` (lower-right triangular wedge). They read every color through tokens.

  `consulting` locks `verdict-index`. `classroom`, `enterprise`, and `vermilion` lock `band-title`. `crayon` locks `header-band`. `runway` locks `paper-masthead`. `pulse` locks `horizon-wedge`. `arena` and `ember` lock `corner-wedge`. Other page types stay on the full set.

- b36c084: Ten remaining themes lock their cover to the face drawn on the design board. Existing cover layouts gain optional knobs. No new cover layout ids.

  **Covers change on decks that don't pin one.** Those ten themes now always pick their locked face, and six of them stop rotating motifs. A deck with a fixed seed can land on a different cover, and a different decoration, than it did in 0.20. Pin `slide.layout` on a cover to hold it exactly.

  `academic` locks `left-anchor`. `campaign`, `insight`, `luxe`, and `museum` lock `poster-center`. `tech` locks `constellation`. `journal` and `heritage` lock `editorial-masthead`. `ink` locks `colophon`. `terra` locks `tone-adaptive-header`. Motif rotation collapses to the board motif for academic, insight, tech, luxe, journal, and heritage. Chapter and ending stay on the full set.

- 2250609: Breaking rename: the deck and spec field `chrome` is now `branding`. Values are unchanged (`full` / `cover-only` / `minimal`). Layout-declared `branding: "none"` replaces `chrome: "none"`. `pptpress migrate` rewrites the old field on v4 IR and on deck specs. Both fields at once is a hard error. `validateIr` and `validateSpec` still accept `chrome` as an alias when `branding` is absent.
- d6cc6a2: Fourteen new content-page faces for eight existing components. The IR, schema, and skill routing table do not change. A theme looks up its face from a render-side assignment table.

  **Decks that pick one of the 41 assigned (theme, component) pairs look different.** Unassigned themes keep the current face, byte for byte. campaign's cycle face is hub-spoke (first listing wins).

  `icon_cards` gains column, badge, and outline-grid faces. `cycle` gains loop, hub-spoke, and petal-wheel. `numbered_cards` gains pills and hex cluster. `kpi_cards` gains donut trio and bubble row. `comparison` gains pill panels. `steps` gains an arrow band. `timeline` gains vertical nodes. `image_grid` gains numbered photos.

- ee08bab: Every theme now says which chapter, content, and ending layouts it wants, not just which cover.

  **Pages without an explicit `slide.layout` will change on non-cover slides.** The cover slot does not move. On a fixed seven-page deck across 24 structural identities and 40 seeds, 4278 of 6720 picks move, all of them off the cover. Pin `slide.layout` on a page to hold it exactly.

  A default-narrative deck at seed=1 now resolves 23 distinct layout sequences instead of 11. The one remaining collision is `enterprise` with `classroom` (same sequence, different palettes). Across 40 seeds every identity is distinct.

  `playbill` still ships the full layout set. Its content preference names three poster-like layouts so short event decks lean that way without closing the pool.

  `tech`'s chapter preference and `pulse`'s ending preference were previously invisible under the default narrative (they named only layouts that narrative already favored). Both now name a second layout the default narrative does not already favor.

- 2380485: Deck-level `chrome` posture (`full` / `cover-only` / `minimal`). Omitted equals `cover-only`: cover and chapter pages keep the brand logo, content and ending pages drop the footer rule, meta, and logo. Write `chrome: "full"` only when every content page needs the brand footer. Layout `chrome: "none"` still wins.
- 04a8e66: Rendered slides now enforce a three-layer depth contract. Every SVG paints
  background, midground decoration, and foreground content in marked `bg`, `mid`,
  and `fg` groups. The renderer owns this order, so layouts and motifs no longer
  need to coordinate their paint position manually.

  Midground paint is capped through the existing decoration contrast budget and
  a theme-aware saturation ceiling. Decorative leaves that intersect foreground
  content are omitted at the shared layer boundary. Ghost indices are moved until
  their complete glyph boxes sit inside the slide.

  Gallery L1 now reports malformed depth order, midground paint at or above the
  shared 3:1 ceiling, midground text bleeding off canvas, and isolated small
  stroked decoration. Four planted fixtures hold those checks.

  Serialized SVG changes on every slide because the three depth groups are part
  of the output contract. Decorative pixels can also change when the new budget,
  collision retreat, or glyph containment rules apply.

- 2926780: Consulting now renders `**emphasis**` as a fitted yellow pad behind each emphasized run. Wrapped emphasis receives one pad per line, and the text color is checked against the pad for readability.

  Other themes keep the existing tinted bold emphasis output unchanged.

- ef46396: Seven themes now paint flowchart nodes by kind. Start and end get a light wash. A decision takes the one accent, from the theme token, never a hardcoded orange. Unassigned themes keep the previous face, byte for byte. No new IR fields.
- 41b0a29: Flowchart connectors are now orthogonal rounded elbows. Coaxial nodes stay a straight segment. Offset nodes take a right-angle bend with a small Q radius. Same-side edges fan apart. Edge labels sit 6-10px off the stroke. Arrowheads stay polygons because svg2pptx skips SVG markers. The same IR still renders the same markup.
- fc2c2a9: Six content-page heading treatments, looked up from a render-side assignment table. The IR, schema, and skill routing table do not change.

  **Decks that pick one of the 16 assigned themes look different on content pages.** Unassigned themes keep the current heading, byte for byte. ghost_index and tag_box need a chapter page, or they keep the native heading.

  Consulting and tech pick a ghost index. Insight, heritage, and journal pick a baseline rule. Playbill, enterprise, and arena pick a chapter tag box. Academic and terra pick a lead accent. Ink, lecture, and museum pick a vertical kicker. Luxe, campaign, and vermilion pick a centered title with mirrored rules.

- 94cc3e7: The ink theme is redesigned around a right-edge colophon, and every theme's
  cover pool grows by one.

  **Covers change on decks that don't pin one — read this first.** Registering a
  ninth cover layout changes the denominator the seeded picker samples from
  (`weightedPickBySeed` chooses by `hash % totalWeight`), so a deck with a fixed
  seed can land on a different cover than it did in 0.20. Measured across all 17
  themes × 40 seeds: **505 of 640 cover picks move**. Nothing outside the cover
  slot moves for any theme except ink, which changed on purpose. This is not
  specific to the new layout — any future addition to the cover pool does the
  same thing, and the nine themes that still declare no cover preference will be
  re-drawn again when they get one. Pin `slide.layout` on a cover to hold it
  exactly. Three consequences of this ship in the repo itself: the v3→v4
  equivalence goldens and the checked-in example previews were re-recorded, and
  in both cases the only difference is which cover layout was selected — no
  slide other than the cover changed, no content was dropped or truncated, and
  the audit findings are identical on both sides.

  **ink**: lighter paper and a warmer, blacker ink (`bg` `#F5F0E6` → `#F7F2E7`,
  `primary` `#2B2B2B` → `#1F1C18`, plus `surface`/`border`/`chartPalette` and a
  wider whitespace scale). Its decoration is now two marks instead of five: a
  vertical colophon down the right edge — the organization set one character per
  line, the year and month below it in Chinese numerals, a vermilion seal at the
  foot — and a single faint ridge in the bottom-left corner of covers and chapter
  pages. The full-width frame rules, the layered distant mountains, and the old
  seal that collided with the bottom-right logo box are gone; that collision (a
  date measured at 1.07:1 against the seal) is fixed by the move.

  Because the colophon carries the organization and the date, ink's content pages
  no longer repeat them in the footer. Two costs come with that, both deliberate:
  the confidentiality label and version number live only in that footer row, so
  they no longer appear on ink content pages; and the colophon column holds 11
  characters (17 when the deck sets no date), so a longer organization name is
  truncated and reported by `pptpress audit` as `content-truncated`. That limit
  excludes ordinary names — `Meridian Analytics`, `北京云帆科技有限责任公司` —
  because a per-character vertical column is a short-CJK-signature idiom. Set
  `theme.brand.suppressFooterMeta: false` in the IR to take the footer row back.

  **New cover layout, `colophon`**, available to every theme: a left-axis heading
  flagged by a narrow accent block, a wide-tracked organization line, a
  subheading, and a byline in the bottom-left corner, with the right 100px of the
  page kept clear for a side rail.

  **New theme brand flag**, `suppressFooterMeta`: skips the footer's
  organization/confidentiality/version/date row on content slides, for themes
  whose decoration already carries that information. Independent of the existing
  `suppressFooterRule`; unset on every other theme, whose output is unchanged.

- ec44d9c: Three pin-only editorial layouts (`statement`, `pull-quote`, `verse-chapter`) and a layout-level `chrome: "none"` declaration. Pinning one of these pages skips the brand footer, logo, and theme motif. Auto-selection is unchanged: the new ids never enter the pool.
- 7bb5a21: Breaking: the bloom theme id is removed. `pptpress migrate` rewrites IR `theme.id` and spec `theme` `"bloom"` to `"classroom"`. Validate on a leftover bloom id points at migrate. 24 built-in themes, 24 ids.
- 3972323: Breaking: the `logo_wall` component is removed. `pptpress migrate` rewrites leftover `logo_wall` components to `image_grid` (asset_id copied, label becomes caption, extra items past 4 dropped). Validate on a leftover `logo_wall` points at migrate. 37 typed units.
- b4faf38: Rename the product from pptfast to pptpress. The package is `@liustack/pptpress`, the CLI is `pptpress`, the skill is `skills/pptpress`, and the DSH plugin is `pptpress`. `PPTFAST_*` environment variables remain aliases for `PPTPRESS_*`. If `~/.pptpress` is missing and `~/.pptfast` exists, the old directory is copied to the new one and left in place. Project config `pptpress.config.json` still reads `pptfast.config.json`. Workspace default is `.pptpress`, and a leftover `.pptfast/` is reused when present.
- f1bfcb3: Ten more themes get their own sparse climax faces, drawn from the design boards. Unregistered theme/layout pairs still use the generic face.
- 679106f: Three pin-only speech layouts (`stat-hero`, `one-evidence`, `mono-bleed`). Each declares `chrome: "none"`, so pinning one skips the brand footer, logo, and theme motif. `mono-bleed` also paints its own primary field. Auto-selection is unchanged: the new ids never enter the pool.
- 329d5be: Optional stock-photo search: `pptpress config set` stores your Pexels and Pixabay keys, `pptpress images search` / `fetch` / `list` pins photos into `.pptpress/<deck>/assets/`. Rendering a PPTX still needs no API key.
- 748ea79: Optional stock-photo search now falls through to Openverse (CC0 / public domain, commercial filter) when Pexels and Pixabay are empty or unconfigured. `pptpress images generate` pins a locally generated image when a generator CLI is enabled. Rendering a PPTX still needs no API key.
- 76cdee2: Every theme now says which cover it wants. Ten themes gain or extend a cover
  preference.

  **Covers change on decks that don't pin one — read this with the ink note.**
  0.21 moves the cover slot for two reasons that land together. The ink redesign
  added a ninth cover layout to the shared pool, which changes the denominator
  the seeded picker samples from, so a fixed seed can land somewhere new even
  though no existing layout changed. This change is the one that gives the move a
  reason: themes that previously expressed no cover preference now express one,
  so the picker leans where the theme's own design points. Measured on a fixed
  deck across 17 themes × 40 seeds, **351 of 680 cover picks move**, all of them
  on the ten themes listed below. **No page other than the cover moves for
  any theme**, and no content is dropped, reflowed or truncated by either pass.
  Pin `slide.layout` on a cover to hold it exactly.

  The ten whose covers move: `enterprise` and `campaign` toward the diagonal
  split, `classroom` toward the quiet adaptive header, `luxe` toward
  the full-bleed masthead, `heritage` toward the double-ruled editorial masthead,
  `terra` toward a left anchor, `ember` toward the diagonal split, `insight`
  toward the editorial masthead and `vermilion` toward the tone-adaptive header.
  `consulting`, `academic`, `ink`, `tech`, `runway`, `journal` and `pulse` pick
  exactly what they picked before. Four checked-in example previews were
  re-recorded and every one shows only a different cover layout.

  Because the theme, narrative and beat preferences combine by taking the
  strongest rather than by multiplying, a theme that names only covers the active
  narrative already favors adds nothing at all. `insight` and `vermilion` shipped
  that way in this branch's first pass and are corrected here: `insight` now also
  leans toward the double-ruled editorial masthead, `vermilion` toward the
  tone-adaptive header, and both are visible to a deck that names no narrative.
  A test now holds every theme to it, so a future preference that would flatten to
  nothing fails at build time instead of shipping silently.

- 4cab5c5: Six themes lock their cover, chapter, and ending to the wave 8 board faces. Content pages keep the full pool but now lean toward the board's main layouts. Motifs stay, evolve, or retire with the board.

  **Unpinned decks change face.** A deck that does not set `slide.layout` can land on a different cover, chapter, ending, and decoration than it did in 0.20. Pin the layout to hold a page exactly. Consulting covers may carry bullets when the locked cover accepts them.

  `consulting` locks `verdict-index`, `ghost-rule-chapter`, and `action-pad-ending`, and keeps `banner-motif`. `enterprise` locks `ikb-field-cover`, `block-numeral-chapter`, and `signoff-ending`, and keeps the square-order motif. `insight` locks `stat-cover`, `ghost-section-chapter`, and `close-word-ending`. Its motif drops the top ticker and keeps a bottom rule. `ember` keeps `corner-wedge` on the cover, locks `ember-index-chapter` and `ask-ending`, and retires rising sparks. `tech` locks `type-rule-cover`, `stroke-index-chapter`, and `rule-close-ending`, and retires the constellation. `campaign` locks `poster-center`, `act-chapter`, and `pill-cta-ending`, and thins the paper-confetti field.

- e6b3a14: Six knowledge and culture themes lock their cover, chapter, and ending to the wave 8 board faces. Content pages keep the full pool but now lean toward the board's main layouts. Motifs stay, evolve, or empty with the board.

  **Unpinned decks change face.** A deck that does not set `slide.layout` can land on a different cover, chapter, ending, and decoration than it did in 0.20. Pin the layout to hold a page exactly.

  `academic` locks `thesis-plate-cover`, `folio-ghost-chapter`, and `defense-close-ending`. Its motif drops the progress dots and keeps a gold opening rule. `classroom` locks `chalk-band-cover`, `lesson-box-chapter`, and `homework-close-ending`, and turns punch holes into ruled notebook lines. `crayon` locks `capsule-open-cover`, `sticker-numeral-chapter`, and `reminder-list-ending`, and keeps a single sun doodle on the cover. `journal` locks `issue-head-cover`, `fascicle-ghost-chapter`, and `afterword-ending`, and keeps masthead rules. `heritage` locks `double-frame-cover`, `mirror-volume-chapter`, and `invite-field-ending`, and retires the bookplate ticks. `ink` locks `vertical-title-cover`, `volume-slip-chapter`, and `seal-close-ending`, and keeps the remnant mountain plus the content colophon rail.

- 7e0c551: Six character themes lock their cover, chapter, and ending to the wave 8 board faces. Content pages keep their pools but now lean toward the board's main layouts. Motifs stay, evolve, or empty with the board.

  **Unpinned decks change face.** A deck that does not set `slide.layout` can land on a different cover, chapter, ending, and decoration than it did in 0.20. Pin the layout to hold a page exactly.

  `luxe` locks `invitation-plate-cover`, `gilt-ordinal-chapter`, and `gilt-word-ending`, and keeps the gilt invitation frame on cover and ending. `runway` locks `lookbook-open-cover`, `look-range-chapter`, and `window-close-ending`, and stays motif-empty. `vermilion` locks `red-head-cover`, `seal-numeral-chapter`, and `deliberation-ending`, and keeps only the gold masthead rules. `terra` locks `pledge-open-cover`, `field-band-chapter`, and `scorecard-ending`, and moves contour lines to the top-left edge. `pulse` locks `report-open-cover`, `subject-rule-chapter`, and `care-plan-ending`, and draws one heartbeat line on the cover. `arena` locks `cut-panel-cover`, `round-mark-chapter`, and `seat-cta-ending`, and retires HUD brackets.

- ebe73c6: Six character themes lock their cover, chapter, and ending to the wave 8 board faces. Covers stay locked on the existing ids. Content pages keep their pools but now lean toward the board's main layouts. Motifs stay, evolve, or empty with the board.

  **Unpinned decks change face.** A deck that does not set `slide.layout` can land on a different chapter, ending, and decoration than it did in 0.20. Pin the layout to hold a page exactly.

  `stage` locks `poster-center`, `one-word-chapter`, and `release-close-ending`, and stays motif-empty. `lecture` locks `board-head`, `chalk-rule-chapter`, and `next-lecture-ending`, and keeps the chalk-tray frame. `swiss` locks `institutional-block`, `decimal-index-chapter`, and `resolution-ending`, puts chapter on cold paper, and keeps the right-edge ticks cover-only. `memo` locks `memo-head`, `issue-line-chapter`, and `decision-close-ending`, and keeps the red double rule. `playbill` locks `bill-head`, `day-bill-chapter`, and `ticket-cta-ending`, and inverts the ending so the date chip yields. `museum` locks `poster-center`, `hall-label-chapter`, and `exit-word-ending`, and stays motif-empty.

- 59dc565: `render` and `preview` no longer require `-o`. Omit it and the files land in `.pptpress/<deck>/` at the project root, git-ignored locally on first create. An explicit `-o` is unchanged.

### Patch Changes

- 8677e76: Cartesian y-axis titles that carry Latin or digits go back to the header row. Only a pure CJK title still stacks on the left. Line charts drop endpoint value labels past four series, and warn past eight.
- 887bbc3: CLI Windows hardening: parse argv with node semantics under Electron, hide child consoles, refuse unrecognized `.cmd` shims, honor HTTP_PROXY via undici, block private gallery downloads, and unwrap `file://` asset paths.
- e93789a: Flowchart layout no longer uses dagre. Ranks come from a longest-path layering plus one barycenter sort inside the engine. Connectors, fan-out, and edge-label rules stay the same. The dagre and @types/dagre packages are gone.
- 9f012ee: Flowchart edge labels no longer repeat a node name, and they only render when that edge is actually drawn. A surviving label sits 6-10px off its own stroke and stays clear of arrowheads.
- 36ec86a: Keep component-form titles at 20px and body at 15px. Four badge cards wrap 2×2 instead of shrinking type to fit one cramped row.
- a6396db: Gallery review round 1. Decks no longer draw a five-dot progress track, crayon star stickers, leftover left-edge card bars, or `+n …` overflow debug text. Playbill date chips keep the date at the same 4° tilt as the chip on both SVG and PPTX. Callout emphasis is a top hairline. Layout and component spacing, overflow, and connector bugs from that review are fixed.
- cbc3de1: Gallery review round 2. A page now paints at most three decoration pieces, and content-page decoration recedes behind the copy. Callout is a theme-assigned morph (tint panel, hanging type, or a lead word) with no edge bars. image-lead-split is retired. Cycle, pill, and bubble nodes scale to their box. Sparse faces keep at most two rule groups.
- a25f8f2: Rail-numbered content pages on assigned themes no longer crush the heading's first character with the `{chapter}.{n}` badge. The layout still paints the badge. The heading treatment yields by the same 20px gap the native title already used.
- d495e1b: `pptpress audit` now attributes text to the decoration it is actually
  painted on. Text sitting on a solid decor shape (a seal, a corner square)
  used to be graded against the page background, reporting a passing ratio
  for unreadable text; backgrounds are now sampled across the run's own ink
  box, and exact-outline decor shapes register as candidates while
  crayon-stroke paths stay excluded. Across the full theme matrix this
  surfaces 5 real collisions and removes no findings.
- 327d8e0: In preview, KaiTi now tries macOS Kaiti SC and STKaiti before Songti. PPTX export still uses the Windows KaiTi face.
- f9eaf36: Internal rename only: `archetype` and `layout` were two names for the same
  thing, and only `layout` is left. Nothing renders differently — every SVG and
  every pptx part comes out byte-for-byte identical, and no golden fixture or
  snapshot was re-recorded.

  The 36 page templates moved from `src/svg/archetypes/` to `src/svg/layouts/`,
  so a layout's registry entry and the JSX that draws it now sit in the same
  file, in the same directory. Renamed along the way: `resolveArchetypeId` →
  `resolveLayoutId`, `{Cover,Chapter,Content,Ending}Archetype{,Id}` →
  `…Layout{,Id}`, `{COVER,CHAPTER,CONTENT,ENDING}_ARCHETYPES` → `…_LAYOUTS`,
  `MotifArchetype{,Id}` → `Motif{,Id}`, `MOTIF_ARCHETYPES` → `MOTIFS`.

  Not one of those names is an exported symbol — the JS internals carry no semver
  promise anyway (`docs/internal-api.md`), and the CLI, the IR schema, the deck
  project format and the exported SDK surface are all untouched. The one name
  that reaches the emitted `.d.ts` is the alias behind `ThemeDefinition["motif"]`
  (`MotifArchetypeId` → `MotifId`): it is not importable and its value union is
  unchanged, so nothing a consumer can write breaks.

  Two spellings of `archetype` deliberately stayed put, because changing either
  would change bytes: the `data-archetype` attribute in rendered SVG, and the
  `kind: "archetype"` literal in the layout registry. Both are noted in the code
  as fossils awaiting their own change.

- f2ea9fe: Confidentiality and date stay off cover and ending meta rows unless the deck declares `chrome: "full"`. Author, role, and organization stay. Omitted chrome leaves those two fields off the cover by default.
- 10e20ef: The agent skill now runs a one-round narrative interview before writing a spec. Four closed questions, a NARRATIVE_INTERVIEW gate that blocks the spec file while any axis is unanswered, and a packaged recommendation with a second candidate that differs in mechanism.
- 50c69e4: Numbered-pills badges shrink to 0.8 of the pill row, and the left count disc scales into the remaining box. Copy wraps instead of painting an ellipsis, and leftover overflow stamps data-truncated for the audit intercept.
- 9bce19e: The `playbill` theme no longer draws its top-right black ticket chip. On the
  design board that patch carried a date, a motif may not carry content, and the
  empty block that landed instead was decoration for its own sake. `playbill`
  joins `runway`, `museum`, and `stage` as a theme with no motif at all. Its
  heavy register now rests on the full-bleed yellow field and the 1.3 type scale.

  Content pages also sit closer to the heading above them. The air a settled
  block may take above itself is capped at one designed block gap instead of two,
  and `banner-heading` uses that same beat between its banner and its body. A
  single-table page that used to leave about 94px of blank between the banner and
  the first table row now leaves about 60px. The 38% golden share is unchanged,
  and so is the rule that leftover height sinks below the block rather than above.

- 155c704: The side-highlight content layout is retired. Pages that used its 176px primary side panel now pick another layout and use the full body width.
- 62acaa9: Stop DSH Desktop from loading pptpress's sharp into the same Electron process as the host's sharp. The optional sharp dependency now tracks the 0.35 line the host ships, and the preview tool always runs the CLI in a child process (real Node when inside Electron, never an in-process import).
- 12ef69f: `pptpress audit` no longer reports the organization name on a `split-diagonal`
  cover as low-contrast. The name is meta-information, the same tier as a
  copyright line or a page number, so its floor is 3:1 rather than the 4.5:1
  body floor it was being held to. On the `insight` theme the difference decided
  the verdict: the adaptive dark ink over `#E63946` measures 4.41:1, which was
  reported as a finding and is not one. Sixteen of seventeen themes cleared both
  floors and were never affected.

  The rendered color is unchanged on every theme — the fill opacity is now folded
  into the fill itself, which composites to the same pixels and lets the auditor
  read the color the page actually paints.

- 8dca766: The agent skill now carries a Sparse-page contract: climax, quote, and evidence pages pin sparse pin-only layouts and put the spoken script in `slide.notes`. This is not a new `pacing` value.
- 9f682c8: A deck with a `cycle` component exports again. Every `cycle` ever rendered was
  refused at the door: the ring is drawn around its own center, so half of its
  labels sit at a negative x in the group's local space, and the exporter sized
  their text boxes as if that local x were a position on the slide — producing
  zero-width and negative-width shapes, which the package audit rejects outright.
  The box is now measured after the group's transforms are folded in, which is
  the only point where the coordinate is a slide coordinate. Text lands exactly
  where it always did (the anchor was never the broken part), so no deck renders
  any differently — the shapes around the text are simply the right size now.

  `examples/team-onboarding.json`, shipped un-renderable since 0.19.2, renders.
  Every file in `examples/` is now covered by the test suite, so a broken one
  cannot ship quietly again.

## Unreleased

### Minor Changes

- Rename the product from pptfast to pptpress. The package is `@liustack/pptpress`, the CLI is `pptpress`, the skill is `skills/pptpress`, and the DSH plugin is `pptpress`. `PPTFAST_*` environment variables remain aliases for `PPTPRESS_*`. If `~/.pptpress` is missing and `~/.pptfast` exists, the old directory is copied to the new one and left in place. Project config `pptpress.config.json` still reads `pptfast.config.json`. Workspace default is `.pptpress`, and a leftover `.pptfast/` is reused when present.

## 0.20.0

### Minor Changes

- b67ec1e: Previews now live in `$PPTFAST_HOME/previews/<id>/` instead of the system temp
  directory, and their bookkeeping is no longer filed under a hash of the CLI's
  install path. Upgrading the plugin used to orphan every preview card written
  before it, and the operating system swept the rest within days. Nothing expires
  now: a rendered deck stays until its owner deletes it.

  A deck that is gone says so. The preview route separates "no such preview" from
  "present but incomplete" from "present but unreadable" from "could not read it
  just now", and the DSH card keeps whatever it can still prove — the thumbnails
  it already holds and the page count from the tool's own summary — instead of
  vanishing or opening a raw JSON error as a web page.

  `pptfast preview --html` gained `#page=N`, so an embedder holding only a URL
  can open the viewer on the page the reader clicked. Its filmstrip now fades at
  whichever end still has thumbnails behind it rather than cutting the last one
  off, and the stage measures the room it actually has instead of guessing at the
  chrome above it — which was leaving a grey bar down each side of the slide.

  `pptfast render` refuses a deck whose pages silently lost content, naming the
  pages. Drops that paint a visible "+N more" are unchanged; `--allow-dropped-content`
  ships the rest anyway.

  An empty `PPTFAST_HOME` is now treated as unset rather than as the current
  directory.

## 0.19.2

### Patch Changes

- README: "Make your deck in minutes, not hours." tagline and the first-DSH-deck-plugin honor line, both languages.

## 0.19.1

### Patch Changes

- 1259d95: Lead the README with what you get instead of how it works: a plain-language tagline, benefit-first highlights, and a repainted banner.

## 0.19.0

### Minor Changes

- e7405af: pptfast now ships in exactly two shapes: one skill folder any harness reads, and one DSH plugin. Installing it no longer involves installing a CLI.

  **The Claude Code plugin form is gone.** `.claude-plugin/` (marketplace and plugin manifests) delivered the same `skills/pptfast` folder that Claude Code already reads from `~/.claude/skills/`, at the cost of a third distribution shape with its own version mirror. Claude Code installs the skill folder like every other harness now.

  **The skill carries a version-pinned launcher.** `skills/pptfast/scripts/run.sh` and `run.ps1` resolve a runtime on every call: a compatible `pptfast` on `PATH`, then `npx` at the pinned version, then `bunx` at the pinned version, with a structured diagnosis and exit 78 when a machine has no JavaScript runtime at all. The pin is stamped from `package.json` at release time and guarded by drift tests, so an installed skill copy runs the release it was installed with instead of whatever happened to be on the machine. Both SKILL files drive the CLI through it, with a hand-run fallback for harnesses that forbid scripts. The DSH path is unchanged and still uses the CLI inside the plugin package.

  **Node floor raised to 22.19.** `engines` said `>=18`, which had not been true for a while: the repo's own test runner cannot start below 20, and CI was quietly running 20 and 22. The floor now matches what is actually supported and tested, and the CI matrix runs 22 and 24.

  Install docs are rewritten around this: the READMEs lead with the one line you forward to your AI, and manual install (`npm install -g`, building from source) drops to an INSTALL.md appendix for the rare case someone wants `pptfast` as their own terminal command.

- e10f852: Add `pptfast doctor`: one command that says whether this machine's install is actually healthy, with no network call and nothing written to disk.

  The check that earns it is skill drift. An installed skill is a copy, and that copy keeps its install-time launcher forever, so `pptfast --version` can report something months newer than what the harness actually runs and nothing surfaces the gap. Doctor scans the three skill directories INSTALL.md documents, reads the pinned version out of each copy's launcher, and names any copy that is behind, with the clone-and-copy line that refreshes exactly that one.

  It also reports the dsh plugin's version per profile (read from the profile's own `node_modules`, which is what really loads), Node against the `engines` floor, whether the optional `sharp` and `soffice` capabilities are present and what each one costs when missing, and a self-test render of a built-in deck through the real pipeline in memory.

  Exit code 1 is reserved for a hard failure: a runtime below the floor, or a self-test render that did not complete. Skill drift, a stale dsh plugin, and missing optional capabilities are warnings and still exit 0, because the write-IR to validate to render flow keeps working through all of them. `--json` prints the same report machine-readably.

### Patch Changes

- b6561e7: Revert the DSH plugin's v1 model tools and session attachments. The plugin is a single skill registration again.

  `pptfast_validate`, `pptfast_render`, and `pptfast_themes` did nothing the CLI cannot do, and each one cost a parameter schema, a collision-proof name, and an in-process loader to keep in sync with the render core. The first-page thumbnail the render tool pushed into the session is beaten outright by `pptfast serve`: one command opens a web page carrying every slide, reloading as the deck changes, with reviewer annotations coming back as `revision-request.json`.

  That serve loop is now the deck's review path in the skill, written as a numbered round: start the server as a background job, hand the user the localhost URL, read their annotations back, stop the job when the round ends. The skill routes every step through the CLI, and the README and INSTALL guide drop the tool tables.

  This also withdraws the internal exports the tools needed (`formatWarnings` from the SDK barrel, `resolveLocalAssets` from the node entry), and supersedes the unreleased `pptfast_render` acceptance fixes.

## 0.18.0

### Minor Changes

- 7a8e1f4: DSH plugin v1: three model-facing tools on top of the v0 skill registration, calling the packaged render core in-process (no subprocess, no npx).

  - `pptfast_validate` — deck IR JSON in; slide count + theme out, or a short path-annotated fix list (capped, never a raw zod error tree).
  - `pptfast_render` — deck IR JSON (+ optional `theme`/`seed`/`out_dir`) in; a native editable `.pptx` in the session workspace plus one preview SVG per page out. Deterministic: same IR + theme + seed reproduces the same bytes. Best-effort in-session preview: when the resolved model route declares image input, the first page is rasterized (sharp, optional dependency) and attached through the DSH attachment service; everywhere else it degrades to the on-disk SVG paths.
  - `pptfast_themes` — the 17 built-in themes, each with a one-line character note distilled from its own definition.

  The injected DSH skill preamble now points the model at the tools first (CLI stays the fallback), and the skill teaches the `pptfast serve --no-open` live review loop (background job, report the localhost URL, route `revision-request.json` back through the revision flow, stop the job when done).

## 0.17.0

### Minor Changes

- f486be3: Seal the programmatic SDK entry points (breaking, pre-1.0 minor by convention).

  **Breaking:** the `./node`, `./browser`, and `./validate` export subpaths are removed, and the package root is no longer a supported JS API. The self-contained browser bundles (`dist/browser.js`, `dist/validate.js`) are no longer built or shipped. Importing `@liustack/pptfast` from your own code was never announced and had no known consumers; it now carries no semantic-versioning promise (see `docs/internal-api.md`).

  The public support surface is: the `pptfast` CLI, the IR schema (`pptfast schema`), the deck project format, the agent skill (`skills/pptfast/SKILL.md`), and the DSH plugin. If you drove pptfast from JS, shell out to the CLI instead — its JSON-and-exit-code contract is covered by semver.

## 0.16.0

### Minor Changes

- 7073b26: `chart` grows from 5 subtypes to 9: `scatter`, `area`, `donut`, and `gauge` join `bar`/`line`/`pie`/`funnel`/`dumbbell`. This closes the strongest internal enrichment signal from the benchmark archive, where weak models across independent runs kept inventing these exact chart types by name (scatter and bubble each in 3 runs, area/donut/gauge each in 2) because the subtypes did not exist.

  `scatter` plots numeric x-y pairs, and an optional per-point `size` turns it into a bubble chart (one field covering both the scatter and bubble requests). `area` fills a line's region down to the baseline for volume or accumulation emphasis. `donut` is the dedicated ring form of pie, with an optional total printed big in its center (`center_total: true`). `gauge` shows one value's progress toward a target as a filled half-ring with the number centered, over an optional `{ min, max }` range that defaults to 0..100.

  The schema stays purely additive: four new `chart_type` values plus the optional `size`, `center_total`, and `gauge` fields, with per-subtype validation (`scatter` requires a numeric x, `gauge` requires a single value) and selection guidance in `chart_type`'s own `.describe()`. `skills/pptfast/SKILL.md` and `SKILL.zh-CN.md` document the new subtypes and the `gauge` vs `kpi_cards` boundary (a single completion metric versus several independent headline numbers) in both languages. The component union itself is unchanged, still 37 types.

  `scatter` and `area` are cartesian, so they render axis titles, gridlines, and multi-series legends like `bar`/`line`. `gauge` and `donut` are radial: their arcs emit the same annulus wedge idiom the existing donut already uses, so deck-audit attributes a gauge's centered number and a donut's center total to the ring hole (the page background), never the opaque arc fill, verified by a zero-finding 16-theme contrast sweep. Every one of the five original subtypes stays byte-identical in its rendered output (golden-pinned).

- a0d57bc: New component `tag_row` (the 38th): a wrapping row of 2-16 short label pills — a technology stack, a capability or skill set, a keyword set, the certifications a vendor holds. It closes the strongest clean gap in the internal invented-name evidence, where weak models across independent benchmark runs kept reaching for this exact component by name (`tag`/`pill` each in 2 runs, `chips`/`badge` each in 2, plus `chip_row`) and, finding nothing, either buried the labels in `bullets` or burned a whole slide brute-forcing dozens of non-existent type names. It is named after the models' own most-guessed name, the same way `logo_wall` was.

  Each item is a plain short string with a hard 24-character cap (a tag is a label, not a sentence — over the cap, validation points the author at `bullets` for a prose list or `row_cards`/`icon_cards` for items that carry their own description). An optional overall `title`, and an optional `emphasis: "first"` that draws the first tag in the theme accent as the primary one among the rest (the same field and semantics as `image_grid`).

  Rendering reuses existing machinery only: pills flow-wrap using the codebase's exact per-character width model, so a CJK/Latin-mixed label ("基于 Kubernetes Operator") is measured and wrapped correctly, and one uniform font size is picked as the largest that fits the height budget, with a single over-long tag truncated rather than allowed to overflow. A default pill is `colors.surface` with `colors.text` ink; the emphasized pill is `colors.accent` with a readable ink — both text colors clear WCAG 4.5:1 against their own pill on all 16 built-in themes (verified by a zero-finding contrast sweep), so the component renders no low-key `colors.muted` text and needs no contrast exception.

  `skills/pptfast/SKILL.md` and `SKILL.zh-CN.md` document the `tag_row` vs `bullets`/`row_cards`/`icon_cards` boundary (short labels versus described items versus a prose list) in both languages. The change is purely additive — one new component in the union, no change to any existing component's schema or rendered output.

- c63b90a: Add `vermilion`, the 17th built-in theme — a solemn official-report register (工作汇报 / 述职 / 年度总结) and the first theme designed Chinese-first. Vermilion red primary (`#C8102E`) + gold accent (`#D4A017`) on a warm off-white ground, a SimSun masthead heading, and square, restrained `radius: 2` corners.

  The red identity lives where the contrast architecture allows it: chapter pages are full-bleed vermilion with white headings picked by `readableOn`, while cover/content/ending stay warm off-white so the shared `text`/`muted` tokens clear the registration-time contrast floor (a red cover would force light text tokens that then fail on the light content pages). The cover still reads red-and-gold through its structural archetypes and the new `vermilion-motif` — flag-like ribbon arcs plus a fan of gold rays, deliberately abstract with no political symbols.

  `vermilion` declares its own `layoutTendencies` (chapter `banner-chapter` + `rail-chapter`, ending `rail-ending`) so its official-report structure — the red section divider, the progress rail, the structured contact close — reads distinctly from every other theme. Every other built-in renders byte-identically to before.

## 0.15.0

### Minor Changes

- b6364c9: Brand extraction: `pptfast brand extract <file.thmx|.potx|.pptx> -o my-brand.theme.json` extracts brand colors and fonts from a user's own Office template into a pptfast theme file — entirely locally, the file never leaves the machine. The new `--theme-file <path>` flag loads such a file on `render`/`validate`/`audit`/`preview`/`serve`, and a deck project's `theme.json` auto-loads on every command with zero flags. Loading goes through `registerTheme`, so its contrast floor refuses an unreadable palette with the failing token, ratio, and background named; a custom theme can never shadow a builtin id. SDK: `extractBrandTheme`, `parseBrandThemeFile`, `registerBrandThemeFile`, `BrandThemeFileSchema` (all browser-safe).
- 440ded2: New `logo_wall` component (the IR's component union grows from 36 to 37): lays 4-12 organization/brand logos out on an even wall — a sponsor wall, a client roster, a press/"as seen in" media wall, a partner strip. Closes a real gap the probe evidence gate confirmed twice, on two orthogonal render defects. Forced onto `image_grid`, a set of logos breaks two ways at once: its equal-width cells cover-crop, so a wide wordmark loses its own text ("Northbridge Robotics" → "NORTHBR"), and it paints no backing behind a real asset, so a transparent single-ink logo — how press kits actually ship them — lets the slide background show straight through, and a white-ink logo on a light theme vanishes into an empty box. One model even burned its whole agentic round budget brute-forcing 450+ non-existent component names (`logo_wall`, `press_wall`, `media_wall`…) without ever finding one that renders. `logo_wall` draws every logo contain-fit (never cropped) on its own auto-generated neutral backing panel — a mid-neutral derived from the theme via the same `mixHex(surface, readableOn(bg), …)` token blend `device_mockup`'s chrome already uses — so both a near-black and a near-white logo stay legible on the same wall on any of the 16 themes. Each item is a required `asset_id` plus an optional `label` (the organization's name, doubling as the logo's accessibility text when the asset carries no alt, and as the visible fallback if the asset is missing — never drawn on top of a present logo); an optional overall `title`. No grayscale/recolor option (retinting someone's logo is a trademark risk), no per-logo link, no size/weight tiers — every logo gets equal weight. 4 is a hard floor (for 1-3 logos use `image` or `image_grid`) and 12 a hard ceiling (past 12 each logo shrinks below a legible size — split across multiple `logo_wall` slides).

## 0.14.0

### Minor Changes

- e74334b: New `cycle` component (the IR's component union grows from 34 to 35): lays 3-8 stages out on a closed ring with arc-arrow connectors, for a process that has no endpoint — it loops back to its own start (PDCA, a product lifecycle, a flywheel, a seasonal cycle). Closes a gap the probe evidence gate confirmed twice: forced to draw a closed loop, `flowchart` either paints the closing back-edge as a long stray line/arc crossing the whole diagram (dagre routes it like any other edge, with no notion that this one is special), or the model gives up on structure entirely and falls back to `steps` plus a sentence doing the structural work in prose instead of the picture ("this cycle continues, re-design loops back to design"). `cycle`'s geometry is a pure function of the stage count — equal angular steps around a ring, a single SVG arc (`path` `A` command) connecting each pair of adjacent stages, the closing edge (last stage back to the first) drawn by the exact same code as every other edge, not a special case. Fields: `items` (3-8 entries, each a required `label` and an optional `description`), an optional overall `title`. No `direction` field (stages always run clockwise) and no center-text slot — the schema stays deliberately minimal pending real evidence either is needed. `skills/pptfast/SKILL.md`/`SKILL.zh-CN.md` document the `flowchart` vs. `cycle` selection test (does the process reach an endpoint, or does it loop back to its own start) in both languages.
- b64e8ff: New `device_mockup` component (the IR's component union grows from 33 to 34): frames an existing image asset inside a themed device chrome — a browser window (top bar with traffic-light dots, an optional address-bar `url` text) or a phone (notch + home indicator) — instead of the bare bordered rect `image` renders. Closes a real gap the probe evidence gate confirmed twice: a model asked to show "real, running software" on a slide could only paste a plain screenshot and try to talk its way around the gap in the notes/heading text ("it's not a mockup", "the actual in-app dashboard") — no component let it actually render one. The screen area reuses `image`'s own asset-resolution, cover-crop, missing-asset placeholder, and alt-text wiring verbatim; only the frame is new. `url` only applies to `device: "browser"` (a phone has no address bar) — setting it on a `phone` mockup is a hard schema error, not a silently-ignored field. Chrome colors are entirely theme-tokenized (no author-facing style options): the address-bar text renders at the same B-tier meta-information contrast floor (3:1, not the usual 4.5:1) a copyright line or page number already uses, since it's real but deliberately understated information, not page content.
- 610b844: New `people_cards` component (the IR's component union grows from 35 to 36): lays 2-12 people out on an equal-weight card grid, each card a deterministic initials badge (derived from `name`, no photo asset needed) plus name and optional `role`/`org`. Closes a gap the probe evidence gate confirmed twice: a narrow first case (a 5-exec team intro where `row_cards`/`icon_cards` held every text field but had no identity-anchor axis at all), and a harder, machine-checkable second case — a 9-speaker conference lineup that blows straight through both siblings' schema-level `.max(6)`; the only single-shot model call that returned valid IR split the roster into two unlabeled "(1/2)"/"(2/2)" pages with no semantic grouping behind the split. `people_cards` closes both: a dedicated initials-badge identity axis, and 12-person headroom that holds the full 9-speaker lineup on one page with margin. The badge's initials derive from a pure, independently-tested function (`deriveInitials`, `src/svg/components/people-initials.ts`): a Latin name takes the first letter of its first two words, a single Latin word takes its own first two letters, a CJK name takes only its first character (surname, never two). Badge fill color rotates through the theme's `chartPalette` by each person's own list index — deterministic, not seed-derived — with badge ink resolved via `readableOn` against each badge's own fill. `skills/pptfast/SKILL.md`/`SKILL.zh-CN.md` document the `people_cards` vs. `row_cards`/`icon_cards` selection test (is the content fundamentally about people) in both languages.

### Patch Changes

- 104cb63: Fix a rendering defect in the `assertion_evidence` arrangement (`AssertionEvidence`, used by `narrow-column`/`quiet-frame`/`bento-panel` and any other content archetype that passes `slide.arrangement` through): when the enlarged "evidence" component's own measured height exceeded the space its budget left after reserving room for the supporting components below it, the evidence component rendered at full height anyway while the supporting stack still started where the (too-small) original budget placed it — the two visibly overlapped. Reachable with any `EVIDENCE_TYPES` member that carries a fixed or capped natural height (`device_mockup`/`image`'s shared 340px height cap, or a `chart` with axis-title/legend bands on top of its fixed plot height) alongside a support component tall enough to squeeze the remaining budget below that cap.

  Fix: the support stack now gets a hard, arithmetic-derived floor (enough room for at least one item plus its own "+N more" drop-pill, both fully inside the box), and any deficit needed to protect that floor comes out of the evidence side instead — evidence is scaled uniformly to fit its own budget, reusing the same measure→scale→center technique `content-image-lead-split.tsx`'s `renderVisualComponent` and `content-stacked-poster.tsx`'s `renderPosterSlot` already use for this exact "component might be taller than its box" problem (none of `image.tsx`/`chart.tsx`/`device-mockup.tsx` read `box.h` on their own). Every other case (evidence already fits its original budget) is untouched — same computation, byte-identical output.

- 4c9a472: `fashion-masthead` (the runway cover archetype)'s org/date meta line now derives its ink through `metaInk` and carries `data-contrast-tier="meta"`, closing a leftover from the contrast-policy wave. It guarantees the B-tier 3:1 contrast floor against the primary block it actually paints on every theme — including `insight`, where the previous fixed-opacity dimming measured 2.886:1, a real miss no existing test caught. 15 of 16 themes render byte-identical output; `insight`'s meta line ink changes from `#621f28` to `#591d26`. The now-redundant `tech`/`fashion-masthead` contrast-audit allowlist entry is removed.

## 0.13.0

### Minor Changes

- d011fa0: `assets.images[].alt` now flows all the way to the exported PPTX: an `image` component whose asset has `alt` text exports it as the shape's standard accessibility description (`p:cNvPr@descr`, what PowerPoint's "Edit Alt Text" reads and writes). An asset with no `alt` exports byte-for-byte unchanged. The package audit gains a matching hard-gate rule (`image-alt-dropped`) that fails the export if an IR alt somehow doesn't make it into the package, and `pptfast asset-brief` items now carry `alt` alongside their other per-asset fields when the source asset has one.

  Scoped to the `image` component this round — `image_grid`/`image_compare` and background asset specs already carry `alt` through the same resolved-asset map but don't yet emit it, a natural follow-up of the same shape.

- dbdf8ad: A new `pinOnly` layout tier and its first member, `quote-stage`: a thesis/quote page where a single oversized heading is the entire visual, with at most one short attribution component (capacity 1). Pin-only layouts never appear through auto-selection — set `layout: "quote-stage"` explicitly on a content page to use one, the same way an image takeover is opted into today.

  Two new `validate` hard errors, scoped strictly to pin-only layouts: `pin_only_over_capacity` fires when a pinned pin-only layout carries more components than its declared capacity (an ordinary layout pinned over capacity still only warns, unchanged), and `pinned_heading_overflow` fires when a pinned layout's heading still truncates at its minimum render size (quote-stage is the only layout that declares this check today). Both point to splitting the content or removing the pin.

  Layout registry count: 35 archetypes to 36 (35 auto-selectable + 1 pin-only) + 4 image takeovers.

### Patch Changes

- 8adeea7: `assets.images[].alt` now flows to the exported PPTX `descr` from every remaining `<image>` emission site, closing out the A11Y-01 alt chain: the 4 image-takeover layouts (`image-split`/`image-top`/`image-annotate`/`image-bottom`, previously bypassed the generic `image` component entirely), `image_grid` (each cell's own asset), `image_compare` (each side's own asset), and asset-kind slide backgrounds. An asset with no `alt` still exports byte-for-byte unchanged at every one of these sites. The `image-alt-dropped` package-audit rule is widened to match, now also checking `image_grid`/`image_compare`/background asset bindings, not just `image`-type components.
- 0184d72: Documented a capability boundary that the "editable PPTX" claim was leaving implicit: shapes and text runs (including the ones a `chart` or `data_table` component draws) are real, restylable, retypable PowerPoint objects, but pptfast does not produce a native PowerPoint chart part or `<a:tbl>` table object, so a chart's or table's underlying numbers are not editable inside PowerPoint the way a native chart/table would be. README.md/README.zh-CN.md now state this plainly next to the editability claim, and `skills/pptfast/SKILL.md`/`SKILL.zh-CN.md` gained a matching rule so the skill never tells a user otherwise. No code or rendered output changed.
- 4b96f23: Fixed two contrast defects and formalized the policy that catches their class going forward.

  Ending-page copyright lines (`banner-ending`/`rail-ending`) now derive their color from the theme's own `colors.muted` through a new `metaInk` helper, replacing two hardcoded cross-theme gray constants that could render unreadable on a theme those constants never accounted for. Copyright text carries a `data-contrast-tier="meta"` marker so the audit checks it against a 3:1 floor instead of full body text's 4.5:1, since meta-information text like a copyright line is real content a reader can look up on demand, not decoration, but is deliberately understated.

  `constellation-ending`'s trailing heading period now falls back to the heading's own ink when the accent color it used to render in doesn't clear contrast against the page background, closing a case where the period could render nearly invisible. A new stress-fixture variant exercises a period-ending heading (closing an overflow-coverage blind spot no fixture ever triggered), while the contrast regression itself is locked by a dedicated 16-theme sweep in `deck-audit.test.ts`.

  `docs/contrast-system.md` documents the resulting three-tier contrast policy (content text, meta-information text, pure decoration) that governs both fixes and every future low-contrast call.

- 7dae8f9: Rebalanced consulting's and journal's structural-personality declarations (`layoutTendencies`), fulfilling a known limitation the theme-structure wave's own changelog flagged: under the default `briefing` narrative strategy, consulting's cover/ending and journal's chapter/ending each named an id `briefing` already favors, so those axes carried no real weight beyond an undeclared theme and the theme's character showed on only 1 of its 3 identity page types.

  Both themes keep their native id on every axis (still the historically-accurate register for the other four strategies) and gain a second, honest id on each dead axis: consulting adds `left-anchor` to cover and `rail-ending`/`tone-adaptive-ending` to ending; journal adds `roman-chapter`/`tone-adaptive-chapter` to chapter and `poster-ending` to ending. Under `briefing`, all three of each theme's identity axes now carry real selection weight.

  This shifts which archetype a fixed seed's auto-pick lands on for decks that don't pin every cover/chapter/ending `layout` explicitly (the intended effect — pinned layouts and the other 14 built-in themes are unaffected, byte-for-byte).

## 0.12.0

### Minor Changes

- cf29423: `pptfast asset-brief <target> [--json]` and the SDK function it wraps, `buildAssetBrief(ir)`: an image-generation brief for every `image` component in a deck. Each entry carries the component's real rendered frame (x/y/w/h + aspect ratio, extracted from an actual off-screen render pass — never a hand-copied layout constant, so it can't drift from what the renderer actually draws), its fit/crop mode with a safe-zone note, suggested generation pixels (2× the frame), the resolved theme's palette and mood, and a paste-ready English prompt. An `asset_id` with no usable asset yet still gets a full entry (`missing: true`) — the deck's own generation to-do list — and a component the selected layout never actually draws is reported as `rendered: false` instead of silently dropped.

  Purely informational (no exit-code gate, same posture as `pptfast validate`'s placeholder note) and zero renderer changes — the brief's geometry extraction runs against an in-memory IR copy with a dummy asset injected for whichever `asset_id`s the render pass needs, never the caller's own `ir` or the real export path. v1 covers `image` components only; `image_grid`/`image_compare` and `background` asset specs are a natural v2 extension of the same shape.

- 60fe193: Two new content archetypes: `image-lead-split` (an unconditional 60/40 visual/text column split — the pool's first genuinely unequal, co-equal-column composition) and `split-band` (a full-bleed horizontal header band over an ordinary body band — the pool's first horizontal split; every other content archetype divides the page into vertical columns or not at all). Both reuse existing letterbox-scaling, contrast, and audit machinery rather than introducing new mechanisms.

  The content archetype pool grows from 10 to 12. Both new archetypes are wired into auto-selection's existing beat and strategy weighting: `split-band`'s full-bleed header is an `anchor`-beat member (the same "banner rect is the heading" register as `banner-heading`), and `image-lead-split`'s narrow text column paired with a co-equal visual column is a `breathing`-beat member (the same "spacious by construction" trait `narrow-column` already has). Neither joins any narrative strategy's own layout tendencies — both are deliberately strategy-neutral, the same treatment `tone-adaptive-content` gets, since their defining traits (asset availability, chrome/visual weight) aren't tied to one argument style over another.

  Practical impact: a deck's automatic layout selection reads from the theme's whole content pool with weighted sampling, so growing that pool from 10 to 12 members changes the realized pick distribution for existing decks that don't pin an explicit `layout` — the same kind of shift each previous content-pool growth wave has shipped as a minor bump. Decks that pin `layout` explicitly are unaffected.

- 79a8f90: `ThemeDefinition` gains an optional `layoutTendencies` field: a per-page-type soft weight (`{ cover?, chapter?, content?, ending?: string[] }`) naming the archetype ids a theme's author wants auto-selection to lean toward, composed with the existing narrative-strategy and beat weights via `max` (agreement corroborates a pick, it never compounds into a monoculture). It is a soft steer within a theme's own `layouts` set, never a second whitelist — a tendency can only reweight an id already curated into that set for the same page type.

  Six of the thirteen built-in themes (`consulting`, `insight`, `academic`, `tech`, `runway`, `journal`) now declare tendencies on their cover/chapter/ending pages, each toward the archetype family that is that theme's own native visual register (e.g. `consulting` toward its banner-assertion layouts, `journal` toward its masthead family). Practically, this means the same deck rendered under two different themes can now differ in _which layouts get picked_, not only in color and type — a fixed IR and seed rendered across all 13 themes previously produced one identical per-page layout sequence; it now produces seven distinct sequences.

  Known limitation this release ships with: because the composition takes the _maximum_ of the strategy, beat, and theme weights rather than stacking them, a theme tendency naming an archetype the active narrative strategy already favors adds no extra pull for that page. Under the default narrative, `consulting` and `journal` each have only one of their three declared identity-page tendencies free of that overlap, so their structural character currently reads through a single page rather than all three. The other four declared themes are unaffected, and every theme's character reads fully under narratives whose own preferences don't overlap. A later pass will rebalance those two declarations toward archetypes the strategies don't already favor.

  Fully backward compatible: the field is optional, and any theme that doesn't declare it — the other 7 built-ins, every custom theme registered via `registerTheme` before this release, and any deck whose pages pin `layout` explicitly — renders and selects exactly as it did before, byte-for-byte.

- 540ed62: Three new built-in themes, filling the highest-frequency deck scenarios the prior 13 didn't cover: `pulse` (clean, trustworthy, vital — mint-white and deep teal, for healthcare and life-science decks), `terra` (grounded, rooted, long-term — sand and olive, for sustainability/ESG decks), and `ember` (bright, ascending, ready to pitch — warm white and fire orange, for startup pitch decks). Each ships its own motif (a heartbeat line for `pulse`, contour lines and seed points for `terra`, rising spark particles for `ember`) and declares `layoutTendencies` on its identity pages, so a fixed deck rendered under any of the three picks a layout sequence distinct from every other built-in theme, not just a different color set.

  Built-in theme count: 13 to 16.

### Patch Changes

- 0170509: Two correctness fixes surfaced as byproducts of the probe evidence-gate analysis. `architecture` gained an optional `direction: "top_down" | "bottom_up"` field (default `top_down`, byte-compatible with today's rendering) — a bottom-up-authored narrative (e.g. a maturity ladder written low-to-high) can now be set to `direction: "bottom_up"` to paint right-side up instead of requiring the array to be hand-reversed. `comparison` now hard-errors at validate time when a row has more `cells` than declared `columns` — that shape previously parsed successfully but silently dropped the extra cell(s) at render, which lost real content; a row with fewer cells than columns is unchanged (still renders an empty cell).
- ebdea9d: Audit and text-fit correctness fixes. A component whose type bypasses `validateIr` (a hand-built or type-cast-but-invalid render input) now throws a named `PptfastError` pointing at `validateIr` instead of a bare `TypeError`. `matrix`'s grid cells now each carry their own audit box, so column overflow is visible to `pptfast audit` in every column, not only the last. Text painted over a gradient-filled `<polygon>` (e.g. a line chart's area fill) is now routed into the same real-pixel-sampling audit path solid shapes already get, instead of silently comparing against whatever color happens to sit underneath. Ellipsis truncation of mixed CJK/Latin text no longer cuts a Latin or digit run in the middle — the whole run now yields to the ellipsis, matching how such runs already wrap as one atomic unit.

## 0.11.0

> Includes everything staged for the unpublished 0.10.0 (its tag was retired before release — 0.11.0 is the first release carrying these changes).

### Minor Changes

- b23e931: `pptfast serve <target> [--port 4400] [--no-open]`: a live-reloading browser preview for deck project directories and bare IR files, serving the exact same review page `pptfast preview --html` writes to disk. Source changes (`deck.spec.json`/`pages/`/`assets/`, or the bare IR file itself) push a whole-page reload to the open tab over SSE, with a recoverable error banner in place of a crash on a mid-edit invalid save. The page's annotation panel now submits straight back to the deck directory as `revision-request.json` — the same file the download flow already produces, byte-for-byte — closing the agent↔human revision loop without manual file shuttling.

- 85a91d3: Multi-series charts now genuinely compare instead of silently dropping data: a vertical or horizontal `bar` chart with 2+ series renders each series as its own grouped bar per category instead of only ever drawing the first series, and a multi-series `line` chart now shares one value domain and one category axis across every series instead of each series scaling independently. A `bar` or `line` chart with 2+ series also gets an automatic legend (series name + color swatch) below the plot, truncating an overly long series name (`data-truncated`) and collapsing overflow entries into a trailing "+N more" marker (`data-dropped`) once too many series to list. A category (`x` value) repeated within one series now surfaces as an editorial quality warning instead of silently colliding with itself. Negative and mixed-sign values in a multi-series chart now anchor correctly at the shared zero baseline instead of producing invalid (negative) bar geometry. Single-series positive bar/line charts render byte-identically to before, and pie/donut/funnel/dumbbell are unaffected.

  New `data_table` component (the IR's component union grows from 32 to 33): a native, editable row/column table (2-8 columns, 1-12 rows, optional `highlight`/`total` row emphasis, and a footnote `source` line) for exact figures the audience reads row-by-row, rendered as real shapes — never a rasterized image. A row's `cells` may omit a declared column's key (renders an empty cell, plus an editorial quality warning naming the row and the missing key), but a key not declared in any `columns` entry is a hard schema error, since that signals a structural misunderstanding rather than incomplete data.

  Also fixes a `row_cards` bug where the "+N more" truncation marker could render past the component's own bottom edge when a card list was truncated to fit a tight box height — the marker's position now matches the budget that decided how many cards fit, with no extra unbudgeted gap.

### Patch Changes

- 9a50c75: Icon names now also accept `alert-circle` and `alert-triangle` — the older lucide-react spellings some AI agents still write from pre-training habit — resolving to the same icons as their current names (`circle-alert`/`triangle-alert`). The top-level `narrative` field also now accepts an `{id: "<preset>"}` object shape (e.g. `narrative: {id: "training"}`) as an alternate way to write a bare preset-name string, matching the `theme: {id: "..."}` shape already used elsewhere in the schema; validate/render prints a rewrite note when this rescue fires, the same way field-name synonym rescues already do. The exported `resolveNarrative` SDK function itself also tolerates the `{id}` shape now, silently — a direct SDK caller bypassing validate gets the rescue without a note. A narrative object that mixes `id` with an axis field (`strategy`/`pacing`/`audience`) is unchanged — still a hard validation error, since that combination is genuinely ambiguous.

  The published `package.json` now declares `"sideEffects": false`, letting consumer bundlers tree-shake unused modules aggressively — verified safe: the package has no bare side-effect imports and platform installation is always an explicit function call.

## 0.9.0

### Minor Changes

- cd2f321: registerTheme now validates that colors.text and colors.muted clear a 3.0:1 contrast floor (WCAG's large-text threshold) against the resolved default background for cover, content, and ending slides, throwing PptfastError with the offending token, slide type, measured ratio, and threshold when they don't (chapter is intentionally exempt — every chapter archetype already selects contrast-adaptive ink rather than painting these tokens raw); it also now emits a console.warn, never a throw, when a theme's resolved heading or body font falls back to the text-width estimator's conservative class-average model instead of an exact per-character table, so overflow-prone font choices are visible at registration time rather than only in rendered output. The field-alias rescue mechanism now supports more than one item-array per component type, letting sankey's `nodes` array rescue name/title synonyms for its label field (55 total synonym pairs, up from 53) alongside its existing links source/target rescue. Also fixed: matrix's bold card titles now measure their true bold width when fitting to the card, closing the one structure component the 0.8.0 bold-metrics fix round's sweep missed.

### Patch Changes

- 8c62a0b: Chart export and text-wrap correctness fixes.

  - A dumbbell row whose `from`/`to` values were nearly (but not bit-exactly) equal at large magnitude could throw during export — the connector's sub-pixel delta rounded to zero EMU and tripped the package-integrity gate for the whole deck, not just that row. The zero-length floor now triggers whenever both axes round to zero EMU, not only on bit-exact equality. Dumbbell's value labels (`from.y`/`to.y`) also now shrink/truncate to fit their box instead of rendering unbounded.
  - A heading that fuses an English/digit run directly onto CJK text with no space (a common bilingual idiom) could have that run split mid-character once the line ran out of room, with no visible truncation marker. Wrapping now treats such a run as one atomic unit — CJK's own line-breaking convention — and prefers a smaller, split-free font over a mid-run cut whenever one exists within the heading's own size floor.
  - Text painted over a gradient-filled shape was previously checked against whatever solid color happened to sit underneath in the contrast audit, instead of the gradient it was actually rendered on. It now routes through the same real-pixel-sample fallback a background photo already gets.

## 0.8.0

### Minor Changes

- f0fb885: Structure components wave 2: four new full-body components join `swot`/`bmc`/`waterfall`/`gantt` — `pest` (a political/economic/social/technological macro-environment scan), `five_forces` (Porter's Five Forces hub-and-spoke competitive analysis), `heatmap` (a value-driven color grid with a theme-derived sequential ramp and per-cell accessible ink), and `sankey` (a layered, quantity-proportional flow diagram exported as native editable vectors — zero `<p:pic>`, every band a real `<a:custGeom>`, a direct differentiation point against the rasterized-image treatment this chart type gets elsewhere). `COMPONENT_TYPES` grows from 28 to 32, `FULL_BODY_TYPES` from 4 to 8.

  - Two review-round fixes shipped with the components themselves: `heatmap`'s value-ramp dead zone (a narrow relative-luminance band where neither black nor white ink clears 4.5:1) is now pinned as an audit-visible regression rather than silently degrading, and `sankey`'s label-over-band contrast is measured against the real rendered alpha composite (with an opaque backing chip as a guaranteed fallback when no single ink clears every overlapping band), its node/band stacking order keyed to node id rather than authored array position, and its non-conserved-hub gap explicitly disclosed and covered.
  - Field-alias rescue (`COMPONENT_FIELD_ALIASES`/`COMPONENT_ITEM_FIELD_ALIASES`) and pyramid-strategy narrative-tendency membership — both deferred when the four components first landed — now cover all four, the same treatment `swot`/`bmc`/`waterfall`/`gantt` got (53 total synonym pairs, up from 40).
  - SKILL.md's component-selection table, README/README.zh-CN's full-body paragraph, and every stale "28 components" reference across docs and internal doc comments are updated to 32.
  - The browser-bundle bare-import scanner (`pnpm e2e`'s build-verification leg) is now syntax-aware instead of doing a raw text match, closing a false-positive class a `sankey` validate-error path collided with during development.
  - Full 13-theme contrast-matrix coverage, pathological-input export coverage through the real `generatePptx` + package-audit hard gate for all four, and a zero-findings e2e leg exercising all eight full-body components on one deck.

### Patch Changes

- 2afecab: Headings no longer overflow in PowerPoint. The width estimator gains exact per-character advance models for the exported faces (Georgia and Microsoft YaHei, both weights, extracted from real font metrics) with a conservative fallback for unmeasured faces — bold headings were previously estimated with regular-weight assumptions and could clip at the slide edge. Nine structure components additionally now pass their heading weight through the fitter.
- 1a9dffa: Validation now emits non-blocking editorial warnings when comparison, citation, or architecture content exceeds its editorial budget, alongside the existing hard geometric limits. Export hardening: the timestamp normalizer is enforced as the final patch in the export chain, and a determinism-seal violation now surfaces loudly instead of being swallowed by media dedupe's error handling.

## 0.7.0

### Minor Changes

- 0420c3c: P0 hardening wave: depth-axis robustness, input-trust surface, error-message quality, and export-byte-determinism hardening across the validate/render/export chain, plus a SKILL.md fix targeting the largest share of residual weak-model failures.

  - **Depth axis** (unbounded array fields, not deck breadth): `bullets`/`comparison`/`citation`/`architecture`/`timeline` text-stacking components now cap their vertical item stack to the component's own box height instead of overflowing the 1280×720 canvas — extreme item counts land gracefully with `data-dropped`/`data-truncated` markers instead of producing a non-integer EMU value that crashed package-audit. A horizontal-axis sweep also found and fixed a reachable negative-width crash in `kpi_cards` at high item counts. `bullets_overflow` now escalates from warning to hard error at item counts far past the pacing budget (previously only geometry-crash-adjacent extremes were caught, and only indirectly). `formatViolations` now groups and truncates package-audit's violation list (first 20 per rule + a total count) instead of dumping every line — a single pathological input used to produce a 2.5MB error string.
  - **Input trust surface**: `validateIr` now byte-sniffs image assets (PNG/JPEG/WebP/GIF magic bytes) instead of trusting the file extension alone, rejecting zero-byte, corrupted, or extension-mismatched assets as an error before they can silently reach the exported package (this covers both local file assets and fetched http(s) assets). A dangling `asset_id` — one that doesn't resolve against `assets.images` — now warns and names the missing key, closing what was previously a fully silent misconfiguration (a gray placeholder box with no error or warning anywhere in the chain). `auditDeck` now guards against raw, unvalidated IR input with a `PptfastError` pointing at `validateIr` instead of an opaque downstream crash, on both Node and browser platforms.
  - **Error-message quality**: icon and component-`type` enum validation errors now suggest the closest valid value ("did you mean 'circle-check'?") instead of dumping the full enum wall — a single typo could previously produce an error message over 24,000 characters long. The `scenario`→`narrative` v3-rename hint generalizes to the rest of the v2/v3 migration map (starting with `blocks`→`components`), and an "Unrecognized key" error now adds a general pointer toward where a misplaced field likely belongs (e.g. `components` under `slides[].components[]`).
  - **Whole-file export determinism**: every zip entry written across the export chain — pptxgenjs's own initial write plus every JSZip patch stage (gradient fills, `a:ea` CJK font slots, slide transitions, element animations, media dedupe) — now carries a fixed timestamp, and `docProps/core.xml`'s `<dcterms:created>`/`<dcterms:modified>` are pinned to the same fixed instant. Rendering the same IR twice, even across a real multi-second gap, now produces a byte-identical `.pptx` (verified via whole-file SHA256), replacing jszip's prior default of stamping every entry with the real wall-clock instant it was written — content was always deterministic, but the packaged bytes were not.
  - **`skills/pptfast/SKILL.md`**: the `cover`/`chapter`/`ending` boundary-page rule ("these page types never render `components` or `footnote`") moved from a mid-Phase-3 aside to Phase 1, with a concrete wrong/corrected page-JSON example — a benchmark rescoring pass found this single misunderstanding behind 60% of residual weak-model validate failures.

- 86d8dec: Variety wave: the deterministic engine now varies real composition, not just paint.

  - Page-level `beat` (anchor / dense / breathing) is a live selection signal — declared beats weight the layout pick (composed with strategy weights via max, never compounding), while decks without beats render byte-identically.
  - Theme motifs rotate within style-compatible candidate sets per page and seed instead of one fixed sticker per deck, with a decor-visibility guard, and chart palettes shift phase by deck seed.
  - Cover/chapter/ending pages take on the narrative strategy's character through soft selection weights, and pyramid/briefing content tendencies now genuinely differ.
  - Three new content archetypes (side-highlight, asymmetric-triptych, quiet-frame) grow the thinnest pool from 7 to 10, raising realized layout entropy and cutting repeat rates.

- 339136b: Browser distribution wave, task 1: `@liustack/pptfast` now ships two additional, fully self-contained ESM entries alongside the existing bundler-oriented default — closing the gap between "the SDK's dependency closure is browser-safe" (always true) and "the published package actually loads in a browser" (not true until now, per a real-Chrome investigation that found a bare `<script type="module">` failing at the very first `import`).

  - **`@liustack/pptfast/browser`** — the full engine (`validateIr`/`generatePptx`/`auditDeck`, including the `{ pixels: true }` OffscreenCanvas path), every dependency inlined (react + react-dom/server + zod + jszip + dagre + pptxgenjs, ~1.7 MB raw / ~455 KB gzip). Loads with a bare `<script type="module">`, no bundler, no import map. Verified against a real Chrome tab: identical console behavior to the Node CLI and byte-identical `.pptx` output.
  - **`@liustack/pptfast/validate`** — `validateIr` and its own supporting exports only (`formatIssues`/`formatWarnings`/`irJsonSchema`/`styleJsonSchema`/`listThemes`/the IR and style zod schemas), with the render/export chain (`react`, `react-dom/server`, `pptxgenjs`, `jszip`, `dagre`) excluded from the bundle by construction, not just unused at runtime (~730 KB raw / ~155 KB gzip). For an "embed a validator" page that checks pasted/edited IR JSON and has no reason to carry a renderer.
  - The default `"."`/`"./node"` entries are unchanged — `dependencies` stay external there, the correct default for a bundler consumer.
  - A new build-verification pass (wired into `pnpm e2e`) parses both new bundles post-build and asserts zero bare import/require specifiers, generous size-budget smoke bounds, and tree separation between the two entries — the regression guard for the exact failure class the investigation found.
  - README/README.zh-CN gain a Browser section (quickstart for both new subpaths, the bundler path, and honest caveats: assets must be `data:` URIs or CORS-readable `http(s)` URLs, `--pixels`-equivalent auditing needs `OffscreenCanvas`). `docs/architecture.md`'s platform-seam section gets the distribution story.

## 0.6.0

### Minor Changes

- 4604367: Chart `axes` field now renders. `x_title`/`y_title` draw as fitted axis titles on bar (both directions) and line charts, with space reserved only when present. `show_grid` toggles the existing bar/line gridlines and adds an opt-in vertical grid for horizontal bars. Non-cartesian chart types (pie, funnel, dumbbell) report a non-blocking validate warning instead of silently ignoring the field.

## 0.5.0

### Minor Changes

- Audit chain, CJK font identity, and text-fit hardening.

  - Package-integrity hard gate on every export (9 OOXML invariants, no opt-out) plus an optional pixel-contrast audit (`pptfast audit --pixels`, Node via sharp and browser via OffscreenCanvas) with an explicit `checks` field — an unchecked pass can never read as a pass.
  - East-asian typeface slots (`a:ea`) declared on every text run, so CJK glyphs under Georgia/Consolas render in a controlled font instead of PowerPoint's silent per-glyph substitution.
  - `validate` moves to dual-threshold severity: editorial budgets warn without blocking, geometric content-loss ceilings block. Long bullet items that render fine no longer fail generation.
  - Exact mono width model for code blocks (measured Consolas metrics), universal bullet wrap budgets across all styles, matrix axis-title fitting, and a heading truncation signal the audit can see.
  - Chart robustness: zero/negative data values, mixed-sign dumbbell domains, and extreme magnitudes all export cleanly. Donut/pie center labels attribute contrast against the real sector geometry, not a bounding box.

## 0.4.0 (2026-07-20)

Narrative vocabulary v4 — `narrative`/`strategy`/`pacing`/`beat`, `deck.spec.json`, IR v4 with a `migrate` command for v3 projects. Benchmark-driven fixes: deterministic exports, audit attribution overhaul, CJK copy cleanup, boundary-page hard gates, truncation visibility markers.

## 0.3.0 (2026-07-19)

Keynote-style flat rendering, weighted deterministic layout selection with seed-stable revisions, 13 themes with a real-contrast ink system, deck-project workflow (spec + pages, assemble/disassemble), deterministic audit, speaker notes, preview overlay with annotation export, 28 components including SWOT/BMC/waterfall/gantt.

## 0.1.0 (2026-07-17)

Initial release — semantic IR to native editable PPTX via an SVG dialect compiler.
