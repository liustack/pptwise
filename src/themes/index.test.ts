import { describe, it, expect } from "vitest";
import { resolveStyle, CANONICAL_THEME_IDS, THEME_STYLES } from "./index";

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

  // 2026-08-19 深底组皮肤重设计：ledger 从「深底红金」换成「暖黑终端底 +
  // 终端琥珀」。primary 不再是抢眼的正红，而是让位给 accent 的墨蓝色块底
  // （设计稿的角色定义，见 themes/ledger.ts 的改动来历）。
  it("ledger 主题用 #16202B 墨蓝色块底和 #F0A63C 终端琥珀", () => {
    const t = resolveStyle("ledger");
    expect(t.colors.primary).toBe("#16202B");
    expect(t.colors.accent).toBe("#F0A63C");
  });

  // 零兼容裁定：未知 id 不再静默回落 brief，直接报错并列出已装主题。
  it("未知 id 硬错，不回落", () => {
    expect(() => resolveStyle("nonexistent-theme")).toThrow(/unknown theme "nonexistent-theme"/);
  });
});

describe("THEME_STYLES", () => {
  it("has bulletin (ex-custom/gallery/avant), not retired ids", () => {
    expect(THEME_STYLES["bulletin"]).toBeTruthy();
    expect((THEME_STYLES as Record<string, unknown>)["stripe-purple"]).toBeUndefined();
    // 无 legacy id 兜底：这些旧 id 均非 canonical，不在 THEME_STYLES 里注册
    expect((THEME_STYLES as Record<string, unknown>)["custom"]).toBeUndefined();
    expect((THEME_STYLES as Record<string, unknown>)["gallery"]).toBeUndefined();
    expect((THEME_STYLES as Record<string, unknown>)["avant"]).toBeUndefined();
  });

  // 冷调组皮肤重设计（2026-08-20）：白墙从纯白压到 #F7F7F4（纯白让给
  // surface），accent 从 IKB 本色换回炸橘（设计板给了它「只给方块与强调线」
  // 的岗位，推翻 2026-07-10 的单色系裁决）。第四轮评审两刀收口：图表四色
  // 的炸橘换成工业蓝（IKB/工业蓝/工业青/机灰），accent 的炸橘也换成同一枚
  // 工业蓝（用户 p09/p10：「不要蓝配橙，超级丑」）——本主题从此不出现暖色，
  // 仅剩语义色 warning 一枚深琥珀。来历逐条见 `themes/bulletin.ts` 文件头。
  it("bulletin defaults to gallery-white bg + IKB primary + industrial-blue accent + an all-cool chart palette", () => {
    expect(THEME_STYLES["bulletin"].colors.bg).toBe("#F7F7F4");
    expect(THEME_STYLES["bulletin"].colors.surface).toBe("#FFFFFF");
    expect(THEME_STYLES["bulletin"].colors.primary).toBe("#0032A0");
    expect(THEME_STYLES["bulletin"].colors.accent).toBe("#2F6FBF");
    expect(THEME_STYLES["bulletin"].colors.chartPalette).toEqual(["#0032A0", "#2F6FBF", "#0E7C86", "#7A7F87"]);
    expect(THEME_STYLES["bulletin"].defaultBackgrounds.cover).toEqual({
      kind: "color",
      value: "#F7F7F4",
    });
  });
});
