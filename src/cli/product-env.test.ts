// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest"
import { resetProductEnvWarningsForTests, resolveProductEnv } from "./product-env"

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

afterEach(() => {
  resetProductEnvWarningsForTests()
})

describe("resolveProductEnv", () => {
  it("returns the new name when set", () => {
    const env = { PPTPRESS_PEXELS_API_KEY: "NEWKEY99" }
    expect(resolveProductEnv("PEXELS_API_KEY", env)).toBe("NEWKEY99")
  })

  it("treats an empty new name as unset and falls through to the old name", () => {
    const env = { PPTPRESS_PEXELS_API_KEY: "", PPTFAST_PEXELS_API_KEY: "OLDKEY99" }
    const stderr = captureStderr(() => {
      expect(resolveProductEnv("PEXELS_API_KEY", env)).toBe("OLDKEY99")
    })
    expect(stderr).toContain("PPTFAST_PEXELS_API_KEY")
    expect(stderr).toContain("PPTPRESS_PEXELS_API_KEY")
  })

  it("uses the old name as an alias and warns once, mentioning both names", () => {
    const env = { PPTFAST_HOME: "/legacy/home" }
    const first = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/legacy/home")
    })
    const second = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/legacy/home")
    })
    expect(first).toContain("PPTFAST_HOME")
    expect(first).toContain("PPTPRESS_HOME")
    expect(first.split("\n").filter((line) => line.includes("PPTFAST_HOME"))).toHaveLength(1)
    expect(second).toBe("")
  })

  it("lets the new name win over the old name with no warning", () => {
    const env = { PPTPRESS_HOME: "/new/home", PPTFAST_HOME: "/legacy/home" }
    const stderr = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/new/home")
    })
    expect(stderr).toBe("")
  })

  it("treats empty strings on both names as unset", () => {
    const env = { PPTPRESS_HOME: "", PPTFAST_HOME: "" }
    expect(resolveProductEnv("HOME", env)).toBeUndefined()
  })

  it("consults the passed env object, not process.env", () => {
    const original = process.env.PPTPRESS_PEXELS_API_KEY
    process.env.PPTPRESS_PEXELS_API_KEY = "PROCESS99"
    try {
      expect(resolveProductEnv("PEXELS_API_KEY", { PPTPRESS_PEXELS_API_KEY: "PASSED99" })).toBe("PASSED99")
      expect(resolveProductEnv("PEXELS_API_KEY", {})).toBeUndefined()
    } finally {
      if (original === undefined) delete process.env.PPTPRESS_PEXELS_API_KEY
      else process.env.PPTPRESS_PEXELS_API_KEY = original
    }
  })
})
