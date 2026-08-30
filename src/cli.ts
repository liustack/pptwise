#!/usr/bin/env node
import { Command } from "commander"
import { installNodePlatform } from "./platform/node"
import {
  runAssemble,
  runAssetBrief,
  runAudit,
  runBrandExtract,
  runDisassemble,
  runInit,
  runLayouts,
  runNarratives,
  runPreview,
  runRender,
  runSchema,
  runSpecValidate,
  runThemeFork,
  runThemeNew,
  runThemeTry,
  runThemes,
  runValidate,
} from "./cli/commands"
import { runConfigSet, runConfigShow } from "./cli/config-cmd"
import { runDoctor } from "./cli/doctor"
import { runImagesFetch, runImagesGenerate, runImagesList, runImagesSearch } from "./cli/images"
import { DEFAULT_PORT, runServe } from "./cli/serve"
import { checkForUpdate, createSelfUpdater } from "./cli/update"
import { VERSION } from "./version"

installNodePlatform()

const program = new Command()
program
  .name("pptwise")
  .description("Stable, editable PPTX generation for AI agents — semantic IR in, native DrawingML out")
  .version(VERSION)

function fail(e: unknown): never {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}

program
  .command("render")
  .description("Render an IR JSON file, deck project directory, or bare deck name to a .pptx")
  .argument("<target>", "IR JSON file, deck project directory, or bare name under ~/.pptwise/decks")
  .option("-o, --output <file>", "output .pptx path (default: .pptwise/<deck>/<deck>.pptx under the project root)")
  .option("--draft", "allow unfilled placeholder pages (skip the draft gate)")
  .option(
    "--allow-dropped-content",
    "export anyway when a page holds more than fits and the layout drops blocks (skip the content-drop gate)",
  )
  .option("--no-git-ignore", "do not add .pptwise/ to this repository's local exclude file")
  .action(
    async (
      target: string,
      opts: {
        output?: string
        draft?: boolean
        allowDroppedContent?: boolean
        gitIgnore?: boolean
      },
    ) => {
      try {
        console.log(
          await runRender(target, {
            output: opts.output,
            draft: opts.draft,
            allowDroppedContent: opts.allowDroppedContent,
            gitIgnore: opts.gitIgnore,
            cwd: process.cwd(),
          }),
        )
      } catch (e) {
        fail(e)
      }
    },
  )

program
  .command("validate")
  .description("Validate an IR JSON file, deck project directory, or bare deck name against the schema")
  .argument("<target>", "IR JSON file, deck project directory, or bare name under ~/.pptwise/decks")
  .action(async (target: string) => {
    try {
      console.log(await runValidate(target, process.cwd()))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("audit")
  .description(
    "Deterministic geometry audit (overflow, out-of-bounds, low-contrast, overlap, content-truncated, content-dropped, monotony), plus an optional --pixels contrast pass — exits 1 when it finds anything",
  )
  .argument("<target>", "IR JSON file, deck project directory, or bare name under ~/.pptwise/decks")
  .option("--json", "machine-readable output (the full AuditReport)")
  .option("--pixels", "also run the optional pixel-contrast pass over image-backed text (requires sharp)")
  .action(async (target: string, opts: { json?: boolean; pixels?: boolean }) => {
    try {
      const { output, hasFindings } = await runAudit(target, {
        json: opts.json,
        pixels: opts.pixels,
      })
      console.log(output)
      if (hasFindings) process.exit(1)
    } catch (e) {
      fail(e)
    }
  })

program
  .command("asset-brief")
  .description(
    "Image-generation brief for every image slot in a deck: the real rendered frame, fit/crop mode, suggested pixel size, theme palette/mood, and a paste-ready prompt",
  )
  .argument("<target>", "IR JSON file, deck project directory, or bare name under ~/.pptwise/decks")
  .option("--json", "machine-readable output (the full AssetBrief)")
  .action(async (target: string, opts: { json?: boolean }) => {
    try {
      console.log(await runAssetBrief(target, { json: opts.json }))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("schema")
  .description("Print the IR JSON Schema (feed this to a model before it writes IR)")
  .option("--spec", "print the deck spec schema instead")
  .option("--plan", "removed — use --spec instead")
  .action((opts: { spec?: boolean; plan?: boolean }) => {
    // vocabulary-v4 rename (spec §8.2): `--plan` renamed to `--spec`, no
    // long-lived alias — hard-fail pointing at the one new flag rather than
    // silently keep serving the plan schema under its old name.
    if (opts.plan) {
      fail(new Error("`pptwise schema --plan` has been renamed to `pptwise schema --spec` — run `pptwise schema --spec` instead"))
    }
    console.log(runSchema(opts.spec ? "spec" : undefined))
  })

// vocabulary-v4 rename (spec §8.2): `pptwise plan validate` renamed to
// `pptwise spec validate`. The `plan` command group stays registered only so
// `pptwise plan validate <file>` fails with a message pointing at the new
// command, rather than commander's own generic "unknown command" error.
const plan = program.command("plan").description("Removed — use `pptwise spec` instead")
plan
  .command("validate")
  .description("Removed — use `pptwise spec validate` instead")
  .argument("<file>")
  .action(() => {
    fail(new Error("`pptwise plan validate` has been renamed to `pptwise spec validate` — run `pptwise spec validate <file>` instead"))
  })

const spec = program.command("spec").description("Deck spec commands (spec §6)")
spec
  .command("validate")
  .description("Validate a deck spec JSON file against the schema and strategy-aware hard gates")
  .argument("<spec.json>")
  .action(async (specPath: string) => {
    try {
      console.log(await runSpecValidate(specPath))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("assemble")
  .description("Assemble a deck project directory (deck.spec.json + pages/ + assets/) into an IR JSON file")
  .argument("<dir|name>", "deck project directory, or bare name under ~/.pptwise/decks")
  .option("-o, --output <file>", "output IR JSON path (default: <dir>/deck.json)")
  .action(async (target: string, opts: { output?: string }) => {
    try {
      console.log(await runAssemble(target, { output: opts.output }))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("disassemble")
  .description("Split an IR JSON file into a deck project directory (deck.spec.json + pages/)")
  .argument("<ir.json>", "path to the IR file")
  .requiredOption("-o, --output <dir>", "output deck project directory")
  .action(async (irPath: string, opts: { output: string }) => {
    try {
      console.log(await runDisassemble(irPath, opts.output))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("themes")
  .description("List built-in themes")
  .option("--json", "machine-readable output")
  .action((opts: { json?: boolean }) => console.log(runThemes(Boolean(opts.json))))

const theme = program.command("theme").description("Copy, fork, and compare themes")
theme
  .command("new")
  .description("Copy a preset or named theme into a self-contained v2 theme file")
  .requiredOption("--from <preset>", "preset or theme name to copy")
  .option("-o, --output <path>", "output theme JSON path")
  .option("--id <id>", "theme id (default: slug of the output filename)")
  .option("--label <label>", "human-readable theme label")
  .addHelpText("after", "\nExample:\n  $ pptwise theme new --from consulting -o themes/acme.theme.json")
  .action(async (opts: { from: string; output?: string; id?: string; label?: string }) => {
    try {
      console.log(await runThemeNew({ from: opts.from, output: opts.output, id: opts.id, label: opts.label, cwd: process.cwd() }))
    } catch (e) {
      fail(e)
    }
  })
theme
  .command("fork")
  .description("Copy a theme and rederive tokens around new anchor colors")
  .argument("<name>", "preset or theme name to fork")
  .requiredOption("--primary <hex>", "new primary color")
  .option("--bg <hex>", "new background color")
  .option("--accent <hex>", "new accent color")
  .option("--text <hex>", "new text color")
  .option("--surface <hex>", "new surface color")
  .option("-o, --output <path>", "output theme JSON path")
  .option("--id <id>", "theme id (default: slug of the output filename)")
  .option("--label <label>", "human-readable theme label")
  .addHelpText("after", "\nExample:\n  $ pptwise theme fork acme --primary #0B5FFF -o themes/acme-blue.theme.json")
  .action(
    async (
      name: string,
      opts: { primary: string; bg?: string; accent?: string; text?: string; surface?: string; output?: string; id?: string; label?: string },
    ) => {
      try {
        console.log(
          await runThemeFork(name, {
            primary: opts.primary,
            bg: opts.bg,
            accent: opts.accent,
            text: opts.text,
            surface: opts.surface,
            output: opts.output,
            id: opts.id,
            label: opts.label,
            cwd: process.cwd(),
          }),
        )
      } catch (e) {
        fail(e)
      }
    },
  )
theme
  .command("try")
  .description("Render the fitting-room sample across 2-4 themes into a contact sheet")
  .argument("<ids>", "comma-separated theme ids (2-4)")
  .option("-o, --output <dir>", "output directory (default: .pptwise/theme-try/)")
  .addHelpText("after", "\nExample:\n  $ pptwise theme try consulting,swiss,memo")
  .action(async (ids: string, opts: { output?: string }) => {
    try {
      console.log(await runThemeTry(ids, { output: opts.output, cwd: process.cwd() }))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("layouts")
  .description("List registered layouts")
  .option("--json", "machine-readable output")
  .action((opts: { json?: boolean }) => console.log(runLayouts(Boolean(opts.json))))

// `brand` is a command group (not a bare `brand-extract` command) to leave
// room for future brand-asset extraction (logo from the slide master, etc.)
// under the same namespace — brand-extract wave, 裁定 1.
const brand = program.command("brand").description("Brand asset commands — extract your company's colors/fonts from an Office template")
brand
  .command("extract")
  .description(
    "Extract brand colors and fonts from a .thmx/.potx/.pptx file into a pptwise theme file — runs entirely locally, the file never leaves your machine",
  )
  .argument("<file>", "a .thmx theme, .potx template, or .pptx presentation")
  .requiredOption("-o, --output <file>", "output theme JSON path (e.g. my-brand.theme.json)")
  .option("--id <id>", "theme id to register under (default: slug of the output filename)")
  .option("--label <label>", "human-readable theme label (default: the source theme's color-scheme name)")
  .option("--from <preset>", "donor preset whose menu is copied (default: consulting)")
  .addHelpText("after", "\nExample:\n  $ pptwise brand extract corp.pptx -o themes/acme.theme.json --from consulting")
  .action(async (file: string, opts: { output: string; id?: string; label?: string; from?: string }) => {
    try {
      console.log(await runBrandExtract(file, { output: opts.output, id: opts.id, label: opts.label, from: opts.from }))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("narratives")
  .description("List named narrative presets (strategy/pacing/audience axes + theme recommendations)")
  .option("--json", "machine-readable output")
  .action((opts: { json?: boolean }) => console.log(runNarratives(Boolean(opts.json))))

const config = program.command("config").description("User-level settings (API keys for optional stock-photo search)")
config
  .command("set <key> [value]")
  .description("Set a user config value. Omit the value for an apiKey or clientSecret to enter it at a hidden prompt")
  .action(async (key: string, value: string | undefined) => {
    try {
      console.log(await runConfigSet(key, value))
    } catch (e) {
      fail(e)
    }
  })
config
  .command("show")
  .description("Show the effective user config (API keys masked)")
  .action(async () => {
    try {
      console.log(await runConfigShow())
    } catch (e) {
      fail(e)
    }
  })

function parsePositiveInt(raw: string, flag: string): number {
  if (!/^[0-9]+$/.test(raw)) {
    fail(new Error(`invalid ${flag} "${raw}" — expected a positive integer`))
  }
  return Number(raw)
}

const images = program.command("images").description("Search and pin stock photos into workspace assets")
images
  .command("search <query>")
  .description("Search Pexels, then Pixabay, then Openverse (cc0/pdm) and print attribution lines")
  .option("--orientation <orientation>", "landscape, portrait, or square")
  .option("--color <color>", "color name or hex for the search API")
  .option("--min-width <px>", "client-side minimum width in pixels")
  .option("--min-height <px>", "client-side minimum height in pixels")
  .action(
    async (
      query: string,
      opts: { orientation?: string; color?: string; minWidth?: string; minHeight?: string },
    ) => {
      try {
        console.log(
          await runImagesSearch(query, {
            orientation: opts.orientation,
            color: opts.color,
            minWidth: opts.minWidth !== undefined ? parsePositiveInt(opts.minWidth, "--min-width") : undefined,
            minHeight: opts.minHeight !== undefined ? parsePositiveInt(opts.minHeight, "--min-height") : undefined,
          }),
        )
      } catch (e) {
        fail(e)
      }
    },
  )
images
  .command("fetch <ref>")
  .description("Download a photo (pexels:<id>, pixabay:<id>, or openverse:<id>) into .pptwise/<deck>/assets/")
  .requiredOption("--deck <dir>", "deck project directory, path, or bare name")
  .requiredOption("--as <asset_id>", "local asset id (filename without extension)")
  .option("--query <text>", "search query that produced this pick (stored in the sidecar)")
  .action(async (ref: string, opts: { deck: string; as: string; query?: string }) => {
    try {
      console.log(
        await runImagesFetch(ref, { deck: opts.deck, as: opts.as, query: opts.query, cwd: process.cwd() }),
      )
    } catch (e) {
      fail(e)
    }
  })
images
  .command("list")
  .description("List pinned stock photos for a deck")
  .requiredOption("--deck <dir>", "deck project directory, path, or bare name")
  .action(async (opts: { deck: string }) => {
    try {
      console.log(await runImagesList({ deck: opts.deck, cwd: process.cwd() }))
    } catch (e) {
      fail(e)
    }
  })
images
  .command("generate")
  .description("Generate an image with a local CLI (grok, codex, or antigravity) and pin it")
  .requiredOption("--deck <dir>", "deck project directory, path, or bare name")
  .requiredOption("--as <asset_id>", "local asset id (filename without extension)")
  .option("--prompt <text>", "image prompt (otherwise taken from asset-brief)")
  .action(async (opts: { deck: string; as: string; prompt?: string }) => {
    try {
      console.log(
        await runImagesGenerate({ deck: opts.deck, as: opts.as, prompt: opts.prompt, cwd: process.cwd() }),
      )
    } catch (e) {
      fail(e)
    }
  })

program
  .command("init")
  .description("Scaffold a pptwise.config.json in the current directory")
  .action(async () => {
    try {
      console.log(await runInit())
    } catch (e) {
      fail(e)
    }
  })

program
  .command("preview")
  .description("Render each slide to an SVG file for visual self-check")
  .argument("<target>", "IR JSON file, deck project directory, or bare name under ~/.pptwise/decks")
  .option("-o, --output <dir>", "output directory (default: .pptwise/<deck>/ under the project root)")
  .option("--html", "also write a self-contained preview.html (all slides inlined — thumbnail strip, keyboard navigation) for human review")
  .option("--no-git-ignore", "do not add .pptwise/ to this repository's local exclude file")
  .action(async (target: string, opts: { output?: string; html?: boolean; gitIgnore?: boolean }) => {
    try {
      console.log(
        await runPreview(target, opts.output, {
          htmlOut: opts.html,
          gitIgnore: opts.gitIgnore,
          cwd: process.cwd(),
        }),
      )
    } catch (e) {
      fail(e)
    }
  })

program
  .command("serve")
  .description("Serve a live-reloading HTML preview of an IR JSON file, deck project directory, or bare deck name over HTTP")
  .argument("<target>", "IR JSON file, deck project directory, or bare name under ~/.pptwise/decks")
  .option("--port <number>", `port to listen on (default ${DEFAULT_PORT})`)
  .option("--no-open", "do not open the URL in a browser after starting")
  .action(async (target: string, opts: { port?: string; open: boolean }) => {
    try {
      let port: number | undefined
      if (opts.port !== undefined) {
        port = Number(opts.port)
        if (!Number.isInteger(port)) {
          fail(new Error(`invalid --port value "${opts.port}" — expected an integer`))
        }
      }
      await runServe(target, { port, open: opts.open })
    } catch (e) {
      fail(e)
    }
  })

program
  .command("doctor")
  .description(
    "Diagnose this machine's install: installed skill copies and what each pins, dsh plugin status, Node/Bun against the engines floor, the optional sharp/soffice capabilities, and a self-test render — exits 1 only on a hard failure",
  )
  .option("--json", "machine-readable output (the full DoctorReport)")
  .action(async (opts: { json?: boolean }) => {
    try {
      const { output, hasErrors } = await runDoctor({ json: opts.json })
      console.log(output)
      if (hasErrors) process.exit(1)
    } catch (e) {
      fail(e)
    }
  })

program
  .command("check-update")
  .description("Check npm for a newer pptwise release")
  .action(async () => {
    const info = await checkForUpdate({ currentVersion: VERSION })
    if (!info.checked) fail(new Error(`update check failed: ${info.error}`))
    console.log(
      info.updateAvailable
        ? `update available: ${info.currentVersion} → ${info.latestVersion} (run \`pptwise self-update\`)`
        : `pptwise ${info.currentVersion} is up to date`,
    )
  })

program
  .command("self-update")
  .description("Update the global pptwise install to the latest release")
  .action(async () => {
    try {
      const result = await createSelfUpdater()({ currentVersion: VERSION })
      console.log(
        result.updated
          ? `updated: ${result.currentVersion} → ${result.latestVersion}`
          : `already at the latest version (${result.currentVersion})`,
      )
    } catch (e) {
      fail(e)
    }
  })

program.parseAsync(process.argv, { from: "node" }).catch(fail)
