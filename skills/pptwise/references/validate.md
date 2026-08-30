# Validation and review loop

Read this when filling pages, assembling a deck project, rendering, auditing, previewing, serving, or revising.

## Fill small batches

For each confirmed spec page, write `pages/<page-id>.json`. A page file may contain only `components`, `background`, `image_side`, `footnote`, and `notes`. The spec owns `type`, content `kind`, `heading`, and page order. Repeating any locked field in a page file is a hard error.

Fill at most four pages, then run:

```bash
pptwise assemble deck-dir/
pptwise validate deck-dir/
```

`assemble` merges the locked semantics and page content into IR v5. It does not write face choices or any other rendering decision into the project. A missing page file remains an accepted placeholder. An orphan page file, a locked-field conflict, an unknown theme, or a kind absent from the bound theme menu is a hard error.

`validate` applies schema, component, asset, narrative, physical capacity, and editorial checks. Fix errors until it prints `OK`. Warnings do not block output, but long headings, excessive density, dangling assets, and repetitive choices should normally be tightened before delivery.

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

The deterministic audit checks overflow, out-of-bounds content, low contrast, overlap, truncation, dropped content, and repeated lead components. A finding exits with code 1 and names the page. Restructure the content, rerun assemble and validate when source files changed, then rerun audit until it exits 0.

Add `--pixels` when cover or chapter pages use photo backgrounds. Pixel sampling catches text placed on an unsafe part of a real image.

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
