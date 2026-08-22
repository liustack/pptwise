// @vitest-environment node
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  applyInstalledDshPlugin,
  assertPptpressMountedInDshConfig,
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
    const root = await mkdtemp(join(tmpdir(), "pptpress-dsh-e2e-"))
    const alias = `${root}-alias`
    temporaryPaths.push(alias, root)
    await symlink(root, alias, "dir")

    expect(await canonicalWorkspacePath(alias)).toBe(await realpath(root))
  })

  it("verifies the plugin package installed in the selected DSH profile", async () => {
    const dshHome = await mkdtemp(join(tmpdir(), "pptpress-dsh-home-"))
    temporaryPaths.push(dshHome)
    const profileDir = join(dshHome, "profiles", "web")
    const pluginDir = join(profileDir, "node_modules", "@liustack", "pptpress")
    await mkdir(join(pluginDir, "dsh"), { recursive: true })
    await mkdir(join(pluginDir, "dist"), { recursive: true })
    await mkdir(join(pluginDir, "skills", "pptpress"), { recursive: true })
    await writeFile(
      join(profileDir, "package.json"),
      JSON.stringify({ dependencies: { "@liustack/pptpress": "0.19.2" } }),
    )
    await writeFile(
      join(pluginDir, "package.json"),
      JSON.stringify({
        name: "@liustack/pptpress",
        version: "0.19.2",
        type: "module",
        main: "./dsh/index.js",
        dsh: { bundle: { patch: "./cordis.patch.yml" } },
      }),
    )
    await writeFile(
      join(pluginDir, "dsh", "index.js"),
      [
        "export const name = 'pptpress'",
        "export const inject = ['skills', 'tools']",
        "export function apply(ctx) {",
        `  ctx.skills.register({ name: 'pptpress', content: 'node "${join(pluginDir, "dist", "cli.js")}" <args>' })`,
        "  ctx.tools.register({",
        "    name: 'pptpress_preview',",
        "    execute: async () => ({}),",
        "    output: { render: () => [], presentationMeta: () => ({}) },",
        "  })",
        "  ctx.inject(['webServer'], (scope) => {",
        "    scope.webServer.register({ name: 'pptpress-preview', kind: 'prefix', path: '/pptpress/preview', handler: async () => {} })",
        "  })",
        "}",
      ].join("\n"),
    )
    await writeFile(join(pluginDir, "dist", "cli.js"), "#!/usr/bin/env node\n")
    await writeFile(join(pluginDir, "skills", "pptpress", "SKILL.md"), "# pptpress\n")
    await writeFile(join(pluginDir, "cordis.patch.yml"), "- id: pptpress\n")

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
    await expect(verifyInstalledDshSkill(installed, applied)).resolves.toMatchObject({ name: "pptpress" })
    expect(verifyInstalledDshTool(applied)).toMatchObject({ name: "pptpress_preview" })
    expect(verifyInstalledDshRoute(applied)).toMatchObject({ path: "/pptpress/preview" })

    // The gate's whole point: each half must be able to fail on its own.
    expect(() => verifyInstalledDshTool({ ...applied, tools: [] })).toThrow(/did not register the pptpress_preview/)
    expect(() =>
      verifyInstalledDshTool({ ...applied, tools: [{ name: "pptpress_preview", execute: undefined }] }),
    ).toThrow(/missing required members: execute, output\.render, output\.presentationMeta/)
    expect(() => verifyInstalledDshRoute({ ...applied, routes: [] })).toThrow(
      /did not register a \/pptpress\/preview route/,
    )
    expect(() => verifyInstalledDshRoute({ ...applied, injected: [], routes: [] })).toThrow(/never asked for/)

    await expect(
      inspectInstalledDshPlugin({ dshHome, profile: "web", expectedVersion: "0.20.0" }),
    ).rejects.toThrow(/has @liustack\/pptpress@0\.19\.2, expected 0\.20\.0/)
  })

  it("requires the composed DSH config to mount the installed pptpress bundle", () => {
    const dump = [
      "# == @liustack/modsearch",
      "- id: modsearch",
      "  name: '@liustack/modsearch'",
      "# == @liustack/pptpress",
      "- id: pptpress",
      "  name: '@liustack/pptpress'",
    ].join("\n")

    expect(() => assertPptpressMountedInDshConfig(dump)).not.toThrow()
    expect(() => assertPptpressMountedInDshConfig(dump.replace("id: pptpress", "id: disabled"))).toThrow(
      /does not mount/,
    )
  })

  it("boots DSH config inspection from the canonical workspace", () => {
    expect(buildDshDumpConfigInvocation("/private/tmp/pptpress-dsh-e2e", "web")).toEqual({
      command: "npx",
      args: ["-y", "@deepseek-ai/dsh", "--profile", "web", "--dump-config"],
      cwd: "/private/tmp/pptpress-dsh-e2e",
    })
  })
})
