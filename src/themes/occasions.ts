import type { BUILTIN_THEME_IDS } from "../ir"

type BuiltinThemeId = (typeof BUILTIN_THEME_IDS)[number]

/**
 * Identity strength band for a theme's visual voice. `low` is a quiet
 * institutional register. `medium` is a professional house style.
 * `high` is a strong, costume-grade expression.
 */
export const IDENTITY_STRENGTHS = ["low", "medium", "high"] as const
export type IdentityStrength = (typeof IDENTITY_STRENGTHS)[number]

/**
 * Controlled occasion vocabulary. Theme metadata and `suggestThemes`
 * both key off this list. Unknown words are ignored at selection time.
 * Each gloss is one English line naming the decks that word is for.
 */
export const OCCASION_VOCAB = {
  business: "Corporate proposals, consulting reports, and general commercial decks.",
  institutional: "Quiet org voice: annual reports, policy briefings, audits, and memos.",
  finance: "Markets, terminals, and financial insight.",
  marketing: "Campaigns, brand launches, and promotional storytelling.",
  education: "Teaching, training, lectures, and research communication.",
  culture: "Heritage, tradition, the arts, and cultural programming.",
  tech: "Product, engineering, and deep-tech decks.",
  health: "Clinical, hospital, and life-science communication.",
  sustainability: "ESG, climate, and long-horizon stewardship reports.",
  startup: "Fundraising pitches and early-stage company stories.",
  government: "Official reports, work summaries, and civic briefings.",
  kids: "Early-years and family-facing education.",
  entertainment: "Esports, live shows, and fan-facing events.",
  museum: "Galleries, exhibitions, and interpretive programs.",
  keynote: "On-stage product reveals and keynote talks.",
  fashion: "Runway, lookbooks, and fashion-house voice.",
  editorial: "Journals, features, and long-form editorial reviews.",
  luxury: "Maison, beauty, and invitation-grade hospitality.",
  event: "Short-run announcements, recitals, and convenings.",
} as const

export type Occasion = keyof typeof OCCASION_VOCAB

export interface ThemeOccasionRecord {
  readonly occasions: readonly Occasion[]
  readonly identity: IdentityStrength
}

/**
 * Per-builtin occasion tags (1-4 vocab words) and identity band.
 * This table is the authority for theme reachability. Narrative
 * `themeRecommendations` is a reference signal only.
 */
export const THEME_OCCASIONS: Record<BuiltinThemeId, ThemeOccasionRecord> = {
  // 先结论报告腔，咨询件专业表达，不是机构隐身档
  brief: { occasions: ["business"], identity: "medium" },
  // 企业蓝白墙，机构低调档（任务书点名）
  bulletin: { occasions: ["business", "institutional"], identity: "low" },
  // 书卷学术研究，专业表达但不扮戏
  thesis: { occasions: ["education"], identity: "medium" },
  // 行情屏财经洞察，专业表达（任务书点名 medium）
  ledger: { occasions: ["finance"], identity: "medium" },
  // 幕布深紫营销剧场，荧光主音，强表达
  rally: { occasions: ["marketing", "event"], identity: "high" },
  // 讲义雾蓝，亲和教与学，不是蜡笔戏服
  homeroom: { occasions: ["education"], identity: "medium" },
  // 水墨国风，任务书点名强表达
  ink: { occasions: ["culture"], identity: "high" },
  // 深空工程专业科技件，有声但不是发布会戏服
  terminal: { occasions: ["tech"], identity: "medium" },
  // 时尚秀场，任务书点名强表达
  runway: { occasions: ["fashion"], identity: "high" },
  // 人文期刊铅字编辑腔，有声但不扮戏
  journal: { occasions: ["editorial"], identity: "medium" },
  // 请柬烫金奢侈品戏服，年会盛典也走这里
  luxe: { occasions: ["luxury", "event"], identity: "high" },
  // 藏书票轻奢传承，比 luxe 克制
  heritage: { occasions: ["culture", "luxury"], identity: "medium" },
  // 清洁诊疗生命科学，可信专业件
  clinic: { occasions: ["health"], identity: "medium" },
  // ESG 田野纸，朴素长期主义
  almanac: { occasions: ["sustainability"], identity: "medium" },
  // 炭黑火橙路演舞台，强表达
  ember: { occasions: ["startup"], identity: "high" },
  // 公文汇报机构低调档（任务书点名 low）
  vermilion: { occasions: ["government", "institutional"], identity: "low" },
  // 蜡笔卡纸低龄教育，任务书点名强表达
  crayon: { occasions: ["kids", "education"], identity: "high" },
  // 电竞紫黑场馆，任务书点名强表达
  arena: { occasions: ["entertainment"], identity: "high" },
  // 博物厅堂，任务书点名强表达
  museum: { occasions: ["museum", "culture"], identity: "high" },
  // 黑场发布会，任务书点名强表达
  stage: { occasions: ["keynote"], identity: "high" },
  // 黑板夜校是场景戏服，与 homeroom 讲义纸分昼夜
  lecture: { occasions: ["education"], identity: "high" },
  // 冷白制度年报，任务书点名机构低调档
  swiss: { occasions: ["institutional"], identity: "low" },
  // 打字机决定备忘录，任务书点名机构低调档
  memo: { occasions: ["business", "institutional"], identity: "low" },
  // 荧光嗓门活动宣发，任务书点名强表达
  playbill: { occasions: ["event", "entertainment"], identity: "high" },
}
