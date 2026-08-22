// @vitest-environment node
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { decksRoot, pptpressHome, userConfigPath } from "./home"
import { resetProductEnvWarningsForTests } from "./product-env"

const originalHome = process.env.PPTPRESS_HOME
const originalLegacyHome = process.env.PPTFAST_HOME
const fakeHomes: string[] = []

async function fakeHomedir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pptpress-fake-home-"))
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
  if (originalHome === undefined) delete process.env.PPTPRESS_HOME
  else process.env.PPTPRESS_HOME = originalHome
  if (originalLegacyHome === undefined) delete process.env.PPTFAST_HOME
  else process.env.PPTFAST_HOME = originalLegacyHome
  await Promise.all(fakeHomes.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

describe("pptpressHome", () => {
  it("defaults to ~/.pptpress when neither env is set and neither dir exists", async () => {
    delete process.env.PPTPRESS_HOME
    delete process.env.PPTFAST_HOME
    const home = await fakeHomedir()
    expect(pptpressHome({ homedir: () => home })).toBe(join(home, ".pptpress"))
    expect(existsSync(join(home, ".pptpress"))).toBe(false)
  })

  it("honors PPTPRESS_HOME when set", () => {
    process.env.PPTPRESS_HOME = "/tmp/custom-pptpress-home"
    expect(pptpressHome()).toBe("/tmp/custom-pptpress-home")
  })

  it("treats an empty PPTPRESS_HOME as unset", async () => {
    const home = await fakeHomedir()
    process.env.PPTPRESS_HOME = ""
    delete process.env.PPTFAST_HOME
    expect(pptpressHome({ homedir: () => home })).toBe(join(home, ".pptpress"))
    expect(decksRoot(undefined, { homedir: () => home })).toBe(join(home, ".pptpress", "decks"))
    expect(userConfigPath({ homedir: () => home })).toBe(join(home, ".pptpress", "config.json"))
  })

  it("uses PPTFAST_HOME as an alias and writes one stderr line mentioning both names", () => {
    process.env.PPTFAST_HOME = "/tmp/legacy-pptfast-home"
    delete process.env.PPTPRESS_HOME
    const stderr = captureStderr(() => {
      expect(pptpressHome()).toBe("/tmp/legacy-pptfast-home")
    })
    expect(stderr).toContain("PPTFAST_HOME")
    expect(stderr).toContain("PPTPRESS_HOME")
  })

  it("lets PPTPRESS_HOME win over PPTFAST_HOME with no warning", () => {
    process.env.PPTPRESS_HOME = "/tmp/new-home"
    process.env.PPTFAST_HOME = "/tmp/legacy-home"
    const stderr = captureStderr(() => {
      expect(pptpressHome()).toBe("/tmp/new-home")
    })
    expect(stderr).toBe("")
  })

  it("falls through an empty PPTPRESS_HOME to a set PPTFAST_HOME and warns", () => {
    process.env.PPTPRESS_HOME = ""
    process.env.PPTFAST_HOME = "/tmp/legacy-from-empty-new"
    const stderr = captureStderr(() => {
      expect(pptpressHome()).toBe("/tmp/legacy-from-empty-new")
    })
    expect(stderr).toContain("PPTFAST_HOME")
    expect(stderr).toContain("PPTPRESS_HOME")
  })

  it("re-reads the env var on every call (not cached)", () => {
    delete process.env.PPTPRESS_HOME
    delete process.env.PPTFAST_HOME
    process.env.PPTPRESS_HOME = "/tmp/first-home"
    expect(pptpressHome()).toBe("/tmp/first-home")
    process.env.PPTPRESS_HOME = "/tmp/other-home"
    expect(pptpressHome()).toBe("/tmp/other-home")
  })

  it("copies ~/.pptfast into ~/.pptpress once and leaves the old dir in place", async () => {
    delete process.env.PPTPRESS_HOME
    delete process.env.PPTFAST_HOME
    const home = await fakeHomedir()
    const legacy = join(home, ".pptfast")
    const next = join(home, ".pptpress")
    await mkdir(join(legacy, "decks", "x"), { recursive: true })
    await writeFile(join(legacy, "config.json"), '{"theme":"tech"}\n')
    await writeFile(join(legacy, "decks", "x", "deck.json"), '{"ok":true}\n')
    expect(pptpressHome({ homedir: () => home })).toBe(next)
    expect(existsSync(legacy)).toBe(true)
    expect(await readFile(join(next, "config.json"), "utf8")).toBe('{"theme":"tech"}\n')
    expect(await readFile(join(next, "decks", "x", "deck.json"), "utf8")).toBe('{"ok":true}\n')
    expect(await readFile(join(legacy, "config.json"), "utf8")).toBe('{"theme":"tech"}\n')
    expect(await readFile(join(legacy, "decks", "x", "deck.json"), "utf8")).toBe('{"ok":true}\n')
  })

  it("does not migrate when the new dir already exists", async () => {
    delete process.env.PPTPRESS_HOME
    delete process.env.PPTFAST_HOME
    const home = await fakeHomedir()
    await mkdir(join(home, ".pptpress"), { recursive: true })
    await mkdir(join(home, ".pptfast"), { recursive: true })
    await writeFile(join(home, ".pptpress", "config.json"), '{"from":"new"}\n')
    await writeFile(join(home, ".pptfast", "config.json"), '{"from":"old"}\n')
    expect(pptpressHome({ homedir: () => home })).toBe(join(home, ".pptpress"))
    expect(await readFile(join(home, ".pptpress", "config.json"), "utf8")).toBe('{"from":"new"}\n')
    expect(await readFile(join(home, ".pptfast", "config.json"), "utf8")).toBe('{"from":"old"}\n')
  })

  it("does not migrate the default dir when an env override is set", async () => {
    const home = await fakeHomedir()
    await mkdir(join(home, ".pptfast"), { recursive: true })
    await writeFile(join(home, ".pptfast", "config.json"), '{"from":"old"}\n')
    process.env.PPTPRESS_HOME = "/tmp/env-override-home"
    expect(pptpressHome({ homedir: () => home })).toBe("/tmp/env-override-home")
    expect(existsSync(join(home, ".pptpress"))).toBe(false)
  })

  it("warns once across two reads of the legacy env", () => {
    delete process.env.PPTPRESS_HOME
    process.env.PPTFAST_HOME = "/tmp/legacy-once"
    const first = captureStderr(() => {
      pptpressHome()
    })
    const second = captureStderr(() => {
      pptpressHome()
    })
    expect(first).toContain("PPTFAST_HOME")
    expect(second).toBe("")
  })
})

describe("decksRoot", () => {
  it("defaults to $PPTPRESS_HOME/decks with no config", () => {
    process.env.PPTPRESS_HOME = "/tmp/pptpress-home-a"
    expect(decksRoot()).toBe(join("/tmp/pptpress-home-a", "decks"))
  })

  it("defaults to $PPTPRESS_HOME/decks when config has no decksDir", () => {
    process.env.PPTPRESS_HOME = "/tmp/pptpress-home-b"
    expect(decksRoot({})).toBe(join("/tmp/pptpress-home-b", "decks"))
  })

  it("uses config.decksDir as an override when present", () => {
    process.env.PPTPRESS_HOME = "/tmp/pptpress-home-c"
    expect(decksRoot({ decksDir: "/elsewhere/decks" })).toBe("/elsewhere/decks")
  })

  it("resolves a relative decksDir against PPTPRESS_HOME, not the cwd (W5 review fix)", () => {
    process.env.PPTPRESS_HOME = "/tmp/pptpress-home-relative"
    expect(decksRoot({ decksDir: "team-decks" })).toBe(join("/tmp/pptpress-home-relative", "team-decks"))
  })

  it("does not expand a leading tilde in decksDir — it is one literal relative path segment", () => {
    process.env.PPTPRESS_HOME = "/tmp/pptpress-home-tilde"
    expect(decksRoot({ decksDir: "~/team-decks" })).toBe(join("/tmp/pptpress-home-tilde", "~/team-decks"))
  })
})

describe("userConfigPath", () => {
  it("is $PPTPRESS_HOME/config.json", () => {
    process.env.PPTPRESS_HOME = "/tmp/pptpress-home-d"
    expect(userConfigPath()).toBe(join("/tmp/pptpress-home-d", "config.json"))
  })
})
