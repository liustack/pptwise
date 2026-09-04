// @vitest-environment node
import { existsSync, lstatSync, symlinkSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { decksRoot, pptwiseHome, userConfigPath } from "./home"
import { resetProductEnvWarningsForTests } from "./product-env"

const originalHome = process.env.PPTWISE_HOME
const originalPressHome = process.env.PPTPRESS_HOME
const originalLegacyHome = process.env.PPTFAST_HOME
const fakeHomes: string[] = []

function unsetProductHomes(): void {
  delete process.env.PPTWISE_HOME
  delete process.env.PPTPRESS_HOME
  delete process.env.PPTFAST_HOME
}

async function fakeHomedir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pptwise-fake-home-"))
  fakeHomes.push(dir)
  return dir
}

function captureStderr(fn: () => void): string {
  const chunks: string[] = []
  const orig = process.stderr.write.bind(process.stderr)
  process.stderr.write = ((chunk: unknown) => {
    chunks.push(String(chunk))
    return true
  }) as typeof process.stderr.write
  try {
    fn()
    return chunks.join("")
  } finally {
    process.stderr.write = orig
  }
}

afterEach(async () => {
  resetProductEnvWarningsForTests()
  if (originalHome === undefined) delete process.env.PPTWISE_HOME
  else process.env.PPTWISE_HOME = originalHome
  if (originalPressHome === undefined) delete process.env.PPTPRESS_HOME
  else process.env.PPTPRESS_HOME = originalPressHome
  if (originalLegacyHome === undefined) delete process.env.PPTFAST_HOME
  else process.env.PPTFAST_HOME = originalLegacyHome
  await Promise.all(fakeHomes.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

describe("pptwiseHome", () => {
  it("defaults to ~/.pptwise when no env is set and no legacy dir exists", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    expect(pptwiseHome({ homedir: () => home })).toBe(join(home, ".pptwise"))
    expect(existsSync(join(home, ".pptwise"))).toBe(false)
    expect(existsSync(join(home, ".pptpress"))).toBe(false)
    expect(existsSync(join(home, ".pptfast"))).toBe(false)
  })

  it("honors PPTWISE_HOME when set", () => {
    process.env.PPTWISE_HOME = "/tmp/custom-pptwise-home"
    expect(pptwiseHome()).toBe("/tmp/custom-pptwise-home")
  })

  it("treats an empty PPTWISE_HOME as unset", async () => {
    const home = await fakeHomedir()
    process.env.PPTWISE_HOME = ""
    delete process.env.PPTPRESS_HOME
    delete process.env.PPTFAST_HOME
    expect(pptwiseHome({ homedir: () => home })).toBe(join(home, ".pptwise"))
    expect(decksRoot(undefined, { homedir: () => home })).toBe(join(home, ".pptwise", "decks"))
    expect(userConfigPath({ homedir: () => home })).toBe(join(home, ".pptwise", "config.json"))
  })

  it("uses PPTPRESS_HOME as an alias and writes one stderr line mentioning both names", () => {
    process.env.PPTPRESS_HOME = "/tmp/legacy-pptpress-home"
    delete process.env.PPTWISE_HOME
    delete process.env.PPTFAST_HOME
    const stderr = captureStderr(() => {
      expect(pptwiseHome()).toBe("/tmp/legacy-pptpress-home")
    })
    expect(stderr).toContain("PPTPRESS_HOME")
    expect(stderr).toContain("PPTWISE_HOME")
  })

  it("uses PPTFAST_HOME as an alias and writes one stderr line mentioning both names", () => {
    process.env.PPTFAST_HOME = "/tmp/legacy-pptfast-home"
    delete process.env.PPTWISE_HOME
    delete process.env.PPTPRESS_HOME
    const stderr = captureStderr(() => {
      expect(pptwiseHome()).toBe("/tmp/legacy-pptfast-home")
    })
    expect(stderr).toContain("PPTFAST_HOME")
    expect(stderr).toContain("PPTWISE_HOME")
  })

  it("lets PPTWISE_HOME win over both aliases with no warning", () => {
    process.env.PPTWISE_HOME = "/tmp/new-home"
    process.env.PPTPRESS_HOME = "/tmp/press-home"
    process.env.PPTFAST_HOME = "/tmp/legacy-home"
    const stderr = captureStderr(() => {
      expect(pptwiseHome()).toBe("/tmp/new-home")
    })
    expect(stderr).toBe("")
  })

  it("lets PPTPRESS_HOME win over PPTFAST_HOME when PPTWISE_HOME is unset", () => {
    delete process.env.PPTWISE_HOME
    process.env.PPTPRESS_HOME = "/tmp/press-home"
    process.env.PPTFAST_HOME = "/tmp/legacy-home"
    const stderr = captureStderr(() => {
      expect(pptwiseHome()).toBe("/tmp/press-home")
    })
    expect(stderr).toContain("PPTPRESS_HOME")
    expect(stderr).not.toContain("PPTFAST_HOME")
  })

  it("falls through an empty PPTWISE_HOME to a set PPTFAST_HOME and warns", () => {
    process.env.PPTWISE_HOME = ""
    delete process.env.PPTPRESS_HOME
    process.env.PPTFAST_HOME = "/tmp/legacy-from-empty-new"
    const stderr = captureStderr(() => {
      expect(pptwiseHome()).toBe("/tmp/legacy-from-empty-new")
    })
    expect(stderr).toContain("PPTFAST_HOME")
    expect(stderr).toContain("PPTWISE_HOME")
  })

  it("re-reads the env var on every call (not cached)", () => {
    unsetProductHomes()
    process.env.PPTWISE_HOME = "/tmp/first-home"
    expect(pptwiseHome()).toBe("/tmp/first-home")
    process.env.PPTWISE_HOME = "/tmp/other-home"
    expect(pptwiseHome()).toBe("/tmp/other-home")
  })

  it("copies ~/.pptpress into ~/.pptwise when only that old dir exists, and leaves it in place", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    const legacy = join(home, ".pptpress")
    const next = join(home, ".pptwise")
    await mkdir(join(legacy, "decks", "x"), { recursive: true })
    await writeFile(join(legacy, "config.json"), '{"theme":"terminal"}\n')
    await writeFile(join(legacy, "decks", "x", "deck.json"), '{"ok":true}\n')
    expect(pptwiseHome({ homedir: () => home })).toBe(next)
    expect(existsSync(legacy)).toBe(true)
    expect(await readFile(join(next, "config.json"), "utf8")).toBe('{"theme":"terminal"}\n')
    expect(await readFile(join(next, "decks", "x", "deck.json"), "utf8")).toBe('{"ok":true}\n')
    expect(await readFile(join(legacy, "config.json"), "utf8")).toBe('{"theme":"terminal"}\n')
  })

  it("copies ~/.pptfast into ~/.pptwise when only that old dir exists, and leaves it in place", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    const legacy = join(home, ".pptfast")
    const next = join(home, ".pptwise")
    await mkdir(join(legacy, "decks", "x"), { recursive: true })
    await writeFile(join(legacy, "config.json"), '{"theme":"terminal"}\n')
    await writeFile(join(legacy, "decks", "x", "deck.json"), '{"ok":true}\n')
    expect(pptwiseHome({ homedir: () => home })).toBe(next)
    expect(existsSync(legacy)).toBe(true)
    expect(await readFile(join(next, "config.json"), "utf8")).toBe('{"theme":"terminal"}\n')
    expect(await readFile(join(next, "decks", "x", "deck.json"), "utf8")).toBe('{"ok":true}\n')
    expect(await readFile(join(legacy, "config.json"), "utf8")).toBe('{"theme":"terminal"}\n')
    expect(await readFile(join(legacy, "decks", "x", "deck.json"), "utf8")).toBe('{"ok":true}\n')
  })

  it("copies ~/.pptpress, not ~/.pptfast, when both old dirs exist", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    const press = join(home, ".pptpress")
    const fast = join(home, ".pptfast")
    const next = join(home, ".pptwise")
    await mkdir(press, { recursive: true })
    await mkdir(fast, { recursive: true })
    await writeFile(join(press, "config.json"), '{"from":"press"}\n')
    await writeFile(join(fast, "config.json"), '{"from":"fast"}\n')
    expect(pptwiseHome({ homedir: () => home })).toBe(next)
    expect(existsSync(press)).toBe(true)
    expect(existsSync(fast)).toBe(true)
    expect(await readFile(join(next, "config.json"), "utf8")).toBe('{"from":"press"}\n')
    expect(await readFile(join(press, "config.json"), "utf8")).toBe('{"from":"press"}\n')
    expect(await readFile(join(fast, "config.json"), "utf8")).toBe('{"from":"fast"}\n')
  })

  it("copies a symlink ~/.pptfast as a real directory and leaves the link in place", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    const payload = join(home, "legacy-payload")
    const legacy = join(home, ".pptfast")
    const next = join(home, ".pptwise")
    await mkdir(join(payload, "decks", "x"), { recursive: true })
    await writeFile(join(payload, "config.json"), '{"theme":"terminal"}\n')
    await writeFile(join(payload, "decks", "x", "deck.json"), '{"ok":true}\n')
    try {
      symlinkSync(payload, legacy, "dir")
    } catch {
      return
    }
    expect(pptwiseHome({ homedir: () => home })).toBe(next)
    expect(lstatSync(next).isSymbolicLink()).toBe(false)
    expect(lstatSync(next).isDirectory()).toBe(true)
    expect(lstatSync(legacy).isSymbolicLink()).toBe(true)
    expect(await readFile(join(next, "config.json"), "utf8")).toBe('{"theme":"terminal"}\n')
    expect(await readFile(join(next, "decks", "x", "deck.json"), "utf8")).toBe('{"ok":true}\n')
    expect(await readFile(join(legacy, "config.json"), "utf8")).toBe('{"theme":"terminal"}\n')
  })

  it("does not migrate when the new dir already exists", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    await mkdir(join(home, ".pptwise"), { recursive: true })
    await mkdir(join(home, ".pptfast"), { recursive: true })
    await writeFile(join(home, ".pptwise", "config.json"), '{"from":"new"}\n')
    await writeFile(join(home, ".pptfast", "config.json"), '{"from":"old"}\n')
    expect(pptwiseHome({ homedir: () => home })).toBe(join(home, ".pptwise"))
    expect(await readFile(join(home, ".pptwise", "config.json"), "utf8")).toBe('{"from":"new"}\n')
    expect(await readFile(join(home, ".pptfast", "config.json"), "utf8")).toBe('{"from":"old"}\n')
  })

  it("does not migrate the default dir when an env override is set", async () => {
    const home = await fakeHomedir()
    await mkdir(join(home, ".pptfast"), { recursive: true })
    await writeFile(join(home, ".pptfast", "config.json"), '{"from":"old"}\n')
    process.env.PPTWISE_HOME = "/tmp/env-override-home"
    expect(pptwiseHome({ homedir: () => home })).toBe("/tmp/env-override-home")
    expect(existsSync(join(home, ".pptwise"))).toBe(false)
  })

  it("warns once across two reads of the legacy env", () => {
    unsetProductHomes()
    process.env.PPTFAST_HOME = "/tmp/legacy-once"
    const first = captureStderr(() => {
      pptwiseHome()
    })
    const second = captureStderr(() => {
      pptwiseHome()
    })
    expect(first).toContain("PPTFAST_HOME")
    expect(second).toBe("")
  })
})

describe("decksRoot", () => {
  it("defaults to $PPTWISE_HOME/decks with no config", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-a"
    expect(decksRoot()).toBe(join("/tmp/pptwise-home-a", "decks"))
  })

  it("defaults to $PPTWISE_HOME/decks when config has no decksDir", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-b"
    expect(decksRoot({})).toBe(join("/tmp/pptwise-home-b", "decks"))
  })

  it("uses config.decksDir as an override when present", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-c"
    expect(decksRoot({ decksDir: "/elsewhere/decks" })).toBe("/elsewhere/decks")
  })

  it("resolves a relative decksDir against PPTWISE_HOME, not the cwd (W5 review fix)", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-relative"
    expect(decksRoot({ decksDir: "team-decks" })).toBe(join("/tmp/pptwise-home-relative", "team-decks"))
  })

  it("does not expand a leading tilde in decksDir — it is one literal relative path segment", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-tilde"
    expect(decksRoot({ decksDir: "~/team-decks" })).toBe(join("/tmp/pptwise-home-tilde", "~/team-decks"))
  })
})

describe("userConfigPath", () => {
  it("is $PPTWISE_HOME/config.json", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-d"
    expect(userConfigPath()).toBe(join("/tmp/pptwise-home-d", "config.json"))
  })
})
