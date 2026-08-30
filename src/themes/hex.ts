import { z } from "zod"

function normalizeHexToken(value: string): string {
  const body = value.slice(1)
  const expanded = body.length === 3 || body.length === 4
    ? [...body].map((channel) => channel.repeat(2)).join("")
    : body
  return `#${expanded.slice(0, 6).toUpperCase()}`
}

/** Public theme and IR colors share one opaque RGB entry boundary. */
export const HexTokenSchema = z
  .string()
  .regex(/^#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, "expected #RGB, #RGBA, #RRGGBB, or #RRGGBBAA")
  .overwrite(normalizeHexToken)
