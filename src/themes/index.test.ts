import { describe, it, expect } from "vitest";
import { resolveStyle, CANONICAL_THEME_IDS } from "./index";

describe("resolveStyle", () => {
  it("返回 6 套主题的完整 token 包", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const theme = resolveStyle(id);
      expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
      expect(theme.fonts.heading.length).toBeGreaterThan(0);
      expect(theme.defaultBackgrounds.cover).toBeDefined();
      expect(theme.defaultBackgrounds.chapter).toBeDefined();
      expect(theme.defaultBackgrounds.content).toBeDefined();
      expect(theme.defaultBackgrounds.ending).toBeDefined();
    }
  });

  // 2026-08-19 深底组皮肤重设计：insight 从「深底红金」换成「暖黑终端底 +
  // 终端琥珀」。primary 不再是抢眼的正红，而是让位给 accent 的墨蓝色块底
  // （设计稿的角色定义，见 themes/insight.ts 的改动来历）。
  it("insight 主题用 #16202B 墨蓝色块底和 #F0A63C 终端琥珀", () => {
    const t = resolveStyle("insight");
    expect(t.colors.primary).toBe("#16202B");
    expect(t.colors.accent).toBe("#F0A63C");
  });

  // 零兼容裁定：未知 id 不再静默回落 consulting，直接报错并列出已装主题。
  it("未知 id 硬错，不回落", () => {
    expect(() => resolveStyle("nonexistent-theme")).toThrow(/unknown theme "nonexistent-theme"/);
  });
});
