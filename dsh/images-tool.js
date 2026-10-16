// The `pptwise_images` DSH tool: a stock photo search whose result the model
// can look at.
//
// `pptwise images search --sheet` draws every hit's thumbnail into one
// numbered JPEG. In a terminal the model has to find a way to open that file.
// Here the tool hands it over as an image in its own result
// (`attachJpeg` in `./preview-tool.js`), so the model reads the numbers off the picture and
// fetches the id with that number. Where the host cannot carry the image, the
// result names the sheet's path beside the same list, and nothing fails.
//
// Plain dependency-free JS like the rest of the plugin: the CLI does the
// search and draws the sheet, and this file only reads its report and file.

import { attachJpeg, IMAGE_SCHEMA, runCliJson, sessionCwd } from './preview-tool.js'

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
      const { image, refused } = sheet ? await attachJpeg(ctx, exec, sheet) : {}
      const notes = report.notes.map(String)
      if (refused !== undefined) notes.push(`The contact sheet could not be attached here (${refused}). Open its file to look at it.`)
      return {
        query: String(report.query ?? query),
        hits,
        notes,
        ...(sheet ? { sheet } : {}),
        ...(image ? { image } : {}),
      }
    },
    timeoutMs: 120_000,
  }
}
