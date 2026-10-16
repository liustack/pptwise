// @vitest-environment node
import { describe, expect, it } from "vitest"
import { assertSafeRemoteTarget, isBlockedHostname, isPrivateIpAddress } from "./ssrf"

const publicLookup = async () => [{ address: "1.1.1.1", family: 4 }]

describe("isBlockedHostname", () => {
  it("rejects localhost, *.localhost, and cloud metadata names", () => {
    expect(isBlockedHostname("localhost")).toBe(true)
    expect(isBlockedHostname("foo.localhost")).toBe(true)
    expect(isBlockedHostname("metadata.google.internal")).toBe(true)
    expect(isBlockedHostname("metadata.amazonaws.com")).toBe(true)
    expect(isBlockedHostname("metadata.azure.internal")).toBe(true)
    expect(isBlockedHostname("images.pexels.com")).toBe(false)
  })
})

describe("isPrivateIpAddress", () => {
  it("rejects loopback, RFC1918, link-local, unspecified, CGNAT, and multicast IPv4", () => {
    expect(isPrivateIpAddress("127.0.0.1")).toBe(true)
    expect(isPrivateIpAddress("10.0.0.1")).toBe(true)
    expect(isPrivateIpAddress("172.16.5.1")).toBe(true)
    expect(isPrivateIpAddress("192.168.1.1")).toBe(true)
    expect(isPrivateIpAddress("169.254.1.1")).toBe(true)
    expect(isPrivateIpAddress("0.0.0.0")).toBe(true)
    expect(isPrivateIpAddress("100.64.0.1")).toBe(true)
    expect(isPrivateIpAddress("224.0.0.1")).toBe(true)
    expect(isPrivateIpAddress("8.8.8.8")).toBe(false)
  })

  // Fake-ip proxies (Clash, Surge) answer every name with an address in the
  // RFC 2544 benchmark range, so refusing it failed every download behind one.
  it("allows the benchmark range 198.18.0.0/15 and keeps every private range refused", () => {
    expect(isPrivateIpAddress("198.18.0.1")).toBe(false)
    expect(isPrivateIpAddress("198.18.255.254")).toBe(false)
    expect(isPrivateIpAddress("198.19.0.7")).toBe(false)
    expect(isPrivateIpAddress("198.19.255.255")).toBe(false)
    expect(isPrivateIpAddress("::ffff:198.18.0.1")).toBe(false)
    // Its neighbours are ordinary public addresses, allowed before and after.
    expect(isPrivateIpAddress("198.17.255.255")).toBe(false)
    expect(isPrivateIpAddress("198.20.0.0")).toBe(false)
    const refused = ["0.1.2.3", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1", "172.16.0.1", "192.0.0.1"]
    for (const address of [...refused, "192.168.1.1", "224.0.0.1", "255.255.255.255", "::ffff:10.0.0.1"]) {
      expect(isPrivateIpAddress(address)).toBe(true)
    }
  })

  it("rejects loopback, mapped IPv4, link-local, and ULA IPv6", () => {
    expect(isPrivateIpAddress("::1")).toBe(true)
    expect(isPrivateIpAddress("::ffff:127.0.0.1")).toBe(true)
    expect(isPrivateIpAddress("fe80::1")).toBe(true)
    expect(isPrivateIpAddress("fc00::1")).toBe(true)
    expect(isPrivateIpAddress("2001:4860:4860::8888")).toBe(false)
  })
})

describe("assertSafeRemoteTarget", () => {
  it("rejects a blocked hostname without calling lookup", async () => {
    let called = false
    await expect(
      assertSafeRemoteTarget(new URL("https://localhost/x.png"), async () => {
        called = true
        return []
      }),
    ).rejects.toThrow(/localhost/)
    expect(called).toBe(false)
  })

  it("rejects when any resolved address is private and names the host and IP", async () => {
    await expect(
      assertSafeRemoteTarget(new URL("https://evil.example/x.png"), async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "10.1.2.3", family: 4 },
      ]),
    ).rejects.toThrow(/evil\.example.*10\.1\.2\.3|10\.1\.2\.3.*evil\.example/)
  })

  it("pins the first public address", async () => {
    const pin = await assertSafeRemoteTarget(new URL("https://cdn.example/a.jpg"), publicLookup)
    expect(pin).toEqual({ hostname: "cdn.example", address: "1.1.1.1", family: 4 })
  })

  it("pins a host a fake-ip proxy resolved into 198.18.0.0/15, and still refuses a private one beside it", async () => {
    const pin = await assertSafeRemoteTarget(new URL("https://images.example/a.jpg"), async () => [
      { address: "198.18.0.42", family: 4 },
    ])
    expect(pin).toEqual({ hostname: "images.example", address: "198.18.0.42", family: 4 })
    await expect(
      assertSafeRemoteTarget(new URL("https://images.example/a.jpg"), async () => [
        { address: "198.19.3.4", family: 4 },
        { address: "192.168.1.1", family: 4 },
      ]),
    ).rejects.toThrow(/192\.168\.1\.1/)
  })

  it("rejects a literal private IP without DNS", async () => {
    await expect(assertSafeRemoteTarget(new URL("https://192.168.0.9/x.png"), publicLookup)).rejects.toThrow(
      /192\.168\.0\.9/,
    )
  })
})
