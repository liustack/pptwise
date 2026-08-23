// @vitest-environment node
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  applyInstalledDshPlugin,
  assertPptwiseMountedInDshConfig,
  buildDshDumpConfigInvocation,
  canonicalWorkspacePath,
  inspectInstalledDshPlugin,
  verifyInstalledDshRoute,
  verifyInstalledDshSkill,
  verifyInstalledDshTool,
} from "./dsh-e2e.mts"

describe("dsh e2e preflight", () => {
  const temporaryPaths: string[] = []

  afterEach(async () => {
    await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
  })

  it("uses the filesystem canonical path for workspace identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "pptwise-dsh-e2e-"))
    const alias = `${root}-alias`
    temporaryPaths.push(alias, root)
    await symlink(root, alias, "dir")

    expect(await canonicalWorkspacePath(alias)).toBe(await realpath(root))
  })

  it("verifies the plugin package installed in the selected DSH profile", async () => {
    const dshHome = await mkdtemp(join(tmpdir(), "pptwise-dsh-home-"))
    temporaryPaths.push(dshHome)
    const profileDir = join(dshHome, "profiles", "web")
    const pluginDir = join(profileDir, "node_modules", "@liustack", "pptwise")
    await mkdir(join(pluginDir, "dsh"), { recursive: true })
    await mkdir(join(pluginDir, "dist"), { recursive: true })
    await mkdir(join(pluginDir, "skills", "pptwise"), { recursive: true })
    await writeFile(
      join(profileDir, "package.json"),
      JSON.stringify({ dependencies: { "@liustack/pptwise": "0.19.2" } }),
    )
    await writeFile(
      join(pluginDir, "package.json"),
      JSON.stringify({
        name: "@liustack/pptwise",
        version: "0.19.2",
        type: "module",
        main: "./dsh/index.js",
        dsh: { bundle: { patch: "./cordis.patch.yml" } },
      }),
    )
    await writeFile(
      join(pluginDir, "dsh", "index.js"),
      [
        "export const name = 'pptwise'",
        "export const inject = ['skills', 'tools']",
        "export function apply(ctx) {",
        `  ctx.skills.register({ name: 'pptwise', content: 'node "${join(pluginDir, "dist", "cli.js")}" <args>' })`,
        "  ctx.tools.register({",
        "    name: 'pptwise_preview',",
        "    execute: async () => ({}),",
        "    output: { render: () => [], presentationMeta: () => ({}) },",
        "  })",
        "  ctx.inject(['webServer'], (scope) => {",
        "    scope.webServer.register({ name: 'pptwise-preview', kind: 'prefix', path: '/pptwise/preview', handler: async () => {} })",
        "  })",
        "}",
      ].join("\n"),
    )
    await writeFile(join(pluginDir, "dist", "cli.js"), "#!/usr/bin/env node\n")
    await writeFile(join(pluginDir, "skills", "pptwise", "SKILL.md"), "# pptwise\n")
    await writeFile(join(pluginDir, "cordis.patch.yml"), "- id: pptwise\n")

    const installed = await inspectInstalledDshPlugin({
      dshHome,
      profile: "web",
      expectedVersion: "0.19.2",
    })
    expect(installed).toMatchObject({
      profile: "web",
      declaredSpecifier: "0.19.2",
      installedVersion: "0.19.2",
      pluginDir,
    })
    const applied = await applyInstalledDshPlugin(installed)
    await expect(verifyInstalledDshSkill(installed, applied)).resolves.toMatchObject({ name: "pptwise" })
    expect(verifyInstalledDshTool(applied)).toMatchObject({ name: "pptwise_preview" })
    expect(verifyInstalledDshRoute(applied)).toMatchObject({ path: "/pptwise/preview" })

    // The gate's whole point: each half must be able to fail on its own.
    expect(() => verifyInstalledDshTool({ ...applied, tools: [] })).toThrow(/did not register the pptwise_preview/)
    expect(() =>
      verifyInstalledDshTool({ ...applied, tools: [{ name: "pptwise_preview", execute: undefined }] }),
    ).toThrow(/missing required members: execute, output\.render, output\.presentationMeta/)
    expect(() => verifyInstalledDshRoute({ ...applied, routes: [] })).toThrow(
      /did not register a \/pptwise\/preview route/,
    )
    expect(() => verifyInstalledDshRoute({ ...applied, injected: [], routes: [] })).toThrow(/never asked for/)

    await expect(
      inspectInstalledDshPlugin({ dshHome, profile: "web", expectedVersion: "0.20.0" }),
    ).rejects.toThrow(/has @liustack\/pptwise@0\.19\.2, expected 0\.20\.0/)
  })

  it("requires the composed DSH config to mount the installed pptwise bundle", () => {
    const dump = [
      "# == @liustack/modsearch",
      "- id: modsearch",
      "  name: '@liustack/modsearch'",
      "# == @liustack/pptwise",
      "- id: pptwise",
      "  name: '@liustack/pptwise'",
    ].join("\n")

    expect(() => assertPptwiseMountedInDshConfig(dump)).not.toThrow()
    expect(() => assertPptwiseMountedInDshConfig(dump.replace("id: pptwise", "id: disabled"))).toThrow(
      /does not mount/,
    )
  })

  it("boots DSH config inspection from the canonical workspace", () => {
    expect(buildDshDumpConfigInvocation("/private/tmp/pptwise-dsh-e2e", "web")).toEqual({
      command: "npx",
      args: ["-y", "@deepseek-ai/dsh", "--profile", "web", "--dump-config"],
      cwd: "/private/tmp/pptwise-dsh-e2e",
    })
  })
})
