// @vitest-environment node
/**
 * Where a deck lives, as the DSH plugin sees it: the plugin keeps plain-JS
 * copies of the CLI's workspace rules (`src/cli/workspace.ts`), so these
 * tests hold the two to the same answers for a deck in `.pptwise/decks/`.
 */
import { execFile as execFileCb } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { afterEach, describe, expect, it } from "vitest"
import { DECKS_DIRNAME, isFirstWorkspaceWrite, projectDirOf } from "./cli/workspace"

const execFile = promisify(execFileCb)

interface PluginModule {
  previewRoot: (anchor: string) => string
  __testing: {
    DECKS_DIRNAME: string
    projectDirOf: (start: string) => string
    projectAnchor: (start: string) => string
    isFirstWorkspaceWrite: (dir: string) => Promise<boolean>
    ensureWorkspaceDir: (anchor: string) => Promise<{ created: boolean }>
    workspaceFor: (exec: unknown, target: string | undefined) => string
  }
}

async function plugin(): Promise<PluginModule> {
  // @ts-expect-error untyped on purpose, like the rest of the plugin
  return import("../dsh/preview-tool.js")
}

const dirs: string[] = []
async function tmp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pptwise-dsh-home-"))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

describe("the plugin's deck home", () => {
  it("reads a folder inside .pptwise/ as the project that holds it, as the CLI does", async () => {
    const { __testing } = await plugin()
    expect(__testing.DECKS_DIRNAME).toBe(DECKS_DIRNAME)
    for (const path of ["/tmp/proj/.pptwise/decks/q3", "/tmp/proj/.pptwise/decks/q3/.pptwise/q3", "/tmp/proj/decks/q3", "/tmp/proj"]) {
      expect(__testing.projectDirOf(path)).toBe(projectDirOf(path))
    }
    const proj = await tmp()
    const deck = join(proj, ".pptwise", "decks", "q3")
    await mkdir(deck, { recursive: true })
    expect(__testing.projectAnchor(deck)).toBe(proj)
    await writeFile(join(proj, "pptwise.config.json"), "{}")
    expect(__testing.projectAnchor(deck)).toBe(proj)
  })

  it("keeps the previews of a deck called by its absolute path in the project's .pptwise/, not one nested in it", async () => {
    const { __testing, previewRoot } = await plugin()
    const proj = await tmp()
    const deck = join(proj, ".pptwise", "decks", "q3")
    await mkdir(deck, { recursive: true })
    const workspace = __testing.workspaceFor(undefined, deck)
    expect(previewRoot(__testing.projectAnchor(workspace))).toBe(join(proj, ".pptwise", "previews"))
    expect(previewRoot(__testing.projectAnchor(__testing.workspaceFor(undefined, join(deck, "deck.spec.json"))))).toBe(
      join(proj, ".pptwise", "previews"),
    )
  })

  it("keeps .pptwise/ out of git on its first write when the model created it for a deck", async () => {
    const { __testing } = await plugin()
    const repo = await tmp()
    await execFile("git", ["init", "-q"], { cwd: repo })
    const deck = join(repo, ".pptwise", "decks", "q3")
    await mkdir(deck, { recursive: true })
    await writeFile(join(deck, "deck.spec.json"), "{}")
    const root = join(repo, ".pptwise")
    expect(await __testing.isFirstWorkspaceWrite(root)).toBe(await isFirstWorkspaceWrite(root))
    expect(await __testing.ensureWorkspaceDir(repo)).toMatchObject({ created: true })
    expect(await readFile(join(root, ".gitignore"), "utf8")).toBe("*\n")
    const { stdout } = await execFile("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: repo })
    expect(stdout).toBe("")
    // Once pptwise has written there, a later call leaves the folder as it is,
    // a .gitignore the user removed included.
    await mkdir(join(root, "previews"))
    await rm(join(root, ".gitignore"))
    expect(await __testing.isFirstWorkspaceWrite(root)).toBe(await isFirstWorkspaceWrite(root))
    expect(await __testing.ensureWorkspaceDir(repo)).toEqual({ created: false })
  })
})
