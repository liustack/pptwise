import type { Component } from "@/ir"
import { NOTICE_KINDS_BOARD, NOTICE_KINDS_BOARD_EN, type NoticeBoardPage } from "@/layouts/compositions/__fixtures__/notice-kinds-board"
import type { Lexicon } from "./lexicon"

/*
 * The gallery pages for bulletin's statement, fact and evidence faces: one
 * page a composition (`src/layouts/compositions/`, the notice setting). Each
 * is a page of the deck drawn against the approved 2026-10 board
 * (`design/rounds/2026-10-09-bulletin-kinds/`), its figures from the bulletin
 * showcase, in Chinese for a Chinese lexicon and in English otherwise.
 */

interface NoticeBody {
  readonly heading: string
  readonly components: Component[]
  readonly footnote?: string
}

function body(page: NoticeBoardPage): NoticeBody {
  return { heading: page.heading, components: page.components, ...(page.footnote ? { footnote: page.footnote } : {}) }
}

const pick = (zh: string, en: string) => (lex: Lexicon): NoticeBody => body(lex.id === "zh" ? NOTICE_KINDS_BOARD[zh]! : NOTICE_KINDS_BOARD_EN[en]!)

/** The three compositions' own pages: the two-line sentence, the fall, the chart. */
export const NOTICE_BODIES = {
  sentence: pick("p02-share", "p01-target"),
  billboard: pick("p04-market", "p02-export"),
  proof: pick("p05-september", "p03-september"),
}

/** The evidence page's second form: a table with its highlighted row ringed. */
export const NOTICE_PROOF_TABLE = pick("p06-players", "p04-players")
