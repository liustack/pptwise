/**
 * `PPTWISE_*` environment variables, with `PPTPRESS_*` and `PPTFAST_*` as
 * per-process aliases. The new name wins, then pptpress, then pptfast.
 * Empty string counts as unset. When an old name actually supplies the
 * value, one stderr warning per key per process.
 *
 * Never abbreviate the product to PPTP or PPTW.
 */

export const PRODUCT_ENV_PREFIX = "PPTWISE_"
export const LEGACY_ENV_PREFIXES = ["PPTPRESS_", "PPTFAST_"] as const

const warnedLegacyKeys = new Set<string>()

/** Test-only: clear the per-process "warned once" set. */
export function resetProductEnvWarningsForTests(): void {
  warnedLegacyKeys.clear()
}

export function productEnvName(suffix: string): string {
  return `${PRODUCT_ENV_PREFIX}${suffix}`
}

export function legacyEnvNames(suffix: string): string[] {
  return LEGACY_ENV_PREFIXES.map((prefix) => `${prefix}${suffix}`)
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
 * Look up `PPTWISE_<suffix>`, then `PPTPRESS_<suffix>`, then `PPTFAST_<suffix>`.
 * Consults the **passed** `env` object (tests pass a fake env).
 */
export function resolveProductEnv(suffix: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const currentKey = productEnvName(suffix)
  const current = nonempty(env[currentKey])
  if (current !== undefined) return current
  for (const legacyKey of legacyEnvNames(suffix)) {
    const legacy = nonempty(env[legacyKey])
    if (legacy !== undefined) {
      warnLegacy(legacyKey, currentKey)
      return legacy
    }
  }
  return undefined
}
