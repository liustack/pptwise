// @vitest-environment node
import { existsSync } from "node:fs"
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { pptwiseHome, userConfigPath } from "./home"
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

  it("leaves a leftover ~/.pptpress or ~/.pptfast alone and creates nothing", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    await mkdir(join(home, ".pptpress"), { recursive: true })
    await mkdir(join(home, ".pptfast"), { recursive: true })
    await writeFile(join(home, ".pptpress", "config.json"), '{"from":"press"}\n')
    expect(pptwiseHome({ homedir: () => home })).toBe(join(home, ".pptwise"))
    expect(existsSync(join(home, ".pptwise"))).toBe(false)
    expect(existsSync(join(home, ".pptwise.migrating"))).toBe(false)
  })

  it("resolves a home under a read-only home directory without writing", async () => {
    unsetProductHomes()
    const home = await fakeHomedir()
    await mkdir(join(home, ".pptpress"), { recursive: true })
    await chmod(home, 0o500)
    try {
      expect(pptwiseHome({ homedir: () => home })).toBe(join(home, ".pptwise"))
    } finally {
      await chmod(home, 0o700)
    }
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

describe("userConfigPath", () => {
  it("is $PPTWISE_HOME/config.json", () => {
    process.env.PPTWISE_HOME = "/tmp/pptwise-home-d"
    expect(userConfigPath()).toBe(join("/tmp/pptwise-home-d", "config.json"))
  })
})
