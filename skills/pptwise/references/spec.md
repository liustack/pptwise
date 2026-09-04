# Intent, narrative, theme binding, and spec

Read this before creating `deck.spec.json`, choosing a theme, or handling a menu mismatch.

The authoring chain is causal and one-way:

```text
intent -> narrative -> theme binding -> spec with kind -> fill -> render
```

## Read live vocabularies

Run these at the start of every deck task:

```bash
pptwise schema
pptwise schema --spec
pptwise narratives --json
pptwise themes --json
```

The command output and workspace files outrank this guide. Scan for an existing `deck.spec.json`, deck-local `theme.json`, workspace `themes/`, and supplied Office brand files before asking questions.

## Intent and narrative

Intent records who the deck is for, the result it should cause, whether it will be presented or circulated, and the available time. Narrative is the first decision made from that intent. It chooses argument strategy, pacing, and tone.

When essential facts are missing and a user is present, ask one compact round:

1. Who is the audience, and what should they decide, understand, or do afterward?
2. Will someone present it, or must it stand alone? How much time is available?
3. Should the argument lead with a conclusion, unfold as a story, teach a sequence, showcase an image or number, or read as a compact briefing?
4. Should pages be dense, balanced, or spacious?

Use `pptwise narratives --json` to map the answer to a named preset or to explicit `strategy`, `pacing`, and `audience`. Do not infer the narrative from brand colors. Confirm this package before choosing a theme.

## Choose, create, and bind a theme

Theme is the second decision and must be settled before the spec. A theme is one complete file with style, a page menu, optional brand rules, `occasions`, and `identity`. The menu serves a deliberate subset of the 11 content kinds.

Shortlist by occasion first and identity strength second. Compare two to four candidates with the fixed fitting-room sample:

```bash
pptwise theme try brief,swiss,memo
```

`theme try` renders the same fixed sample deck under every candidate. It is the only place to compare themes without binding a deck. Choose from the images, not from names alone.

Create means copy. Prefer a workspace-owned theme even when the starting point is a factory preset:

```bash
pptwise theme new --from brief --id acme-report
```

With an Office theme or template, choose the donor menu by occasion, then extract colors and fonts into one complete v2 file:

```bash
pptwise brand extract corp.pptx -o themes/acme.theme.json --from brief
```

With an existing theme and a requested color change, fork it. The fork keeps the menu byte-identical and rederives the full palette:

```bash
pptwise theme fork acme --primary '#0B5FFF' --id acme-blue
```

Theme names resolve in three levels:

1. The deck directory, including `theme.json` and named theme JSON files.
2. A workspace `themes/` directory while walking upward from the deck.
3. Factory presets.

Bind exactly one name by writing it to `deck.spec.json` as `theme`. To freeze a workspace theme for one deck, copy the complete file into the deck directory as `theme.json` without changing its id. Deck commands then load it automatically.

<!-- generated:begin themes -->
### Complete factory preset catalog

This section is generated from the preset library and each preset menu. `identity` is the strength of the visual voice. `menu words` and the final column count content kinds only.

| id | label | occasions | identity | menu words | offered kinds |
| --- | --- | --- | --- | ---: | --- |
| `brief` | Brief | business | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `bulletin` | Bulletin | business, institutional | low | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `thesis` | Thesis | education | medium | 11 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `evidence`, `hierarchy` |
| `ledger` | Ledger | finance | medium | 9 | `points`, `list`, `comparison`, `process`, `data`, `statement`, `quote`, `fact`, `hierarchy` |
| `rally` | Rally | marketing, event | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `homeroom` | Homeroom | education | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `ink` | Ink Wash | culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `terminal` | Terminal | tech | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `runway` | Runway | fashion | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement` |
| `journal` | Editorial Journal | editorial | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `luxe` | Luxe | luxury, event | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `heritage` | Heritage | culture, luxury | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `clinic` | Clinic | health | medium | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `almanac` | Almanac | sustainability | medium | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `ember` | Ember | startup | high | 7 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `hierarchy` |
| `vermilion` | Official Report | government, institutional | low | 9 | `points`, `list`, `comparison`, `process`, `data`, `statement`, `fact`, `evidence`, `hierarchy` |
| `crayon` | Crayon | kids, education | high | 6 | `points`, `list`, `comparison`, `process`, `photo`, `statement` |
| `arena` | Arena | entertainment | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `museum` | Museum | museum, culture | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `stage` | Keynote Stage | keynote | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `quote`, `fact`, `hierarchy` |
| `lecture` | Lecture Hall | education | high | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `swiss` | Swiss Institutional | institutional | low | 10 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `evidence`, `hierarchy` |
| `memo` | Decision Memo | business, institutional | low | 9 | `points`, `list`, `comparison`, `process`, `data`, `statement`, `quote`, `fact`, `hierarchy` |
| `playbill` | Playbill | event, entertainment | high | 9 | `points`, `list`, `comparison`, `process`, `data`, `photo`, `statement`, `fact`, `hierarchy` |
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

A valid deck spec opens with `cover`, closes with `ending`, and uses `content` or `chapter` inside. Every page has `id`, `type`, and `heading`. Content pages additionally require `kind`. `focus` may name a preferred component type. `summary` is a short content anchor for the fill step.

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

Fix hard errors until the command prints `OK`. Page count is checked against pacing. Three or more consecutive content pages with the same `kind` produce an editorial warning.

## Menu mismatch handling

If the spec requests a `kind` that the bound theme does not offer, validation fails and lists the available kinds. Handle it in this order:

1. Recheck the page's semantic posture. Change `kind` only when another offered word is genuinely correct.
2. If the page intent is fixed, choose or create a theme whose menu serves it.
3. If content was already filled, return to the theme layer. Keep useful facts, data, images, and copy fragments, then rewrite the spec and page files for the new menu.

Do not force a nearby word merely to pass validation. A menu gap is a theme decision, not missing geometry.

## Rebinding after work starts

A color fork with the same menu may replace the bound theme. Update the bound name and rerun spec validation, assemble, validate, audit, and render.

A theme with a different menu is not a repaint. It requires restarting at the theme layer and rewriting the spec. The CLI compares normalized menus directly and refuses an in-place different-menu rebind.

A very small deck may use one IR file instead of a deck project. It still follows the same chain. Its top-level `theme.id` is the binding, and every content slide still requires explicit `kind`.
