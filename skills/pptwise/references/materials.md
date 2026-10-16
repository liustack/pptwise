# Materials

Read this when gathering what a deck is made from: the facts and their sources, the brand, and the picture each page should have.

Gather materials without asking the user anything. Write them to `deck-dir/materials.md` before the spec, and read that file again at every later step: when you write the spec, when you write each page, when you source each picture, and when you check the deck. The file is the deck's memory. Two runs from the same materials make the same deck, and a change to the deck starts as a change to the file.

## The file

Use these four sections, in this order. Keep each line short and concrete.

```markdown
# <deck title>

## Request
- Audience: <who>
- Outcome: <what they should do or think afterwards>
- Delivery: presented | circulated, <time>
- Narrative: <preset or strategy, pacing, audience>

## Facts
- <claim or figure> | <source title>, <URL or file>, <date>
- ...

## Brand
- Scan: <the scan's summary line>
- Colors: <next.brandFlag>, from <brand.from>
- Logo: <file> -> asset `logo`
- Fonts: <heading>, <body>
- Templates: <file>, scheme <name>

## Pictures
- Direction: <what the pictures show, and the look: documentary, product, archival, illustrated>
- Sources: own | stock | web | generated
- <page id> | <frame: cover background, photo, chapter, grid item> | <subject> | <source>: <file, search words, or page URL> | asset `<asset_id>`
- ...
```

Leave out a section line the deck has nothing for. Write `none found` under `Brand` when the scan found nothing, so a later step does not run it again.

## Facts

Desk research is on by default. Search the web for the figures, dates, names, and examples the deck needs. Prefer the primary source: the organization's own report, the statistics office, the paper, the filing. Note each figure with its source and date. When the user's material already holds the content, keep to it and add only the sources. A figure you cannot source does not go in the deck. Say so to the user at delivery rather than estimate it.

## Brand

Run `pptwise brand scan --json` from the project folder, and copy into the file what it found (see `branding.md`). An Office template, logo, or photo the user handed over counts too. When the scan finds a brand color, the theme wall in step 3 adds the brand option.

## Pictures

Plan a picture for every frame the theme draws one in (see `images.md` for which frames take one). Plan from the content: what the page says, and what a reader should see to believe it. Name the subject concretely ("the new assembly line, workers at the stations", not "factory"). Prefer, in order, the user's and the project's own pictures the scan found, then stock, then a picture found on the web under a license that lets the deck use it, then a generated one when a generator is enabled. Fill in the page ids once the outline is set, and the asset ids as pictures are pinned.
