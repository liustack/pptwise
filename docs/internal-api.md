---
summary: 'Internal JS API: the SDK surface is sealed — dist entries exist for the package''s own use, no semver promise'
read_when:
  - tempted to import @liustack/pptwise from JS
  - wondering why exports has no /node /browser /validate subpaths
  - wiring a new internal consumer (DSH plugin, MCP, tools)
---

# Internal JS API — no public promise

**Internal implementation. No semantic-versioning promise.** Everything in
this document can change or disappear in any release, including a patch.

## What happened

The pre-0.17 releases exported a programmatic SDK (`.` root, `/node`,
`/browser`, `/validate` subpaths). It was sealed in the SDK-sealing wave:
the package had never been announced, had zero known JS consumers, and a
public JS API is pure maintenance surface (Hyrum's law). The public support
surface is now:

- the **CLI** (`pptwise …`)
- the **IR schema** (`pptwise schema`) and its validate/render contract
- the **deck project format** (`deck.spec.json` + `pages/` + `assets/`)
- the **agent skill** (`skills/pptwise/SKILL.md`)
- the **DSH plugin** (the package root export)

## What still builds, and for whom

`dist/index.js` and `dist/node.js` are still built (see `tsup.config.ts`).
They exist so that code *inside this package* — the CLI bundle, the DSH
plugin layer under `dsh/`, and future MCP/tool surfaces — can share the
render core by **relative path** (`../dist/index.js`), version-locked to
the same install. They are deliberately absent from `package.json`
`exports`, so Node refuses a bare `@liustack/pptwise/node` import from
outside the package.

If you need pptwise from your own program, shell out to the CLI: `pptwise
validate` / `render` / `preview` speak JSON and exit codes, and that
contract *is* covered by semver.

## Theme handling inside the package

`validateIr`, `renderSlideSvg`, `generatePptx`, `auditDeck`,
`runPixelContrastAudit`, `buildAssetBrief`, `validateSpec`, `assembleDeck`,
and `readDeckDir` accept a `theme` option carrying a `ThemeDefinition` by
value. The CLI compiles a deck or workspace theme file once per command
(`resolveThemeByName` returns it as `definition`) and passes that object
down. Without the option, `ir.theme.id` must name a factory preset or a theme
installed through `registerTheme`, which is process-level configuration for an
embedder, never per-request state. There is no replace-in-place install: a
file is never written into a lookup table, so nothing lingers after the file
is deleted and two callers can use different definitions under one id.

Each of those entry points resolves the option once, at its own front door,
through `resolveIrTheme` (`src/themes/resolve-ir-theme.ts`) — the single
place in the package where a bound theme id is looked up in a table. A
supplied definition must answer to the id the deck binds, or resolution
fails. Everything below the entry point takes `ThemeDefinition` as a
required argument: `FullSlideSvg`, `slideToSvgMarkup` / `slideToRender` /
`slideToOps`, `resolveEffectiveFace`, `checkIrQuality`, and `Branding` have
no id fallback to reach for, so a deck theme file that keeps a built-in id
cannot be silently swapped for the factory preset halfway down the chain.

## The former browser bundles

`dist/browser.js` and `dist/validate.js` (self-contained ESM for bare
`<script type="module">` pages) were external-only artifacts and are no
longer built. If a web playground ever ships, it will be a product built on
the internal API, not an exported bundle.
