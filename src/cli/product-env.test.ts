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
    const env = { PPTWISE_PEXELS_API_KEY: "NEWKEY99" }
    expect(resolveProductEnv("PEXELS_API_KEY", env)).toBe("NEWKEY99")
  })

  it("treats an empty new name as unset and falls through to PPTPRESS then PPTFAST", () => {
    const press = captureStderr(() => {
      expect(
        resolveProductEnv("PEXELS_API_KEY", {
          PPTWISE_PEXELS_API_KEY: "",
          PPTPRESS_PEXELS_API_KEY: "PRESSKEY99",
          PPTFAST_PEXELS_API_KEY: "FASTKEY99",
        }),
      ).toBe("PRESSKEY99")
    })
    expect(press).toContain("PPTPRESS_PEXELS_API_KEY")
    expect(press).toContain("PPTWISE_PEXELS_API_KEY")
    expect(press).not.toContain("PPTFAST_PEXELS_API_KEY")

    const fast = captureStderr(() => {
      expect(
        resolveProductEnv("PEXELS_API_KEY", {
          PPTWISE_PEXELS_API_KEY: "",
          PPTPRESS_PEXELS_API_KEY: "",
          PPTFAST_PEXELS_API_KEY: "FASTKEY99",
        }),
      ).toBe("FASTKEY99")
    })
    expect(fast).toContain("PPTFAST_PEXELS_API_KEY")
    expect(fast).toContain("PPTWISE_PEXELS_API_KEY")
  })

  it("uses PPTPRESS_HOME as an alias and warns once, mentioning both names", () => {
    const env = { PPTPRESS_HOME: "/press/home" }
    const first = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/press/home")
    })
    const second = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/press/home")
    })
    expect(first).toContain("PPTPRESS_HOME")
    expect(first).toContain("PPTWISE_HOME")
    expect(first.split("\n").filter((line) => line.includes("PPTPRESS_HOME"))).toHaveLength(1)
    expect(second).toBe("")
  })

  it("uses PPTFAST_HOME as an alias and warns once, mentioning both names", () => {
    const env = { PPTFAST_HOME: "/legacy/home" }
    const first = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/legacy/home")
    })
    const second = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/legacy/home")
    })
    expect(first).toContain("PPTFAST_HOME")
    expect(first).toContain("PPTWISE_HOME")
    expect(first.split("\n").filter((line) => line.includes("PPTFAST_HOME"))).toHaveLength(1)
    expect(second).toBe("")
  })

  it("lets PPTWISE win over both aliases with no warning", () => {
    const env = { PPTWISE_HOME: "/new/home", PPTPRESS_HOME: "/press/home", PPTFAST_HOME: "/legacy/home" }
    const stderr = captureStderr(() => {
      expect(resolveProductEnv("HOME", env)).toBe("/new/home")
    })
    expect(stderr).toBe("")
  })

  it("lets PPTPRESS win over PPTFAST when the new name is unset", () => {
    const stderr = captureStderr(() => {
      expect(
        resolveProductEnv("HOME", { PPTPRESS_HOME: "/press/home", PPTFAST_HOME: "/legacy/home" }),
      ).toBe("/press/home")
    })
    expect(stderr).toContain("PPTPRESS_HOME")
    expect(stderr).not.toContain("PPTFAST_HOME")
  })

  it("treats empty strings on every name as unset", () => {
    const env = { PPTWISE_HOME: "", PPTPRESS_HOME: "", PPTFAST_HOME: "" }
    expect(resolveProductEnv("HOME", env)).toBeUndefined()
  })

  it("consults the passed env object, not process.env", () => {
    const original = process.env.PPTWISE_PEXELS_API_KEY
    process.env.PPTWISE_PEXELS_API_KEY = "PROCESS99"
    try {
      expect(resolveProductEnv("PEXELS_API_KEY", { PPTWISE_PEXELS_API_KEY: "PASSED99" })).toBe("PASSED99")
      expect(resolveProductEnv("PEXELS_API_KEY", {})).toBeUndefined()
    } finally {
      if (original === undefined) delete process.env.PPTWISE_PEXELS_API_KEY
      else process.env.PPTWISE_PEXELS_API_KEY = original
    }
  })
})
