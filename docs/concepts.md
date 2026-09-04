---
summary: 'The four public nouns in pptwise: theme, spec, component, and kind, plus the theme-menu contract that connects them'
read_when:
  - first time touching the pptwise vocabulary
  - deciding whether a fact belongs to a theme, spec, component, or kind
  - changing theme menus, pacing budgets, decoration, or branding
---

# Concepts

pptwise follows one causal chain:

```text
intent -> narrative -> theme -> spec -> fill -> render
```

Intent states who the deck is for, what outcome it should produce, whether it will be presented or read, and how much time it has. Narrative chooses the argument, pacing, and tone. Theme is bound before the spec. The spec orders semantic page moves from that theme's menu. Components fill those moves. Rendering turns the bound inputs into editable PowerPoint.

## The four public nouns

### Theme

A theme is one self-contained version 2 file. It owns the full visual system: style tokens, optional brand tokens, occasion metadata, identity strength, and a menu. There is no base theme, partial theme, or load-time inheritance. Reuse happens by copying.

Twenty-four factory presets are starting points. A workspace theme becomes independent the moment it is copied.

### Spec

`deck.spec.json` is the locked semantic contract for one intent. It binds one theme by name and owns narrative, page order, page type, content kind, heading, and optional summary. Page files cannot override those fields.

The spec is shaped by the bound theme menu. Changing to a theme with another menu means revisiting the spec. It is not a visual repaint.

### Component

A component is one typed content unit such as `bullets`, `chart`, `blockquote`, `image`, or `sankey`. Components fill pages after the spec has chosen their semantic move. The current IR exposes 38 component types.

The component is named `blockquote`. `quote` is reserved for the page kind.

### Kind

A kind is the semantic move made by one content page. It is the only load-bearing interface between spec authors and theme authors:

| kind | move |
| --- | --- |
| `points` | Advance an argument whose order matters. |
| `list` | Present peer items that can be reordered. |
| `comparison` | Put alternatives or dimensions in direct contrast. |
| `process` | Show directed steps, time, or a cycle. |
| `data` | Make a numeric set, chart, or table the subject. |
| `photo` | Make the image itself the content. |
| `statement` | Give the author's own proposition a full page. |
| `quote` | Center words attributed to another source. |
| `fact` | Build the page around one number. |
| `evidence` | Pair one assertion with one supporting exhibit. |
| `hierarchy` | Express containment, levels, or composition. |

Every content page requires exactly one kind, including content pages in a bare IR file. `cover`, `chapter`, and `ending` are boundary page types and carry no kind.

## Design stories

Every theme, kind, face, and component carries a design story: six fields that
say what it is, when to choose it, who it is for, and when not to choose it.

| field | what it says |
| --- | --- |
| `name` | The display name. A voice or a genre, never an id — see the naming rule below. |
| `story` | What it is, and which real-world form of print or staging it borrows. |
| `positioning` | When to choose it. |
| `audience` | Who speaks from it, and who is listening. |
| `notFor` | When not to choose it. |
| `lineage` | Optional. Where it comes from, what it references. |

`story` and `positioning` run to two sentences, the rest to one, and the
character caps in `src/design-story.ts` are checked by
`validateDesignStory()`. A theme keeps its story in its theme file, a kind in
`src/ir/kind-stories.ts`, a component beside its schema in
`src/ir/components/`, and a face on its layout definition.

Stories are public copy. They are the source for the gallery's design cards,
for per-theme documentation, and for the words a model reads when it picks a
theme or a component, so they are written as product prose in English: no file
names, no registry names, no internal ids, and nothing about the machinery
that draws a page. `validateDesignStory()` refuses a story that says `face`,
`layout`, `renderer`, `component`, `IR`, or `slot`. The gallery translates
them field by field in `evals/gallery/stories.zh.ts` and marks anything
untranslated.

**A name names a voice or a genre, never a vertical, a function, an audience,
or an organization type.** All four answer "who is this for" instead of "how
does this sound", and all four lock the object to one customer while what it
actually sells is a way of speaking: the report voice that opens with its
conclusion serves a hospital board as well as a bank. So the forbidden list
holds `enterprise` (an organization type), `kids` and `academic` (audiences),
`marketing` (a function) and `startup` (a company stage) alongside the
verticals. Words that name a form, a venue, or a craft — runway, museum,
playbill, ledger, clinic, almanac — are deliberately absent. Any of the
forbidden words is welcome in `positioning`, in `audience`, and in a theme's
occasions, which is where a story says who a voice happens to suit rather than
who owns it.

The rule is enforced on the public theme-file contract itself — a theme file's
`id`, `label`, and `story.name` are all checked when it is loaded — and again
by `src/naming-rule.test.ts` over the built-ins.

Two frozen baselines carried the objects that predate all of this: the thirteen
theme names written before the rule (`src/themes/legacy-names.ts`) and the
storyless objects (`src/design-story.test.ts`). Both are empty now. The thirteen were
renamed in one batch, so nine theme ids changed and every name answers to the
rule directly. A baseline is a licence, not a work list. Each may lose entries
and neither may gain one — the tests assert the contents against what they were
frozen with, so a new broken name or a new storyless object cannot be waved
through by appending a line.

A retired name is not a free name. The nine ids that batch removed
(`src/themes/retired-ids.ts`), and the five motif ids renamed with them, are
refused wherever a theme is named or resolved, and each refusal says the name
it became. A workspace theme, a preset copy, or a colour fork cannot take one
back: a reissued word would make every deck that names it read as valid again
while meaning a different theme.

## The menu model

A theme menu is a pure table. It maps `cover`, `chapter`, each offered content kind, and `ending` to exactly one face. A theme may offer only a subset of the eleven content kinds. Omission is a design decision, not an incomplete theme.

The selected face owns geometry, slots, physical capacity, self-adaptation, and the truth source for its configurable parameters. A menu entry supplies parameter values and may control motif or brand visibility. Authors never write face identifiers.

If a spec asks for a kind outside the bound menu, validation fails and lists the offered kinds. Validation, capacity checks, and rendering consume the same lookup result. See [Menu lookup](./menu-lookup.md).

## Capacity has two owners

Narrative pacing owns the editorial budget and body-text baseline. The face selected by the menu owns physical capacity. The effective page limit is the smaller value. Pacing never selects a face.

| pacing | body baseline | components | bullet items | bullet width units |
| --- | ---: | ---: | ---: | ---: |
| `dense` | 24px | 5 | 6 | 27 |
| `balanced` | 24px | 4 | 5 | 25 |
| `spacious` | 32px | 3 | 4 | 22 |

## Settled rules

1. Face code declares configurable parameters and their bounds. Menu entries supply valid values.
2. Menu lookup is one-to-one. It has no rotation or conditional branch.
3. Pacing controls editorial capacity and the body baseline, never face choice.
4. A kind outside the bound menu is a hard validation error.
5. Boundary-page component support comes from the bound face and is validated there.
6. Deck branding keeps `full`, `cover-only`, and `minimal`. Page silence belongs to the face or menu entry.
7. Page arrangement belongs to face self-adaptation, not IR.
8. Visual comparison uses `theme try` with a fixed sample. Render has no theme override.
9. `heading` and `summary` remain semantic spec fields.
10. Narrative recommendations guide theme choice and writing, not menu lookup.
11. Reusable facts, claims, numbers, images, and copy are working material, not a persisted selection format.
12. The component rename to `blockquote` affects only component type space. The page kind remains `quote`.

Decoration follows the same ownership discipline. A face may structurally suppress motifs. Otherwise a menu entry may silence or replace the motif. With no menu override, the theme's ordinary motif paints. Branding is independent. A face or menu entry can suppress the shared brand fragment even when the deck posture is `full`.

Changing colors always creates a fork and rederives the full token system. A same-menu fork can replace the binding inside the workflow. A different menu requires a return to the theme step, followed by spec and fill revision. The original theme remains unchanged.
