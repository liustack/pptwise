import type { DecorProps } from "./types"

/**
 * heritage-motif v4 —— 藏书票纹饰退役（第八波批 2，演化）。
 *
 * 板上中景不再是顶缘双线、藏书票章、底缘中点金菱。金菱是孤立小件，用户
 * 否决。封面双框（外 border 内 accent）归 `double-frame-cover` 版式，章节
 * 对杠夹一点归 `mirror-volume-chapter`，ending 短线归 `invite-field-ending`。
 * 本 motif 四种页型一律 `return null`，不重画角花、不重画章、不重画金菱。
 *
 * 纪律：零 theme id、零 hex。本 motif 仍是 heritage 独占的单成员候选集
 * （`motif-selection.ts` 的 `MOTIF_CANDIDATES`）。
 */
export function HeritageMotif(_props: DecorProps) {
  return null
}
