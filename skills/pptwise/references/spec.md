# Intent, narrative, theme binding, and spec

Read this before creating `deck.spec.json`, choosing a theme, or handling a menu mismatch.

The authoring chain is causal and one-way:

```text
intent -> narrative -> theme binding -> spec with kind -> fill -> render
```

## Read live vocabularies

Run these at the start of every deck task:

```bash
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

Each theme row in `themes --json` carries its `menu`. The keys of `menu.content` are the content kinds the theme offers, so read them there to learn whether a theme serves a kind. A kind missing from `menu.content` is drawn there as its nearest offered kind, see [Kinds a theme lacks](#kinds-a-theme-lacks). Never search the installed package's files for menus.

The IR component contract is read per page during fill with `pptwise inspect deck-dir/ --page <id>`. See `components.md`.

The command output and workspace files outrank this guide. Scan for an existing `deck.spec.json`, deck-local `theme.json`, workspace `themes/`, and supplied Office brand files before asking questions.

## Intent and narrative

Intent records who the deck is for, the result it should cause, whether it will be presented or circulated, and the available time. Narrative is the first decision made from that intent. It chooses argument strategy, pacing, and tone.

When essential facts are missing and a user is present, ask one compact round:

1. Who is the audience, and what should they decide, understand, or do afterward?
2. Will someone present it, or must it stand alone? How much time is available?
3. Should the argument lead with a conclusion, unfold as a story, teach a sequence, showcase an image or number, or read as a compact briefing?
4. Should pages be dense, balanced, or spacious?

Use `pptwise narratives --json` to map the answer to a named preset or to explicit `strategy`, `pacing`, and `audience`. Do not infer the narrative from brand colors. Say this package in one line with the outline, so one answer settles it.

## Choose, create, and bind a theme

Theme is the second decision and must be settled before the spec. A theme is one complete file with style, a page menu, optional brand rules, `occasions`, and `identity`. The menu serves a deliberate subset of the 11 content kinds.

Pick one theme by occasion first and identity strength second, and say why in one line with the outline. Draw candidates with the user's own cover title only when the user asks to see looks before choosing: with a `pptwise_themes` tool when the host has one, otherwise with the CLI:

```bash
pptwise theme try brief,swiss,memo --title "Q3 review" --subtitle "Board meeting" --json
```

With `--title`, `theme try` draws the cover and one content page in each named theme, any number of them or `all`, or with no names a shortlist of four to six for `--occasion <words>`, and prints a manifest that names one SVG per page plus `contact-sheet.html`. `--lang zh` or `--lang en` sets the language of the default content page. `--page <file>` draws one of the deck's own content pages instead, written as a page carries it, with its `kind`. A page a theme cannot draw is left out of that theme's row, and the manifest says why. Show the user the SVGs or the contact sheet. They are for the user: do not read them yourself to judge a theme. Without `--title`, `theme try` renders a fixed English sample deck under two to four themes.

Create means copy. Prefer a workspace-owned theme even when the starting point is a factory preset:

```bash
pptwise theme new --from brief --id acme-report
```

With an Office theme or template, choose the theme by occasion, then repaint it in the template's brand color and fonts. The theme keeps its menu, paper, and text:

```bash
pptwise brand extract corp.pptx -o themes/acme.theme.json --from bulletin
```

With an existing theme and a brand color, fork it with `--brand`. The fork keeps the menu byte-identical and repaints the palette around that color:

```bash
pptwise theme fork acme --brand '#0B5FFF' --id acme-blue
```

Theme names resolve in four levels:

1. The deck directory, including `theme.json` and named theme JSON files.
2. A workspace `themes/` directory while walking upward from the deck.
3. Installed content packs under `$PPTWISE_HOME/packs/`, installed by `pptwise packs sync` at setup.
4. Factory presets.

A workspace file of the same name shadows a pack theme. A pack theme never shares an id with a factory preset.

Bind exactly one name by writing it to `deck.spec.json` as `theme`. To freeze a workspace theme for one deck, copy the complete file into the deck directory as `theme.json` without changing its id. Deck commands then load it automatically.

<!-- generated:begin themes -->
### Complete factory preset catalog

This section is generated from the preset library and each preset menu. `identity` is the strength of the visual voice. `menu words` and the final column count content kinds only.

| id | label | occasions | identity | menu words | offered kinds |
| --- | --- | --- | --- | ---: | --- |
| `brief` | Brief | business | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `bulletin` | Bulletin | business, institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `thesis` | Thesis | education | medium | 11 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, `hierarchy` |
| `ledger` | Ledger | finance | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `rally` | Rally | marketing, event, entertainment | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `homeroom` | Homeroom | education | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `ink` | Ink | culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `terminal` | Terminal | tech | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `runway` | Runway | fashion | high | 8 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact` |
| `journal` | Journal | editorial | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `luxe` | Luxe | luxury, event | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `clinic` | Clinic | health | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `almanac` | Almanac | sustainability | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `ember` | Ember | startup | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `vermilion` | Vermilion | government, institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `crayon` | Crayon | kids, education | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement` |
| `museum` | Museum | museum, culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `stage` | Stage | keynote | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `lecture` | Lecture | education | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `swiss` | Swiss | institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `memo` | Memo | business, institutional | low | 11 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, `hierarchy` |
| `proposal` | Proposal | sales, business | medium | 9 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `fact`, `evidence`, `hierarchy` |
| `profile` | Profile | career | medium | 8 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact` |
| `recap` | Recap | review, career | medium | 8 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact` |
<!-- generated:end themes -->

## The 11 content kinds

`kind` states how a content page makes its point. It is required on every content page and absent from cover, chapter, and ending pages.

| `kind` | Use it when | Do not confuse it with |
| --- | --- | --- |
| `points` | Ordered reasoning advances step by step | `list`, whose items may be reordered |
| `list` | Peer items are displayed together | `points`, whose order carries the argument |
| `comparison` | Alternatives or sides need direct contrast | `hierarchy` for containment, `process` for direction |
| `process` | Steps, time, movement, or a closed cycle matter | `points` for an argument with no process relation |
| `data` | A set of numbers, chart, or table is the subject | `fact` for one number only |
| `photo` | The image itself is the content | `evidence`, where an exhibit supports a claim |
| `statement` | The deck author's own proposition gets a full page | `quote` for another speaker's words |
| `quote` | Words are attributed to another speaker or source | `statement` for the deck author's own voice |
| `fact` | One number carries the whole message | `data` for numeric structure across a set |
| `evidence` | One assertion is paired with one supporting exhibit | `photo` when the image stands alone |
| `hierarchy` | The page explains containment, levels, or composition | `process` for sequence, `comparison` for two sides |

Four boundaries settle most ambiguous cases:

- `statement`, `quote`, `fact`, and `evidence` differ by the speaking subject: our proposition, another person's words, one number, or a claim with an exhibit.
- `data` exposes structure across several values. `fact` creates impact with one value.
- `points` has progression. `list` can be reordered.
- `photo` makes the image the message. `evidence` makes the image serve the assertion.

## Write the spec

A valid deck spec opens with `cover`, closes with `ending`, and uses `content` or `chapter` inside. Every page has `id`, `type`, and `heading`. Content pages additionally require `kind`. `focus` may name a preferred component type. `summary` is a short content anchor for the fill step. `kicker` is a short label set over the heading, such as the occasion on a cover. Only a face with a place for it draws it, and validate names the face when it has none.

```json
{
  "version": "1",
  "filename": "q3-review.pptx",
  "narrative": "boardroom-report",
  "theme": "acme-report",
  "meta": { "organization": "Acme", "date": "2026 Q3" },
  "pages": [
    { "id": "cover", "type": "cover", "heading": "Q3 operating review" },
    { "id": "decision", "type": "content", "kind": "points", "heading": "Two actions protect the annual target" },
    { "id": "options", "type": "content", "kind": "comparison", "heading": "The focused plan wins on payback" },
    { "id": "economics", "type": "content", "kind": "data", "heading": "Margin recovers before year end" },
    { "id": "delivery", "type": "content", "kind": "process", "heading": "Three releases close the gap" },
    { "id": "close", "type": "ending", "heading": "Approve the focused plan" }
  ]
}
```

The spec contains no page geometry or render selection state. Do not add retired author fields. Page files later contain only fillable content and never repeat `type`, `kind`, or `heading`.

Run:

```bash
pptwise spec validate deck.spec.json
```

Fix hard errors until the command prints `OK`. A page count outside the range the pacing usually spans is a warning, not an error. When the user asked for a page count, keep it. Three or more consecutive content pages with the same `kind` produce an editorial warning.

## Kinds a theme lacks

A spec may ask for a `kind` the bound theme does not offer. `spec validate` prints a note, and the page is drawn as the nearest kind the menu offers whose face takes its components. A `fact` page is drawn as `data`, then `statement`. A `quote` is drawn as `statement`. An `evidence` page is drawn as `data` or `photo`, by its exhibit. A `hierarchy` is drawn as `points`. Every menu ends at `points` or `list`. The page keeps its kind, so a theme that offers it draws it on its own face again. Write the kind that is true to the page. Never relabel a page to steer its face.

## Switching theme

Switching theme is a name change: set `theme` in `deck.spec.json` and build again. Do not rewrite the spec or page files first. The build reports what the new theme handles differently:

- `drawnAs` lists the pages drawn as another kind.
- A warning names furniture (`kicker`, `stamp`, `tag`, `years`, `stage`) a face has no place for. It is left off and stays in the page file.
- Once a build has drawn every page whole, a later build under another theme still draws the deck. What the new faces cannot take (`fields`, `ballot`, a cover's components or footnote, a block beside a full-body one, the last items of a long list) is left off or cut, each with a warning that names the page, and the report's `writtenFor` names the theme that draws it whole. The page files keep everything. Deliver the deck and tell the user which pages lost what. Rewrite those pages only if the user wants them whole in the new theme.
- Without such a build, an error names what the new faces cannot take. Fix that page and build again.

A deck that froze its theme as its own `theme.json` keeps it: delete or replace that file to switch to a theme with another menu. A color fork of the same menu needs neither. When the user asks for other colors without naming one, fork two or three and draw them with `theme try` before binding one.

A very small deck may use one IR file instead of a deck project. It still follows the same chain. Its top-level `theme.id` is the binding, and every content slide still requires explicit `kind`.
