# Validation and review loop

Read this when filling pages, assembling a deck project, rendering, auditing, previewing, serving, or revising.

## Fill small batches

For each confirmed spec page, write `pages/<page-id>.json`. A page file may contain only `components`, `background`, `image_side`, `footnote`, `fields`, `stamp`, `tag`, `ballot`, `years`, `stage`, and `notes`. The spec owns `type`, content `kind`, `heading`, and page order. Repeating any locked field in a page file is a hard error.

Fill at most four pages, then run:

```bash
pptwise assemble deck-dir/
pptwise validate deck-dir/
```

`assemble` merges the locked semantics and page content into IR v5. It does not write face choices or any other rendering decision into the project. A missing page file remains an accepted placeholder. An orphan page file, a locked-field conflict, an unknown theme, or a kind absent from the bound theme menu is a hard error.

`validate` applies schema, component, asset, narrative, physical capacity, and editorial checks. Authored leftover-count phrasing and ellipsis substitutes are rejected here, before a page is painted. Fix errors until it prints `OK`. Warnings do not block output, but long headings, excessive density, dangling assets, and repetitive choices should normally be tightened before delivery.

A cover, chapter or ending sets its heading in a fixed place, and how long a heading fits there differs by theme, from about a dozen Chinese characters to over seventy. validate refuses a heading the bound face would cut or drop, and the error names the face and quotes how much of this very heading it holds on that page, counted in the heading's own characters (a Chinese heading) or words (any other), beside how long the heading is. Shorten the heading, or move part of it into the subheading when the face has one. The subheading is held the same way: validate draws the page with its face and refuses a subheading the face would cut or leave off, quoting how much of it fits there. A heading the face sets whole can still take the room its cards or list stand in, and validate refuses that page too, quoting the heading the face keeps them under.

Speaker `notes` export as native PowerPoint notes and never paint on the slide.

## Render only from the binding

```bash
pptwise render deck-dir/
```

The `.pptx` is written under `.pptwise/<deck>/`, and the command prints its absolute path. There is no render-time theme switch. The project spec is the binding.

An unfinished project requires explicit `--draft`. Content that would be dropped remains blocked unless the user explicitly accepts `--allow-dropped-content`. Prefer fixing or splitting the page.

When changing themes, compare candidates with `pptwise theme try`. A same-menu fork can replace the binding and proceed through assemble, validate, audit, and render. A different menu requires returning to theme selection, then revising the spec and affected page fills before those checks.

## Audit geometry

After every page is filled, run:

```bash
pptwise audit deck-dir/
```

The deterministic audit checks overflow, out-of-bounds content, low contrast, overlap, truncation, dropped content, and repeated lead components. A finding exits with code 1 and names the page. A heading, source line or component text the theme's layout would cut makes a plainer layout draw the page whole (`stepped-aside`). A `content-truncated` finding with `"tier": "hard"` is text no layout could fit: shorten it or split the page. Restructure the content, rerun assemble and validate when source files changed, then rerun audit until it exits 0.

Add `--pixels` when cover or chapter pages use photo backgrounds. Pixel sampling catches text placed on an unsafe part of a real image.

A `low-contrast` finding on a page painted a mid-tone `background` color, about as light as `#777777` or `#6B7B8C`, is fixed at the background, not the text: the renderer already sets text the theme's ink cannot carry there in pure black and shades cards to the side where that black still reads, and what still falls short is a mark a face sets in the theme's own color, such as a large chapter numeral. Move the color lighter or darker.

## Review the whole deck

When an in-conversation deck preview tool exists, use it. Otherwise generate the self-contained review file:

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

- For a content change, edit only the affected `pages/<id>.json`, then assemble, validate, audit, and render again.
- For page order, page type, kind, heading, or theme binding, edit `deck.spec.json`, run `pptwise spec validate`, then repeat the project checks.
- For a different topic or audience, create a new project and restart from intent and narrative.

Never regenerate unrelated pages during a focused revision. Interpret screenshot feedback as a content requirement, change the smallest source file that owns it, and keep preview output read-only.
