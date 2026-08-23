<p align="center"><img src="assets/banner.png" alt="pptwise — make your deck in minutes, not hours" width="100%"></p>

<h1 align="center">pptwise</h1>

<p align="center"><b>Make your deck in minutes, not hours.</b></p>

<p align="center">🥇 <b>The FIRST deck-generation plugin for DeepSeek Harness (dsh)</b> 🥇</p>

<p align="center">
  <a href="https://pptwise.com">pptwise.com</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./INSTALL.md">Install (hand it to your AI)</a> ·
  <a href="./docs/cli.md">Commands</a> ·
  <a href="./docs/ir.md">IR</a> ·
  <a href="./docs/themes.md">Themes</a> ·
  <a href="./skills/pptwise/SKILL.md">Agent skill</a> ·
  <a href="https://github.com/liustack/modlens">ModLens (vision)</a>
</p>

<p align="center">
  <a href="https://x.com/liustack"><img src="https://img.shields.io/badge/follow-%40liustack-black?style=flat-square&logo=x&logoColor=white" alt="Follow @liustack on X"></a>
  <a href="https://www.npmjs.com/package/@liustack/pptwise"><img src="https://img.shields.io/npm/v/@liustack/pptwise?style=flat-square&label=npm&color=cb3837" alt="npm"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@liustack/pptwise?style=flat-square" alt="Node.js"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Not%20backed%20by-Y%20Combinator-FF6600?style=flat-square&logo=ycombinator&logoColor=white" alt="Not backed by Y Combinator">
  <img src="https://img.shields.io/badge/no%20API%20key-to%20render-4c1?style=flat-square" alt="No API key to render">
</p>

## Talk to us

Issues are welcome any time. [Open one](https://github.com/liustack/pptwise/issues/new/choose), or follow **[@liustack](https://x.com/liustack)** on X. Share what you made with pptwise, which harness you use, and what the next release should solve. New releases land there first.

## Highlights

**⚡ Tell your AI what to cover, get the deck.** You bring the content, the engine handles layout, color, type size, and spacing. The same content renders the same deck every time, so there is nothing to redo and no luck involved.

**✏️ A real deck, not a picture of one.** Every heading, bullet, and chart bar opens in PowerPoint for you to retype and restyle. Chart and table figures are the exception: to change the numbers, have your AI rebuild that page. 24 ready-made styles, and you can pull the colors and fonts out of a deck your company already uses.

**🔌 Installs into the agent you already use.** One command puts pptwise into DeepSeek Harness, Claude Code, or any agent that reads a skill folder (Codex and friends), and it knows how to build a deck the moment it lands.

**🔁 Revisions without describing everything again.** One command opens a live preview in your browser. Tell your AI what to change in plain words — the page refreshes itself as each revision lands.

**🔒 No account, no API key to render, no network at render time.** Install it and it works. Node 22.19+ or Bun is all you need on the machine. Optional stock-photo search uses the user's own Pexels key.

## Install

**Step 1, hand it to your AI.** Send it this line:

> Install the pptwise deck skill following https://raw.githubusercontent.com/liustack/pptwise/main/INSTALL.md, then run the health check and tell me the result.

There is no step 2. Your AI puts the skill folder where your harness reads it, and the skill brings its own version-pinned launcher, so there is no CLI to install by hand. pptwise renders a PPTX entirely locally: no API key, no account, nothing to configure for render. Optional stock-photo search needs the user's own Pexels key. The only prerequisite is Node 22.19+ (or Bun).

**On DeepSeek Harness, it is one command instead.** pptwise is a native DSH plugin there, not a skill folder:

```bash
npx -y @deepseek-ai/dsh plugin --profile web add @liustack/pptwise@0.22.0
```

Name the version. Without it, the install quietly lands on an older release and you miss the newest features. `npm view @liustack/pptwise version` prints the current one. The plugin card shows up as "pptwise", registers the deck-generation skill, and carries the CLI inside its own package. Uninstalling removes the skill with no residue.

## Quick start

An IR is one JSON file describing the whole deck. Write a minimal one, then run the validate → render → preview loop:

```bash
cat > deck.json <<'EOF'
{
  "filename": "hello.pptx",
  "theme": { "id": "consulting" },
  "slides": [
    { "type": "cover", "heading": "Hello pptwise", "subheading": "A first deck in ten minutes" },
    { "type": "content", "heading": "Why it works", "components": [
      { "type": "bullets", "items": ["Semantic IR in", "Native DrawingML out", "Every shape stays editable"] } ] },
    { "type": "ending", "heading": "Thanks" }
  ]
}
EOF
pptwise validate deck.json                              # → OK — 3 slides, theme "consulting"
pptwise render deck.json -o out/hello.pptx              # → wrote out/hello.pptx (3 slides, ~24 KB)
pptwise render deck.json -o out/tech.pptx --theme tech  # same deck, different theme
pptwise preview deck.json -o out/svgs                   # SVG per slide, for a visual self-check
```

One shape rule: `cover`/`chapter`/`ending` slides are heading + subheading only, components live on `content` slides. `validate` says exactly this if you mix them up.

No install at all also works: `npx -y @liustack/pptwise validate deck.json`. In a source checkout, `node dist/cli.js` replaces `pptwise`, and `examples/` has ready-made IR files to try.

The commands you will reach for most:

| Command | Does |
|---|---|
| `validate <target>` | Check the IR, with page numbers on every error |
| `render <target> [-o <out.pptx>] [--theme <id>]` | Render a `.pptx`. Omit `-o` to write `.pptwise/<deck>/<deck>.pptx` |
| `preview <target> [-o <dir>] [--html]` | One SVG per slide, plus a self-contained review page. Omit `-o` to write `.pptwise/<deck>/` |
| `serve <target>` | Live preview that reloads on every change |
| `audit <target>` | Geometry review: overflow, out-of-bounds, low contrast, overlap |
| `themes` | List the built-in themes |
| `doctor` | Check the install: runtime, skill copies, optional capabilities, self-test render |

Full reference: [`docs/cli.md`](./docs/cli.md).

## Documentation

| Doc | Read it when |
| :-- | :-- |
| [Install guide](./INSTALL.md) | Handing installation to an agent or checking prerequisites |
| [Agent skill](./skills/pptwise/SKILL.md) | Learning the workflow pptwise teaches an agent |
| [CLI manual](./docs/cli.md) | Looking up commands, flags, audits, previews, and health checks |
| [IR reference](./docs/ir.md) | Writing a deck, slide, component, or narrative in JSON |
| [Themes](./docs/themes.md) | Picking a built-in theme or extracting your own brand |
| [Core concepts](./docs/concepts.md) | Understanding themes, layouts, components, narratives, and capacity |
| [Architecture](./docs/architecture.md) | Working on the render chain or adding a theme, layout, or component |
| [Deck projects](./docs/deck-projects.md) | Building a multi-file deck with locked specs, assets, and live review |
| [Layout selection and seed](./docs/selection-and-seed.md) | Explaining why a layout was picked or keeping revisions stable |
| [Contrast system](./docs/contrast-system.md) | Debugging text color, painted backgrounds, or contrast findings |
| [Designing themes](./docs/designing-themes.md) | Drawing a theme redesign that can actually compile to PPTX |
| [Testing](./docs/testing.md) | Running the right gate, inspecting snapshots, or changing exported XML |
| [Internal API](./docs/internal-api.md) | Understanding why the JavaScript internals carry no semver promise |
| [Release guide](./docs/releasing.md) | Preparing and publishing an npm release |
| [CHANGELOG](./CHANGELOG.md) | Finding what changed in a version |

## Credits

Icon primitives are extracted from [lucide](https://lucide.dev) (ISC License). pptwise itself was extracted from a production AI-deck-generation system and CJK-typography-tuned (full-width punctuation width, Chinese line breaking, a Chinese-first font stack, explicit east-asian font-slot declarations) from day one.

## License

[MIT](./LICENSE)
