# Validation and review loop

Read this when filling pages, building, assembling a deck project, rendering, auditing, previewing, serving, or revising.

## Fill small batches

For each confirmed spec page, write `pages/<page-id>.json`. A page file may contain only `components`, `background`, `image_side`, `footnote`, `fields`, `stamp`, `tag`, `ballot`, `years`, `stage`, and `notes`. The spec owns `type`, content `kind`, `heading`, and page order. Repeating any locked field in a page file is a hard error.

Fill at most four pages, then build. Use a `pptwise_build` tool when the host has one, which also shows the user the pages drawn so far. Otherwise run:

```bash
pptwise build deck-dir/ --json
```

`build` runs assemble, validate, audit, preview, and render in one pass and prints one report. `status` is `ok` only when every check passed and the `.pptx` was written. Otherwise it is `needs_revision` and the command exits 1. Each entry in `errors` carries `stage`, `page`, `pageId`, the `file` to edit (`pages/<id>.json` for page content, `deck.spec.json` for what the spec locks), the `field`, and the check's own `message`, which says what to change. Audit findings add their `code`. Warnings sit in `warnings` and never block. A page not written yet is reported as such, and the audit waits until every page is written. `preview` names the drawn pages whenever validate passed. Fix every error at the named file, then build again. Do not convert the pages to PNG or read them as images to check them: the report is the check.

To run one check alone while working on a page:

```bash
pptwise assemble deck-dir/
pptwise validate deck-dir/
```

`assemble` merges the locked semantics and page content into IR v5. It does not write face choices or any other rendering decision into the project. A missing page file remains an accepted placeholder. An orphan page file, a locked-field conflict, or an unknown theme is a hard error. A kind absent from the bound theme menu is drawn as its nearest offered kind.

`validate` applies schema, component, asset, narrative, physical capacity, and editorial checks. Authored leftover-count phrasing and ellipsis substitutes are rejected here, before a page is painted. Fix errors until it prints `OK`. Warnings do not block output, but long headings, excessive density, dangling assets, and repetitive choices should normally be tightened before delivery.

A cover, chapter or ending sets its heading in a fixed place, and how long a heading fits there differs by theme, from about a dozen Chinese characters to over seventy. validate refuses a heading the bound face would cut or drop, and the error names the face and quotes how much of this very heading it holds on that page, counted in the heading's own characters (a Chinese heading) or words (any other), beside how long the heading is. Shorten the heading, or move part of it into the subheading when the face has one. The subheading is held the same way: validate draws the page with its face and refuses a subheading the face would cut or leave off, quoting how much of it fits there. A heading the face sets whole can still take the room its cards or list stand in, and validate refuses that page too, quoting the heading the face keeps them under. Last, validate draws each cover, chapter and ending page and refuses one its face would leave anything off: a list item or a button's words too long for the line the face sets them on, quoting the part that fits, or a block in a shape the face does not draw, such as a year-scale cover's timeline dated by quarter, or one carrying fields the face has no place for, such as text under a row card a cover sets as a pill. The error says what the face draws of each item and names every item that carries something else.

Content pages are drawn too. validate draws each content page the way render draws it, a plainer layout taking over included, and refuses one that would leave anything off or cut a heading, source line or a component's words. The error names the page, what would be lost (which block, how many items, which text is cut) and, when one more drawing finds it, what to take off: a text to shorten, how many items of a list the page holds, or a field the layout has no place for.

Speaker `notes` export as native PowerPoint notes and never paint on the slide.

## One deck, one final file

`build` writes the `.pptx` at `.pptwise/<deck>/<filename>.pptx`, named after the spec's `filename` (the deck directory's name when the spec sets none), the same path `render` uses, and only when every check passes. A build that does not pass removes the file an earlier build left there, so the file on disk always matches the sources. Deliver the `pptx` path from the report as it is: do not render it again, copy it, rename it, or export a second one. On DSH, hand it over with `present`. There is no render-time theme switch. The project spec is the binding.

`render` alone is for the two compromises below:

```bash
pptwise render deck-dir/
```

An unfinished project requires explicit `--draft`. Content that would be dropped remains blocked unless the user explicitly accepts `--allow-dropped-content`, which also lets the deck past validate's drawing of its content pages. Prefer fixing or splitting the page.

The first build of a deck also draws its cover and a content page or two in up to three other themes, listed under `alternatives` with each theme's id. To change themes, set `theme` in `deck.spec.json` and build again. The report lists pages drawn as another kind under `drawnAs`, warns about furniture a new face leaves off, and names in `errors` any page that needs a change. After a build that drew every page whole, a page the new theme cannot draw whole is drawn with what it cannot take left off and a warning instead, and `writtenFor` names the theme that draws it whole. `themeSource` says whether the bound theme is `builtin`, a `file`, or from a `pack`.

## Audit geometry

`build` runs the audit once every page is written. To run it alone:

```bash
pptwise audit deck-dir/
```

The deterministic audit checks overflow, out-of-bounds content, low contrast, overlap, truncation, dropped content, and repeated lead components. A finding exits with code 1 and names the page. A heading, source line or component text the theme's layout would cut makes a plainer layout draw the page whole (`stepped-aside`). A `content-truncated` finding with `"tier": "hard"` is text no layout could fit: shorten it or split the page. Restructure the content, then build again until it passes.

Add `--pixels` when cover or chapter pages use photo backgrounds. Pixel sampling catches text placed on an unsafe part of a real image.

A `low-contrast` finding on a page painted a mid-tone `background` color, about as light as `#777777` or `#6B7B8C`, is fixed at the background, not the text: the renderer already sets text the theme's ink cannot carry there in pure black, shades cards to the side where that black still reads, and sets a cover's top-left mark against the band it stands on. Move the color lighter or darker.

## Review the whole deck

Show the user pages early. When in-conversation tools exist, call `pptwise_outline` on the deck directory as soon as the spec validates, so the user sees the outline before pages are written, and use `pptwise_build` after each batch. Otherwise give the user the `preview.html` path from the build report, or generate the self-contained review file:

```bash
pptwise preview deck-dir/ --html
```

It writes one SVG per page plus `preview.html` under `.pptwise/<deck>/`. The preview is read-only. Placeholder pages are marked, and a complete deck includes audit findings in the review interface.

When the user needs a live browser round, run the project server as a background task:

```bash
pptwise serve deck-dir/ --no-open
```

Share the exact localhost URL, keep the process for the review round, and stop only that process when the round ends.

## Revise at the source

- For a content change, edit only the affected `pages/<id>.json`, then build again.
- For page order, page type, kind, heading, or theme binding, edit `deck.spec.json`, run `pptwise spec validate`, then repeat the project checks.
- For a different topic or audience, create a new project and restart from intent and narrative.

Never regenerate unrelated pages during a focused revision. Interpret screenshot feedback as a content requirement, change the smallest source file that owns it, and keep preview output read-only.
