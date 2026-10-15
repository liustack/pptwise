// The `pptwise_images` DSH tool: a stock photo search whose result the model
// can look at.
//
// `pptwise images search --sheet` draws every hit's thumbnail into one
// numbered JPEG. In a terminal the model has to find a way to open that file.
// Here the tool hands it over as an image in its own result, the way DSH's
// `read_image` does: the picture is saved through the host's `attachments`
// service and rides an `image` content block next to the numbered list, so
// the model reads the numbers off the picture and fetches the id with that
// number. Verified against DSH 0.1.2-rc.1: `ToolOutputDefinition.render`
// returns `ContentBlock[]`, which includes `{ type: 'image', attachment }`,
// and the DeepSeek adapter sends a tool result's images to the model in the
// user message after it.
//
// The image goes in only when the host can carry it: an `attachments`
// service is mounted and the session's model declares image input. Otherwise
// the result names the sheet's path beside the same list, and nothing fails.
//
// Plain dependency-free JS like the rest of the plugin: the CLI does the
// search and draws the sheet, and this file only reads its report and file.

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { runCliJson, sessionCwd } from './preview-tool.js'

export const IMAGES_TOOL_NAME = 'pptwise_images'

const ORIENTATIONS = ['landscape', 'portrait', 'square']

const HIT_SCHEMA = {
  type: 'object',
  properties: {
    n: { type: 'number' },
    id: { type: 'string' },
    width: { type: 'number' },
    height: { type: 'number' },
    description: { type: 'string' },
    author: { type: 'string' },
    license: { type: 'string' },
    source: { type: 'string' },
  },
  required: ['n', 'id', 'width', 'height', 'author', 'license'],
  additionalProperties: false,
}

const IMAGE_SCHEMA = {
  type: 'object',
  properties: {
    attachmentId: { type: 'string' },
    mediaType: { type: 'string' },
    bytes: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    name: { type: 'string' },
  },
  required: ['attachmentId', 'mediaType', 'bytes', 'width', 'height'],
  additionalProperties: false,
}

/**
 * Whether this call's model takes images, read the way `read_image` reads it:
 * the session's routed provider and model, then the model's declared input.
 * Any part of that the host does not offer means no, never an error: the
 * search still answers in text.
 */
async function routeTakesImages(ctx, exec) {
  try {
    const agent = exec && exec.agent
    if (!agent) return false
    const header = typeof agent.session?.requestHeader === 'function' ? agent.session.requestHeader() : undefined
    const routed = header && header.config
    const provider = (routed && routed.provider) ?? agent.options?.provider
    const model = (routed && routed.model) ?? agent.options?.model
    const llm = typeof ctx.get === 'function' ? ctx.get('llm') : undefined
    if (provider === undefined || model === undefined || !llm || typeof llm.resolveModelInfo !== 'function') return false
    const info = await llm.resolveModelInfo(provider, model, exec.signal)
    return Array.isArray(info?.inputModalities) && info.inputModalities.includes('image')
  } catch {
    return false
  }
}

/** The sheet saved as a host attachment, or undefined where the host has no store for one. */
async function attachSheet(ctx, exec, sheetPath) {
  const attachments = typeof ctx.get === 'function' ? ctx.get('attachments') : undefined
  if (!attachments || typeof attachments.saveImage !== 'function') return undefined
  if (!(await routeTakesImages(ctx, exec))) return undefined
  const ref = await attachments.saveImage({ data: await readFile(sheetPath), mediaType: 'image/jpeg', name: basename(sheetPath) })
  return {
    attachmentId: String(ref.attachmentId),
    mediaType: String(ref.mediaType),
    bytes: Number(ref.bytes),
    width: Number(ref.width),
    height: Number(ref.height),
    ...(typeof ref.name === 'string' ? { name: ref.name } : {}),
  }
}

/** What the model reads: the numbered hits, the notes, and how to take one. */
export function imagesSummary(value) {
  if (value.hits.length === 0) return [`No photos found for "${value.query}".`, ...value.notes].join('\n')
  const lines = []
  if (value.image) lines.push(`Contact sheet below: ${value.hits.length} photos for "${value.query}", numbered as listed.`)
  else if (value.sheet) lines.push(`Contact sheet: ${value.sheet} (${value.hits.length} photos for "${value.query}", numbered as listed).`)
  for (const hit of value.hits) {
    const about = hit.description ? `  ${hit.description}` : ''
    lines.push(`${hit.n}. ${hit.id}  ${hit.width}x${hit.height}  ${hit.author}  ${hit.license}${about}`)
  }
  lines.push(...value.notes)
  lines.push('Pin the one you choose with `images fetch <id> --deck <deck-dir> --as <asset_id>`.')
  return lines.join('\n')
}

export function createImagesTool(cliPath, ctx) {
  return {
    name: IMAGES_TOOL_NAME,
    description:
      'Search free stock photos for one picture of a pptwise deck and look at the results: returns the hits numbered, ' +
      'with each one\'s size, description, author and license, and a contact sheet image of their thumbnails under the same numbers. ' +
      'Use a short concrete English query of two to four words. Then pin your pick with `images fetch <id>` in the terminal.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Two to four concrete English words, such as "wind farm". No mood or quality words.' },
        orientation: {
          type: 'string',
          enum: ORIENTATIONS,
          description: 'The frame the picture goes in, from `asset-brief`: landscape, portrait or square.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          hits: { type: 'array', items: HIT_SCHEMA },
          notes: { type: 'array', items: { type: 'string' } },
          sheet: { type: 'string' },
          image: IMAGE_SCHEMA,
        },
        required: ['query', 'hits', 'notes'],
        additionalProperties: false,
      },
      render(_args, value) {
        const blocks = [{ type: 'text', text: imagesSummary(value) }]
        if (value.image) blocks.push({ type: 'image', attachment: { ...value.image } })
        return blocks
      },
    },
    async execute(args, exec) {
      const query = String(args.query ?? '').trim()
      if (query === '') throw new Error('query is empty: pass two to four English words')
      const orientation = args.orientation === undefined ? [] : ['--orientation', String(args.orientation)]
      // The CLI runs in the session's project, so the sheet lands in its
      // `.pptwise/image-search/`, beside the deck it is for. A call with no
      // session folder runs where the host runs, as `pptwise_preview` does.
      const cwd = sessionCwd(exec)
      const report = await runCliJson(cliPath, ['images', 'search', query, ...orientation, '--sheet', '--json'], {
        signal: exec?.signal,
        ...(cwd !== undefined ? { cwd } : {}),
      })
      if (!report || !Array.isArray(report.hits) || !Array.isArray(report.notes)) {
        throw new Error('pptwise images search printed a report this plugin cannot read')
      }
      const hits = report.hits.map((hit) => ({
        n: Number(hit.n),
        id: String(hit.id),
        width: Number(hit.width),
        height: Number(hit.height),
        ...(typeof hit.description === 'string' ? { description: hit.description } : {}),
        author: String(hit.author),
        license: String(hit.license),
        ...(typeof hit.source === 'string' ? { source: hit.source } : {}),
      }))
      const sheet = typeof report.sheet === 'string' ? report.sheet : undefined
      const image = sheet ? await attachSheet(ctx, exec, sheet) : undefined
      return {
        query: String(report.query ?? query),
        hits,
        notes: report.notes.map(String),
        ...(sheet ? { sheet } : {}),
        ...(image ? { image } : {}),
      }
    },
    timeoutMs: 120_000,
  }
}
