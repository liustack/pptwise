import { describe, expect, it } from "vitest"
import { contrastRatio } from "../svg/ink"
import { resolveStyle } from "./index"

const DANGER_TEXT_HEADROOM = 4.8

describe.each(["insight", "lecture", "luxe"] as const)(
  "%s semantic ink duties",
  (themeId) => {
    it("keeps the 20px KPI danger arrow above the requested contrast headroom", () => {
      const { colors } = resolveStyle(themeId)
      expect(contrastRatio(colors.danger!, colors.surface)).toBeGreaterThanOrEqual(
        DANGER_TEXT_HEADROOM,
      )
    })
  },
)
