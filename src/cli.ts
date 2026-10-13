#!/usr/bin/env node
import { Command } from "commander"
import { installNodePlatform } from "./platform/node"
import {
  runAssemble,
  runAssetBrief,
  runAudit,
  runBrandExtract,
  runBuild,
  runDisassemble,
  runIcons,
  runInspect,
  runInit,
  runLayouts,
  runNarratives,
  runPreview,
  runRender,
  runSchema,
  runSpecValidate,
  runSpecValidateJson,
  runThemeFork,
  runThemeNew,
  runThemeTry,
  runThemes,
  runValidate,
} from "./cli/commands"
import { runConfigSet, runConfigShow } from "./cli/config-cmd"
import { runDoctor } from "./cli/doctor"
import { runImagesFetch, runImagesGenerate, runImagesList, runImagesSearch } from "./cli/images"
import { runLicenseClear, runLicenseSet, runLicenseStatus } from "./cli/packs/license"
import { runPacksList, runPacksSync } from "./cli/packs/sync"
import { DEFAULT_PORT, runServe } from "./cli/serve"
import { checkForUpdate, createSelfUpdater } from "./cli/update"
import { VERSION } from "./version"

installNodePlatform()

const program = new Command()
program
  .name("pptwise")
  .description("Stable, editable PPTX generation for AI agents — semantic IR in, native DrawingML out")
  .version(VERSION)
  // An unknown option or command prints the command's own help after the
  // error, so a caller reads what the command does take, and where else to
  // look, in the same answer instead of guessing again.
  .showHelpAfterError()

function fail(e: unknown): never {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}

program
  .command("render")
  .description("Render an IR JSON file or deck project directory to a .pptx")
  .argument("<target>", "IR JSON file or deck project directory")
  .option("-o, --output <file>", "output .pptx path (default: .pptwise/<deck>/<deck>.pptx under the project root)")
  .option("--draft", "allow unfilled placeholder pages (skip the draft gate)")
  .option(
    "--allow-dropped-content",
    "export anyway when a page holds more than fits and the layout drops blocks (skip the content-drop gate)",
  )
  .option("--no-git-ignore", "do not write .pptwise/.gitignore or add .pptwise/ to this repository's local exclude file")
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
  .command("build")
  .description(
    "Assemble, validate, audit, preview and render a deck in one pass. Writes the pages and, only when every check passes, the deck's one .pptx under .pptwise/<deck>/ — exits 1 when the deck needs revision",
  )
  .argument("<target>", "deck project directory or IR JSON file")
  .option("--json", "print the full report: status, every problem with its page, file and field, which pages the theme's signature layouts drew and the nearest recipe for the rest, the preview, and the .pptx path")
  .option("--no-git-ignore", "do not write .pptwise/.gitignore or add .pptwise/ to this repository's local exclude file")
  .option(
    "--alternatives",
    "also draw the deck's cover and one or two content pages in up to 3 other themes, under .pptwise/<deck>/alternatives/ (done once by default, on the first build of a deck on a built-in theme)",
  )
  .option("--no-alternatives", "do not draw the deck in other themes, even on its first build")
  .addHelpText("after", "\nExample:\n  $ pptwise build my-deck/ --json")
  .action(async (target: string, opts: { json?: boolean; gitIgnore?: boolean; alternatives?: boolean }) => {
    try {
      const { output, ok } = await runBuild(target, {
        json: opts.json,
        gitIgnore: opts.gitIgnore,
        alternatives: opts.alternatives,
        cwd: process.cwd(),
      })
      console.log(output)
      // exitCode rather than exit(): a long --json report piped to another
      // process is flushed in full before the process ends.
      if (!ok) process.exitCode = 1
    } catch (e) {
      fail(e)
    }
  })

program
  .command("validate")
  .description("Validate an IR JSON file or deck project directory against the schema")
  .argument("<target>", "IR JSON file or deck project directory")
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
    "Deterministic geometry audit (overflow, out-of-bounds, low-contrast, overlap, content-truncated, content-dropped, stepped-aside, monotony), plus an optional --pixels contrast pass — exits 1 when it finds anything",
  )
  .argument("<target>", "IR JSON file or deck project directory")
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
  .argument("<target>", "IR JSON file or deck project directory")
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
  .option("--component <type>", "print one component's schema with the $defs it needs")
  .option("--kind <kind>", "print the components a page of this kind may hold, with their schemas")
  .option("--theme <name>", "with --kind: answer for one theme instead of every built-in theme (deck theme.json, then workspace themes/, then installed packs, then presets)")
  .option("--deck <dir>", "with --theme: the deck project directory to read a deck-local theme from (default: the cwd when it holds deck.spec.json or a deck-local theme file for the name)")
  .option("--pretty", "indent the JSON (default output is one line)")
  .addHelpText(
    "after",
    "\nExamples:\n  $ pptwise schema --spec\n  $ pptwise schema --kind fact --theme brief\n  $ pptwise schema --kind quote --theme acme --deck my-deck/\n  $ pptwise schema --component kpi_cards\n\nOne page of a deck project, with the keys its page file takes and the components its face draws:\n  $ pptwise inspect <deck> --page <id>",
  )
  .action(async (opts: { spec?: boolean; component?: string; kind?: string; theme?: string; deck?: string; pretty?: boolean }) => {
    try {
      console.log(await runSchema(opts))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("inspect")
  .description(
    "Show one page's fill contract: the spec's locked fields, the page file's fields, the components its face draws, the theme's signature layouts for the page with the recipe to write for each, the counts validate holds it to, and validate's findings on it. Exits 1 when the page has an error",
  )
  .argument("<deck>", "deck project directory")
  .requiredOption("--page <id>", "the page id in deck.spec.json")
  .option("--component <type>", "expand one component the page may hold: its story, its limits on this page, and its schema")
  .option("--fit", "draw the page and report whether its content fits, as render's content-drop gate would judge it. Exits 1 when it does not")
  .option("--json", "print the report as one line of JSON")
  .addHelpText(
    "after",
    "\nExamples:\n  $ pptwise inspect my-deck/ --page growth\n  $ pptwise inspect my-deck/ --page growth --component chart\n  $ pptwise inspect my-deck/ --page growth --fit",
  )
  .action(async (target: string, opts: { page: string; component?: string; fit?: boolean; json?: boolean }) => {
    try {
      const { output, failed } = await runInspect(target, {
        page: opts.page,
        component: opts.component,
        fit: opts.fit,
        json: opts.json,
      })
      console.log(output)
      if (failed) process.exit(1)
    } catch (e) {
      fail(e)
    }
  })

program
  .command("icons")
  .description("List every icon name an `icon` field accepts")
  .option("--json", "machine-readable output")
  .action((opts: { json?: boolean }) => console.log(runIcons(Boolean(opts.json))))

const spec = program.command("spec").description("Deck spec commands (spec §6)")
spec
  .command("validate")
  .description("Validate a deck spec JSON file against the schema and strategy-aware hard gates")
  .argument("<spec.json>")
  .option("--json", "print the result as JSON: the pages in order (number, id, type, kind, heading, summary), theme, narrative and warnings, or every error")
  .action(async (specPath: string, opts: { json?: boolean }) => {
    try {
      if (opts.json) {
        const { output, ok } = await runSpecValidateJson(specPath)
        console.log(output)
        if (!ok) process.exitCode = 1
        return
      }
      console.log(await runSpecValidate(specPath))
    } catch (e) {
      fail(e)
    }
  })

program
  .command("assemble")
  .description("Assemble a deck project directory (deck.spec.json + pages/ + assets/) into an IR JSON file")
  .argument("<dir>", "deck project directory")
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
  .description("List the built-in presets and the themes of installed content packs")
  .option("--json", "machine-readable output (each theme's source is builtin or pack)")
  .action(async (opts: { json?: boolean }) => {
    try {
      console.log(await runThemes(Boolean(opts.json)))
    } catch (e) {
      fail(e)
    }
  })

const theme = program.command("theme").description("Copy, fork, and compare themes")
theme
  .command("new")
  .description("Copy a preset or named theme into a self-contained v2 theme file")
  .requiredOption("--from <preset>", "preset or theme name to copy")
  .option("-o, --output <path>", "output theme JSON path")
  .option("--id <id>", "theme id (default: slug of the output filename)")
  .option("--label <label>", "human-readable theme label")
  .option("--force", "overwrite an existing theme file")
  .addHelpText("after", "\nExample:\n  $ pptwise theme new --from brief -o themes/acme.theme.json")
  .action(async (opts: { from: string; output?: string; id?: string; label?: string; force?: boolean }) => {
    try {
      console.log(await runThemeNew({ from: opts.from, output: opts.output, id: opts.id, label: opts.label, force: opts.force, cwd: process.cwd() }))
    } catch (e) {
      fail(e)
    }
  })
theme
  .command("fork")
  .description("Copy a theme and repaint it: around one brand color with --brand, or with exact anchor colors")
  .argument("<name>", "preset or theme name to fork")
  .option(
    "--brand <hex[,hex]>",
    "brand color, and optionally the company's second color after a comma: the theme keeps its ground and text, the brand takes its most visible color slot, and the other colors are drawn from it",
  )
  .option("--primary <hex>", "set colors.primary exactly (instead of --brand)")
  .option("--bg <hex>", "set colors.bg exactly (with --primary)")
  .option("--accent <hex>", "set colors.accent exactly (with --primary)")
  .option("--text <hex>", "set colors.text exactly (with --primary)")
  .option("--surface <hex>", "set colors.surface exactly (with --primary)")
  .option("-o, --output <path>", "output theme JSON path")
  .option("--id <id>", "theme id (default: slug of the output filename)")
  .option("--label <label>", "human-readable theme label")
  .option("--force", "overwrite an existing theme file")
  .addHelpText(
    "after",
    "\nPass --brand alone, or --primary with any of --accent, --bg, --text, --surface. The two ways do not mix: --brand decides every color slot itself, the anchor flags set the slots you name exactly.\n\nExamples:\n  $ pptwise theme fork ink --brand #C8102E -o themes/acme.theme.json\n  $ pptwise theme fork brief --brand '#156082,#E97132' -o themes/acme.theme.json\n  $ pptwise theme fork acme --primary #0B5FFF -o themes/acme-blue.theme.json",
  )
  .action(
    async (
      name: string,
      opts: { brand?: string; primary?: string; bg?: string; accent?: string; text?: string; surface?: string; output?: string; id?: string; label?: string; force?: boolean },
    ) => {
      try {
        console.log(
          await runThemeFork(name, {
            brand: opts.brand,
            primary: opts.primary,
            bg: opts.bg,
            accent: opts.accent,
            text: opts.text,
            surface: opts.surface,
            output: opts.output,
            id: opts.id,
            label: opts.label,
            force: opts.force,
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
  .description(
    "Render the fitting-room sample across 2-4 themes into a contact sheet, or, with --title, your own cover and one content page in any number of themes as SVG files with a manifest",
  )
  .argument("[ids]", "comma-separated theme ids (2-4 for the fixed sample), or all with --title. With --title and no ids, a shortlist of four to six")
  .option("-o, --output <dir>", "output directory (default: .pptwise/theme-try/)")
  .option("--title <text>", "draw this cover title, plus one content page, instead of the fixed sample")
  .option("--subtitle <text>", "with --title: the cover's subheading")
  .option("--lang <lang>", "with --title: language of the default content page, zh or en (default: zh when the title has Chinese, Japanese or Korean characters)")
  .option("--page <file>", "with --title: one content page as a deck page carries it (type, kind, heading, components), in place of the default")
  .option("--json", "with --title: print the manifest as JSON")
  .option("--occasion <words>", "with --title and no ids: occasion words or a narrative preset, comma-separated, that pick the shortlist")
  .addHelpText(
    "after",
    "\nExamples:\n  $ pptwise theme try brief,swiss,memo\n  $ pptwise theme try all --title \"Q3 review\" --subtitle \"Board meeting\" --json\n  $ pptwise theme try --title \"Q3 review\" --occasion business --json",
  )
  .action(
    async (
      ids: string | undefined,
      opts: { output?: string; title?: string; subtitle?: string; lang?: string; page?: string; json?: boolean; occasion?: string },
    ) => {
      try {
        console.log(
          await runThemeTry(ids, {
            output: opts.output,
            cwd: process.cwd(),
            title: opts.title,
            subtitle: opts.subtitle,
            lang: opts.lang,
            page: opts.page,
            json: opts.json,
            occasion: opts.occasion,
          }),
        )
      } catch (e) {
        fail(e)
      }
    },
  )

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
    "Read the brand color (accent1) and its second color (accent2) from a .thmx/.potx/.pptx file and repaint a theme around them, into a pptwise theme file — runs entirely locally, the file never leaves your machine",
  )
  .argument("<file>", "a .thmx theme, .potx template, or .pptx presentation")
  .requiredOption("-o, --output <file>", "output theme JSON path (e.g. my-brand.theme.json)")
  .option("--id <id>", "theme id to register under (default: slug of the output filename)")
  .option("--label <label>", "human-readable theme label (default: the source theme's color-scheme name)")
  .option("--from <preset>", "theme to repaint around the template's brand color, keeping its ground, text, fonts, and menu (default: bulletin)")
  .option(
    "--brand-fonts",
    "put the template's Latin heading and body fonts ahead of the theme's own (Chinese text keeps the theme's faces). A font off the safe font list never reaches the slides, and one without an exact width table may overflow: the command warns about both",
  )
  .option("--force", "overwrite an existing theme file")
  .addHelpText("after", "\nExample:\n  $ pptwise brand extract corp.pptx -o themes/acme.theme.json --from bulletin")
  .action(async (file: string, opts: { output: string; id?: string; label?: string; from?: string; brandFonts?: boolean; force?: boolean }) => {
    try {
      console.log(await runBrandExtract(file, {
        output: opts.output,
        id: opts.id,
        label: opts.label,
        from: opts.from,
        brandFonts: opts.brandFonts,
        force: opts.force,
      }))
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

const license = program.command("license").description("The license key that unlocks content packs")
license
  .command("set <key>")
  .description("Save a license key to $PPTWISE_HOME/license.json (readable by you only)")
  .action(async (key: string) => {
    try {
      console.log(await runLicenseSet(key))
    } catch (e) {
      fail(e)
    }
  })
license
  .command("status")
  .description("Show whether a license key is configured (first 8 characters only)")
  .action(async () => {
    try {
      console.log(await runLicenseStatus())
    } catch (e) {
      fail(e)
    }
  })
license
  .command("clear")
  .description("Remove the saved license key. Installed packs stay in place")
  .action(async () => {
    try {
      console.log(await runLicenseClear())
    } catch (e) {
      fail(e)
    }
  })

const packs = program.command("packs").description("Content packs: extra themes installed under $PPTWISE_HOME/packs")
packs
  .command("sync")
  .description(
    "Install or update every pack your license covers. Without a license it prints a one-line note and exits 0. A failed sync leaves installed packs as they were",
  )
  .option("--json", "machine-readable output")
  .action(async (opts: { json?: boolean }) => {
    try {
      const { output, failed } = await runPacksSync({ json: opts.json })
      console.log(output)
      // exitCode rather than exit(): a long --json report piped to another
      // process is flushed in full before the process ends.
      if (failed) process.exitCode = 1
    } catch (e) {
      fail(e)
    }
  })
packs
  .command("list")
  .description("List installed packs and the themes each one ships")
  .option("--json", "machine-readable output")
  .action(async (opts: { json?: boolean }) => {
    try {
      console.log(await runPacksList({ json: opts.json }))
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
  .requiredOption("--deck <dir>", "deck project directory or IR JSON file")
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
  .requiredOption("--deck <dir>", "deck project directory or IR JSON file")
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
  .requiredOption("--deck <dir>", "deck project directory or IR JSON file")
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
  .argument("<target>", "IR JSON file or deck project directory")
  .option("-o, --output <dir>", "output directory (default: .pptwise/<deck>/ under the project root)")
  .option("--html", "also write a self-contained preview.html (all slides inlined — thumbnail strip, keyboard navigation) for human review")
  .option("--no-git-ignore", "do not write .pptwise/.gitignore or add .pptwise/ to this repository's local exclude file")
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
  .description("Serve a live-reloading HTML preview of an IR JSON file or deck project directory over HTTP")
  .argument("<target>", "IR JSON file or deck project directory")
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
