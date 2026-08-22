/**
 * `PPTPRESS_*` environment variables, with `PPTFAST_*` as a per-process alias.
 * The new name wins. Empty string counts as unset. When the old name actually
 * supplies the value, one stderr warning per key per process.
 *
 * Never abbreviate the product to PPTP.
 */

export const PRODUCT_ENV_PREFIX = "PPTPRESS_"
export const LEGACY_ENV_PREFIX = "PPTFAST_"

const warnedLegacyKeys = new Set<string>()

/** Test-only: clear the per-process "warned once" set. */
export function resetProductEnvWarningsForTests(): void {
  warnedLegacyKeys.clear()
}

export function productEnvName(suffix: string): string {
  return `${PRODUCT_ENV_PREFIX}${suffix}`
}

export function legacyEnvName(suffix: string): string {
  return `${LEGACY_ENV_PREFIX}${suffix}`
}

function nonempty(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value
}

function warnLegacy(legacyKey: string, currentKey: string): void {
  if (warnedLegacyKeys.has(legacyKey)) return
  warnedLegacyKeys.add(legacyKey)
  process.stderr.write(`${legacyKey} is deprecated. Use ${currentKey} instead.\n`)
}

/**
 * Look up `PPTPRESS_<suffix>`, falling back to `PPTFAST_<suffix>`.
 * Consults the **passed** `env` object (tests pass a fake env).
 */
export function resolveProductEnv(suffix: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const currentKey = productEnvName(suffix)
  const legacyKey = legacyEnvName(suffix)
  const current = nonempty(env[currentKey])
  if (current !== undefined) return current
  const legacy = nonempty(env[legacyKey])
  if (legacy !== undefined) {
    warnLegacy(legacyKey, currentKey)
    return legacy
  }
  return undefined
}
