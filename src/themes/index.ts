import { PptwiseError } from "../errors";
import type { StyleTokens } from "./tokens";
import { REGISTERED_THEMES } from "./registered-themes";
import { retiredThemeHint } from "./retired-ids";
import { CONSULTING_THEME } from "./builtin/brief";
import { ENTERPRISE_THEME } from "./builtin/bulletin";
import { ACADEMIC_THEME } from "./builtin/thesis";
import { INSIGHT_THEME } from "./builtin/ledger";
import { CAMPAIGN_THEME } from "./builtin/rally";
import { CLASSROOM_THEME } from "./builtin/homeroom";
import { INK_THEME } from "./builtin/ink";
import { TECH_THEME } from "./builtin/terminal";
import { RUNWAY_THEME } from "./builtin/runway";
import { JOURNAL_THEME } from "./builtin/journal";
import { LUXE_THEME } from "./builtin/luxe";
import { PULSE_THEME } from "./builtin/clinic";
import { TERRA_THEME } from "./builtin/almanac";
import { EMBER_THEME } from "./builtin/ember";
import { VERMILION_THEME } from "./builtin/vermilion";
import { CRAYON_THEME } from "./builtin/crayon";
import { MUSEUM_THEME } from "./builtin/museum";
import { STAGE_THEME } from "./builtin/stage";
import { LECTURE_THEME } from "./builtin/lecture";
import { SWISS_THEME } from "./builtin/swiss";
import { MEMO_THEME } from "./builtin/memo";
import { PROPOSAL_THEME } from "./builtin/proposal";
import type { BuiltinThemeDeclaration } from "./schema";

/**
 * The 22 canonical theme ids, registered/renderable（产品口径 22 套主题、
 * 22 个 id）。命名规矩：id、label、story.name 一律命名腔调或体裁，
 * 不命名行业、职能、受众或组织类型（见 `design-story.ts`；九个场景名
 * 已在改名批次里一次性换掉，旧 id 直接硬错并报出新名，见
 * `retired-ids.ts`）（brief Brief / bulletin Bulletin /
 * thesis Thesis / ledger Ledger / rally Rally /
 * homeroom Homeroom / ink Ink Wash / terminal Terminal /
 * runway Runway / journal Editorial Journal / luxe Luxe /
 * clinic Clinic——themes-16 wave task T1
 * 新增第 14 个 / almanac Almanac——themes-16 wave task T2 新增
 * 第 15 个 / ember Ember——themes-16 wave task T3 新增第 16 个 /
 * vermilion Official Report——gov-theme wave 新增第 17 个，庄重公务汇报语域，
 * 第一个从立项即以中文语域为主的主题 / crayon Crayon——低龄教育
 * 蜡笔卡纸 /
 * museum Museum——博物·棕黑厅堂衬线铜金，2026-08-21 鹦鹉站气质立项 /
 * stage Keynote Stage——黑场·冷玄黑无框发布会演讲，2026-08-21 huashu 风格库
 * Top 5 第 3 / lecture Lecture Hall——黑板夜校，2026-08-21
 * 大学/成人课程夜校板 / swiss Swiss Institutional——冷白制度，机构年报 / 政策汇报 /
 * 审计交付，2026-08-21 wave7 / memo Decision Memo——打字机决定，备忘录 /
 * proposal Proposal——递到客户管理层手里的提案书）。
 * 2026-10 合并退役三家：arena、playbill 并入 rally，heritage 并入 luxe。
 * 旧 id 不在本表，validate 与查名把它读成并入的主题并给警告，见
 * `retired-ids.ts` 的 `FOLDED_THEME_IDS`。resolveThemeId 本身对未知 id
 * 一律硬错。
 */
export const CANONICAL_THEME_IDS = [
  "brief",
  "bulletin",
  "thesis",
  "ledger",
  "rally",
  "homeroom",
  "ink",
  "terminal",
  "runway",
  "journal",
  "luxe",
  "clinic",
  "almanac",
  "ember",
  "vermilion",
  "crayon",
  "museum",
  "stage",
  "lecture",
  "swiss",
  "memo",
  "proposal",
] as const;

export type CanonicalThemeId = (typeof CANONICAL_THEME_IDS)[number];

/** Canonical declaration source shared by built-in registration and style lookup. */
export const BUILTIN_THEME_FILES = {
  brief: CONSULTING_THEME,
  bulletin: ENTERPRISE_THEME,
  thesis: ACADEMIC_THEME,
  ledger: INSIGHT_THEME,
  rally: CAMPAIGN_THEME,
  homeroom: CLASSROOM_THEME,
  ink: INK_THEME,
  terminal: TECH_THEME,
  runway: RUNWAY_THEME,
  journal: JOURNAL_THEME,
  luxe: LUXE_THEME,
  clinic: PULSE_THEME,
  almanac: TERRA_THEME,
  ember: EMBER_THEME,
  vermilion: VERMILION_THEME,
  crayon: CRAYON_THEME,
  museum: MUSEUM_THEME,
  stage: STAGE_THEME,
  lecture: LECTURE_THEME,
  swiss: SWISS_THEME,
  memo: MEMO_THEME,
  proposal: PROPOSAL_THEME,
} satisfies Record<CanonicalThemeId, BuiltinThemeDeclaration>;

/** 场景 id → 英文场景名（plan 卡片徽章等对用户展示处用，接口统一英文）。 */
export const THEME_LABELS = Object.fromEntries(
  CANONICAL_THEME_IDS.map((id) => [id, BUILTIN_THEME_FILES[id].label]),
) as Record<CanonicalThemeId, string>;

/**
 * Narrow a theme id to a canonical built-in id. An unknown id is an error,
 * never a silent fallback: a deck that names a theme nobody installed must
 * say so out loud rather than quietly render as some other theme.
 */
export function resolveThemeId(id: string): CanonicalThemeId {
  if (!(CANONICAL_THEME_IDS as readonly string[]).includes(id)) {
    throw new PptwiseError(
      `unknown theme "${id}"${retiredThemeHint(id)}. Installed built-in themes: ${CANONICAL_THEME_IDS.join(", ")}`,
    );
  }
  return id as CanonicalThemeId;
}

export const THEME_STYLES = Object.fromEntries(
  CANONICAL_THEME_IDS.map((id) => [id, BUILTIN_THEME_FILES[id].style]),
) as Record<CanonicalThemeId, StyleTokens>;

/**
 * Resolve a theme's style tokens by id: an SDK-registered theme's own tokens
 * (see `themes/definitions.ts`'s `registerTheme`) win over the builtin
 * fallback — same "registered lookup first, then builtin via resolveThemeId"
 * precedence as that module's `getThemeDefinition` (see
 * `registered-themes.ts`'s docstring for why this function reads that shared
 * map directly instead of calling `getThemeDefinition` itself).
 *
 * The render chain never calls this: it reads `theme.style` off the
 * definition it was handed, which entry points resolve once through
 * `resolve-ir-theme.ts`. This stays for callers that only hold an id
 * (tests, tooling). Recolor by compiling a complete theme file, not by
 * passing a partial overlay.
 */
export function resolveStyle(id: string): StyleTokens {
  return REGISTERED_THEMES.get(id)?.style ?? THEME_STYLES[resolveThemeId(id)];
}

export type {
  StyleTokens,
  StyleColors,
  StyleFonts,
  LayoutType,
} from "./tokens";
