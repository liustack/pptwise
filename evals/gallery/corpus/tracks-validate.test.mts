// @vitest-environment node
//
// Every page of the gallery passes validate in every language track. The
// default gallery renders the Chinese track, so a corpus title that only an
// English face cannot hold went unseen: the left-anchor cover and the
// show-plate chapter of the English track were refused once validate
// started asking a boundary face how long a heading it sets.
import { beforeAll, describe, expect, it } from "vitest"
import { listThemes, validateIr } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { buildMatrix } from "../matrix"
import { corpusAssets, type CorpusAssets } from "./decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./lexicon"

const assets = {} as Record<LanguageId, CorpusAssets>

beforeAll(async () => {
  await installNodePlatform()
  for (const id of LANGUAGE_IDS) assets[id] = await corpusAssets(LEXICONS[id])
})

describe("the gallery corpus passes validate in every language track", () => {
  for (const track of LANGUAGE_IDS) {
    it(track, () => {
      const themeIds = listThemes()
        .map((t) => t.id)
        .sort()
      const refused = new Map<string, string>()
      const seen = new Set<unknown>()
      for (const job of buildMatrix(themeIds, assets, { languages: [track], themeLanguage: track })) {
        if (seen.has(job.ir)) continue
        seen.add(job.ir)
        const v = validateIr(job.ir)
        if (!v.ok) refused.set(job.id, v.errors.map((e) => `${e.path}: ${e.message}`).join("; "))
      }
      expect(Object.fromEntries(refused)).toEqual({})
    })
  }
})
