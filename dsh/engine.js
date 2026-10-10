// What the plugin says when its engine is not there.
//
// The engine is `dist/cli.js`, built at publish time and ignored by git. A
// plugin added from the GitHub address (DSH Desktop's Add plugin dialog takes
// one) installs the source without it: the skill registers, the tool appears,
// and every deck then fails on a missing file. The skill preamble and the
// preview tool both say this one message, so the model and the card tell the
// user the same thing: add it again by package name.
import { existsSync, readFileSync } from 'node:fs'

export const PACKAGE_NAME = '@liustack/pptwise'

/** This package's own version, which the reinstall line pins to. */
export function packageVersion() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
}

export function engineReady(cliPath) {
  return existsSync(cliPath)
}

export function missingEngineMessage(cliPath, version) {
  const spec = `${PACKAGE_NAME}@${version}`
  return [
    `This pptwise plugin was installed without its engine (${cliPath} is missing). That happens when it is added from the GitHub address: the source there does not carry the built engine.`,
    `Remove the plugin and add it again by package name, \`${spec}\`.`,
    `On DeepSeek Harness Desktop: open Plugins, remove pptwise, choose Add plugin, and enter \`${spec}\`.`,
    `In a terminal: \`npx -y @deepseek-ai/dsh plugin --profile web add ${spec}\`.`,
  ].join(' ')
}
