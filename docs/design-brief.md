---
summary: 'The fixed brief handed to a design tool before it draws a face or component for pptwise: canvas, vector, type, contrast and safe-zone rules, plus the commands that print the theme and component facts to attach'
read_when:
  - drawing design boards for a face, component, or theme change
  - a showcase deck shows a page that needs redesign rather than a bug fix
  - judging whether a proposed design can be built in the engine
  - archiving an approved board under design/ after a design round
---

# Design brief

A design for pptwise is only useful if the engine can draw it and PowerPoint can open it as editable shapes. Paste this whole document into the design tool at the start of every design session, then attach the facts below for the theme and component in question. Without it, the boards come back attractive and impossible to build.

## What to draw

- One 1280 by 720 artboard per direction, at final size.
- A real content page in the theme being worked on, with the heading, footer area, and neighbouring components the page normally carries. Never an empty shell, never lorem ipsum.
- Two or three directions per question. The maintainer picks one, or asks for another round. Taste is decided by a person, not by the tool.
- Beside the directions, the engine's current render of the same page, so the difference is visible at a glance.

## Hard constraints

Canvas and drawing language:

- Flat vector primitives only: solid fills, simple linear gradients, strokes, rectangles, rounded rectangles, ellipses, lines, simple paths, and text.
- No CSS filters, blend modes, blur, frosted glass, stacked or soft shadows, masks, clipping tricks, or raster decoration. They do not survive conversion to editable PowerPoint shapes.
- No text on a path, no rotated body text, no vertical Latin text.
- Images only where the page declares an image slot.

Text:

- Nothing below 16px on the 1280 by 720 canvas, footnotes and axis labels included.
- Text sits on the page background or on a card surface, never on a palette-coloured fill such as a chart bar or a coloured block, unless the fill is the theme's dark primary and the text is the light ink the theme already uses there.
- Body text clears 4.5:1 contrast against what it sits on. Large headings and metadata clear 3:1.
- The theme's accent is often a highlight colour that is too light to carry text. Use it for rules, marks and blocks, not for words, unless the theme says otherwise.
- No line or rule may pass through a line of text or within 4px of one.
- Headings are at most two lines. Assume Latin and Chinese copy of realistic length, and show the longest realistic case.

Layout:

- Content stays inside x 96 to 1184.
- The footer rule sits at y 664. Footnotes sit at least 16px above it. Components end by about y 648.
- The top left corner and the top right meta line belong to the theme's motif and metadata. Do not put content there.
- At most three decoration pieces on a page. Decoration stays quieter than content.
- Every page must also work with the brand footer on (logo and meta in the footer strip) and off.

Numbers and data:

- Show the exact figures the content gives, with their units. Currency signs go before the number.
- A design that only works for one item count is not a design. Show what happens at the smallest and largest count the component allows.

## Facts to attach

Run these and paste their output under the brief:

```bash
pptwise themes --json             # copy the one theme's colors, fonts and shape
pptwise schema --component <type> # the component's fields and limits, when a component is in question
```

For a face, add the face's story from `pptwise inspect <deck-dir> --page <id>` on a page that uses it, and the current render from `pptwise preview <deck-dir>`.

For a bulletin page, attach [Designing for bulletin](./design-bulletin.md) as well, for a swiss page [Designing for swiss](./design-swiss.md), for a ledger page [Designing for ledger](./design-ledger.md), for a vermilion page [Designing for vermilion](./design-vermilion.md), for a terminal page [Designing for terminal](./design-terminal.md), for a memo page [Designing for memo](./design-memo.md), for a clinic page [Designing for clinic](./design-clinic.md), for an almanac page [Designing for almanac](./design-almanac.md), for a homeroom page [Designing for homeroom](./design-homeroom.md), for an ember page [Designing for ember](./design-ember.md), for a rally page [Designing for rally](./design-rally.md), for a proposal page [Designing for proposal](./design-proposal.md), for a thesis page [Designing for thesis](./design-thesis.md), for a journal page [Designing for journal](./design-journal.md), for an ink page [Designing for ink](./design-ink.md), for a crayon page [Designing for crayon](./design-crayon.md), for a luxe page [Designing for luxe](./design-luxe.md), for a runway page [Designing for runway](./design-runway.md), and for a museum page [Designing for museum](./design-museum.md): each holds the design system that theme's board settled.

When the part in question already has a settled board, attach it too: look for its folder under [`design/`](../design/README.md) and its entry in [Reusable parts](./reusable-parts.md). A new direction for a settled part has to say what it changes about the settled design and why.

## After the pick

The engine change follows the board, is checked against it at the same size, and is done when the difference is no longer visible. A component change reaches every theme that uses it: re-run the gallery, the L1 audit, and look at a few themes, not just the one being designed.

Then archive the chosen board in [`design/`](../design/README.md), in the folder of the part it settles, so the next theme that meets the same composition, component, motif or face starts from the settled design:

```text
design/
  compositions/<id>/            shared compositions (src/layouts/compositions/)
  components/<type>/            components (src/components/)
  motifs/<id>/                  motifs (src/motifs/)
  faces/<id>/                   faces (src/layouts/)
    README.md                   what it looks like, why, and what it gave up, one section per theme round
    <theme>.board.png           the approved board, 1280 by 720
    <theme>.engine.png          the engine's render of the same page, taken when the board is archived
  rounds/<YYYY-MM-DD>-<theme>/  the board source and the round's decisions, including every place the engine departs from the board on purpose
```

A part settled on another part's page links to that page instead of keeping a copy. Finally, add every part the round produced to [Reusable parts](./reusable-parts.md). Nothing under `design/` ships in the npm package.
