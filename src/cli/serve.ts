/**
 * `pptwise serve <target>` (serve wave, task S1, spec-plan.md
 * `.issues/2026-07-25-serve/spec-plan.md`): a live-reloading HTTP preview of
 * the exact same `preview.html` bundle `pptwise preview --html` writes to
 * disk (`buildDeckPreview`, `./commands.ts`) — this module never builds its
 * own HTML, only serves and refreshes what that shared pipeline produces
 * (design ruling 5: "buildPreviewHtml 复用现状 ... 禁止 fork 一份 preview 构建
 * 逻辑").
 *
 * Two layers:
 * - {@link createServeServer}: the testable factory — a plain `node:http`
 *   server (design ruling 1: zero new dependencies, no express/ws/chokidar)
 *   bound hard to `127.0.0.1` (design ruling 6: no remote bind, no auth — a
 *   local dev tool), an `fs.watch`-based rebuild loop, and an SSE channel for
 *   push (design ruling 2: v1 is a whole-page `location.reload()` over SSE,
 *   no partial DOM patching). No process-level side effects (no `SIGINT`
 *   handler, no browser launch) — a caller (tests, or {@link runServe} below)
 *   owns that, which is what keeps this factory usable outside the CLI.
 * - {@link runServe}: the CLI-facing wrapper — prints the URL, opens a
 *   browser unless `--no-open`, wires `SIGINT` to a clean shutdown.
 *
 * Routes: `GET /` returns the in-memory cached HTML — after {@link injectServeClient}
 * has spliced this module's own `<script>` into it (task S2; see that
 * function's own doc comment) — rebuilt on change, never per-request (a
 * request never blocks on a render). `GET /events` is the SSE stream: a
 * `retry:` hint on connect, a `: heartbeat` comment frame every 30s (keeps
 * the connection alive through an idle-timeout proxy — pure SSE comment
 * syntax, invisible to `EventSource`), an `event: reload` frame after every
 * successful rebuild, an `event: error` frame with a JSON `{revision,
 * message}` body after a failed one. `GET /status` is the JSON
 * {@link ServeBuildStatus} snapshot of the build state. Everything else 404s.
 *
 * This server is read-only. It carried a `POST /revision-request` endpoint
 * until 2026-08-16, which took the preview annotation panel's export and
 * wrote it into the deck directory; the panel went first, leaving the
 * endpoint with no producer, and the pair was removed together. A reviewer
 * who wants something changed says so in the conversation — a screenshot
 * reaches the agent faster than a panel whose output has to be exported and
 * routed back — and the agent edits `pages/*.json` through the same gate as
 * every other change.
 *
 * Watch roots (design ruling 3) come straight from {@link buildDeckPreview}'s
 * own `resolvedTarget`/`isDir` — the exact path `loadDeckTarget`
 * (`./commands.ts`) already resolved `target` to — rather than this module
 * re-deriving the bare-name/`decksDir` resolution a second time: a deck
 * project directory cares about `deck.spec.json` + `pages/` + `assets/` +
 * `theme.json`; a bare IR target cares about that one file. Both also care
 * about where the bound theme's name resolves to, and that is covered two
 * ways. Inside the project root (the directory holding `pptwise.config.json`,
 * or `cwd` without one), every place the name could resolve to a file
 * (`themeCandidates`, `./theme-resolve.ts`: the deck directory's own
 * `theme.json` / `<name>.theme.json` / `<name>.json`, then `themes/` in each
 * directory from `cwd` up to the root, existing or not; see
 * {@link themeWatchRoots}) is watched, so a theme file that lands there
 * refreshes the preview the moment it lands. That list is recomputed after
 * every build from the theme the spec binds *now*, so rebinding the spec to
 * another name follows along. Everything else about the theme source is the
 * resolver's own business: every {@link THEME_POLL_MS} the bound name is
 * resolved again, the way a build would resolve it, and the answer (which
 * built-in, or a digest of the theme file's content, or which error) is
 * compared with the theme the last build was actually drawn with. A
 * different answer is a rebuild. That one comparison covers a `themes/`
 * appearing, disappearing, being moved away whole, or being replaced by a
 * plain file anywhere on the lookup chain, including above the project
 * root where no watcher can sit without listening to `/Users` or the like.
 * It also covers a theme file rewritten with its timestamp and size kept
 * (a restore, a save that preserves mtime, a symlink pointed elsewhere),
 * because what is compared is the content, never the file's metadata. There
 * is no hand-over between the two mechanisms: the watcher only makes the
 * project-local case fast, and the comparison is always the last word.
 * None of the watched paths is ever handed to `fs.watch` directly, though.
 * Every `fs.watch` here is on a *directory*, with the callback filtering by
 * entry name ({@link watchTree}): a watcher on a file is bound to that
 * file's inode,
 * and an editor that saves by writing a temp file and renaming it over the
 * target replaces the inode on every save — the watcher fires once, for the
 * unlink of what it was watching, then sits on a dead inode while later
 * saves go by unseen. A directory keeps its inode across all of that, and
 * reports each swap under the entry's name. The same tree re-attaches a
 * directory watcher when the directory itself appears, disappears, or is
 * replaced mid-session (`assets/` materializing with the first local image
 * is the common case), so nothing here is fixed at startup. Multiple events
 * for a single logical save (temp file + rename, or a "save all" over
 * several page files) are coalesced by a 200ms debounce into one rebuild,
 * and rebuilds run one at a time in order, so the HTML in cache always
 * reflects the newest build, never a slower older one finishing last.
 *
 * Resilience (design ruling 3's other half): a rebuild that throws — a
 * mid-edit malformed JSON save is the common case — never crashes the server
 * or throws out of the watch handler. It's caught, turned into an `error` SSE
 * event, and the previous good `html` stays cached and keeps serving `GET /`
 * until a later rebuild succeeds. That stale page is never passed off as
 * current, though: every build attempt gets a revision number, and both
 * `GET /` (via `X-Pptwise-*` headers) and `GET /status` (JSON,
 * {@link ServeBuildStatus}) say which revision the HTML came from and whether
 * the latest attempt failed. Only the *first* build (at `createServeServer`
 * call time, before the server starts listening) is allowed to reject the
 * whole call — same "throw `PptwiseError` → CLI exit 1" contract every other
 * `run*` command already has (`./commands.ts`), since there is no
 * previous-good HTML yet to fall back to.
 */
import { createHash } from "node:crypto"
import { type FSWatcher, statSync, watch } from "node:fs"
import { readFile } from "node:fs/promises"
import { createServer, type Server, type ServerResponse } from "node:http"
import { platform as osPlatform } from "node:os"
import { basename, dirname, join, resolve, sep } from "node:path"
import { THEME_ID_PATTERN } from "@/ir"
import { PptwiseError } from "../errors"
import { spawnHidden } from "./child"
import { buildDeckPreview } from "./commands"
import { findConfig } from "./config"
import { ASSETS_DIRNAME, PAGES_DIRNAME, SPEC_FILENAME, THEME_FILENAME } from "./deck-dir"
import {
  type ResolvedTheme,
  resolveThemeByName,
  sortKeysDeep,
  themeCandidates,
  themeNameFromUnknown,
} from "./theme-resolve"
import { resolveWorkspaceLocation } from "./workspace"

/** `pptwise serve`'s own default (spec-plan.md §2's worked example,
 *  `pptwise serve <target> [--port 4400] [--no-open]`) — never
 *  auto-incremented on conflict (design ruling 7: "不自动递增——agent 要可
 *  预测的 URL"), so a busy port is a hard error naming `--port` as the way
 *  out, never a silent fallback to some other port the caller didn't ask
 *  for. */
export const DEFAULT_PORT = 4400

const DEBOUNCE_MS = 200
const HEARTBEAT_MS = 30_000
/** How often the bound theme name is resolved again and the answer compared
 *  with the one the last build recorded — see this module's own doc comment
 *  and {@link createServeServer}. */
export const THEME_POLL_MS = 2_000


export interface ServeOptions {
  /** Same target shape every deck-accepting command accepts: an IR JSON
   *  file, a deck project directory, or a bare name under
   *  `~/.pptwise/decks` (`buildDeckPreview`/`loadDeckTarget`, `./commands.ts`). */
  target: string
  /** Default {@link DEFAULT_PORT}. `0` binds an OS-assigned ephemeral port
   *  (tests only — `pptwise serve` itself always resolves a fixed port, see
   *  {@link DEFAULT_PORT}'s own doc comment on why this command never
   *  auto-increments). */
  port?: number
  cwd?: string
}

export interface ServeHandle {
  server: Server
  /** Re-run the build pipeline immediately and push the result over SSE
   *  (`reload` on success, `error` on failure) — never throws, same
   *  catch-and-broadcast contract the `fs.watch` path uses internally.
   *  Exposed so a caller (or a test) can force a synchronous rebuild without
   *  waiting on the 200ms debounce. */
  rebuild: () => Promise<void>
  /** The same snapshot `GET /status` serves — see {@link ServeBuildStatus}. */
  status: () => ServeBuildStatus
  /** Stops watching, closes every open SSE connection, and closes the HTTP
   *  server. Safe to call more than once. */
  close: () => Promise<void>
  /** `http://127.0.0.1:<port>` — the actual bound port, resolved even when
   *  `options.port` was `0`. */
  url: string
  port: number
}

/**
 * What `GET /status` reports and what `GET /`'s `X-Pptwise-Build-Status`,
 * `X-Pptwise-Served-Revision`, and `X-Pptwise-Latest-Revision` headers
 * carry. A revision is one build attempt: the initial build is 1 and every
 * rebuild — watcher-triggered or via {@link ServeHandle.rebuild} — takes the
 * next number whether it succeeds or not. `servedRevision` is the build the
 * cached HTML came from; when it trails `latestRevision`, the page a client
 * sees is the last good one, not the current source.
 */
export interface ServeBuildStatus {
  latestRevision: number
  servedRevision: number
  latestOk: boolean
  /** The latest attempt's failure message. Absent when it succeeded. */
  error?: string
}

/** One thing `createServeServer` wants to hear about: a single file, or
 *  every entry of a directory. Either kind may not exist yet — see
 *  {@link watchTree}. */
export interface WatchRoot {
  path: string
  kind: "file" | "dir"
}

/** The paths `createServeServer` cares about for `target`, given
 *  `buildDeckPreview`'s own `resolvedTarget`/`isDir` for it — see this
 *  module's own doc comment for why these (deck-dir mode) or this one
 *  (bare-IR mode) are the whole watch surface. Deck-dir mode also lists
 *  `theme.json`. Callers pass the workspace assets directory and the bound
 *  theme's candidate files ({@link themeWatchRoots}) via `extra`. */
export function watchRoots(resolvedTarget: string, isDir: boolean, extra: WatchRoot[] = []): WatchRoot[] {
  const roots: WatchRoot[] = isDir
    ? [
        { path: join(resolvedTarget, SPEC_FILENAME), kind: "file" },
        { path: join(resolvedTarget, PAGES_DIRNAME), kind: "dir" },
        { path: join(resolvedTarget, ASSETS_DIRNAME), kind: "dir" },
        { path: join(resolvedTarget, THEME_FILENAME), kind: "file" },
      ]
    : [{ path: resolvedTarget, kind: "file" }]
  return [...roots, ...extra]
}

/**
 * The files the bound theme's name could resolve to inside the project
 * root, as `file` roots for {@link watchTree}: the head of the list
 * `resolveThemeByName` walks (`themeCandidates`, `./theme-resolve.ts`), so a
 * theme file created at one of those places after startup shadows the
 * built-in and refreshes the preview on the event. Most of them do not
 * exist, and the tree hangs each one off its nearest existing ancestor
 * until the directory appears. That chain is only followed up to
 * `ceilingDir` (the project root, or `startDir` without a project). The
 * lookup itself walks to the filesystem root, but hanging a watcher off
 * `/`, `/Users`, or the temp root is a firehose on macOS, where the
 * FSEvents backend is recursive and every event on the volume is delivered
 * before the name filter runs. Nothing above the ceiling is watched, whether
 * it exists or not: `createServeServer`'s timed re-resolution of the name
 * covers every change up there. A name the resolver would refuse (bad
 * shape) has no files to watch.
 */
export function themeWatchRoots(
  themeName: string | undefined,
  opts: { startDir: string; deckDir: string; ceilingDir: string },
): WatchRoot[] {
  if (themeName === undefined || !THEME_ID_PATTERN.test(themeName)) return []
  const ceiling = resolve(opts.ceilingDir)
  const withinCeiling = new Set<string>()
  for (let dir = resolve(opts.startDir); ; dir = dirname(dir)) {
    withinCeiling.add(dir)
    if (dir === ceiling || dirname(dir) === dir) break
  }
  return themeCandidates(themeName, opts)
    .filter((candidate) => candidate.deck || withinCeiling.has(resolve(candidate.anchor)))
    .map((candidate) => ({ path: candidate.path, kind: "file" }))
}

/** Per watched directory: which entry names count as a change, and which
 *  entries are themselves directories this tree watches (so their
 *  appearance, removal, or replacement re-attaches that child's watcher). */
interface WatchRule {
  files: Set<string>
  allFiles: boolean
  children: Set<string>
}

/**
 * Turns {@link WatchRoot}s into directory-level `fs.watch`ers and calls
 * `onChange` for every event that matters. A `file` root watches the file's
 * parent directory filtered to that one name; a `dir` root watches the
 * directory itself and takes every entry. A directory that does not exist
 * yet is not an error: the tree watches its nearest existing ancestor
 * filtered to the missing segment's name, and attaches the real watcher the
 * moment the segment appears (then descends into whatever children it was
 * waiting for). A directory that is removed or swapped for a new one (same
 * name, new inode) is detected on its parent's event and re-attached the
 * same way, so a watcher never sits on a dead inode. The root list is not
 * fixed at creation: {@link WatchTreeHandle.update} takes a new list,
 * attaches what is new and closes what is no longer named, keeping every
 * watcher both lists share. `close` closes every watcher the tree ever
 * opened, and a later `update` is a no-op, so a rebuild that finishes after
 * shutdown cannot reopen anything. Attaching is one directory at a time,
 * and a directory that cannot be watched for any reason other than not
 * existing (a plain file where a directory was expected gives ENOTDIR)
 * throws; when that happens while the tree is being created, every watcher
 * opened before it is closed first, so a caller that never receives a
 * handle has nothing left to close.
 */
export function watchTree(roots: WatchRoot[], onChange: () => void): WatchTreeHandle {
  let rules = new Map<string, WatchRule>()
  const watchers = new Map<string, { watcher: FSWatcher; ino: bigint }>()
  const isEnoent = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT"
  const isDenied = (e: unknown) => {
    const code = (e as NodeJS.ErrnoException).code
    return code === "EACCES" || code === "EPERM"
  }
  let closed = false

  function ruleFor(dir: string): WatchRule {
    let rule = rules.get(dir)
    if (!rule) {
      rule = { files: new Set(), allFiles: false, children: new Set() }
      rules.set(dir, rule)
    }
    return rule
  }

  function linkToParent(dir: string): string | undefined {
    const parent = dirname(dir)
    if (parent === dir) return undefined
    ruleFor(parent).children.add(basename(dir))
    return parent
  }

  function inodeOf(dir: string): bigint | undefined {
    try {
      const st = statSync(dir, { bigint: true })
      return st.isDirectory() ? st.ino : undefined
    } catch (e) {
      if (isEnoent(e)) return undefined
      throw e
    }
  }

  function detach(dir: string): void {
    for (const [key, entry] of watchers) {
      if (key === dir || key.startsWith(dir + sep)) {
        entry.watcher.close()
        watchers.delete(key)
      }
    }
  }

  function attach(dir: string): void {
    if (watchers.has(dir)) return
    const rule = ruleFor(dir)
    let watcher: FSWatcher
    try {
      watcher = watch(dir, (_event, filename) => onEvent(dir, filename))
    } catch (e) {
      // Not there yet (a brand-new deck project has no `pages/` or `assets/`
      // until something fills them, and the workspace's pinned-asset
      // directory only exists once a stock photo has been pinned). The
      // parent will say when it appears. Anything other than "doesn't exist"
      // (permissions, ...) is a real problem.
      if (isDenied(e)) {
        // The theme lookup walks up to the filesystem root, and an ancestor
        // there may be one this user can traverse but not read (inotify
        // needs read). Nothing can be watched under it. The build itself
        // reports anything that actually matters about such a directory.
        rules.delete(dir)
        return
      }
      if (!isEnoent(e)) throw e
      const parent = linkToParent(dir)
      if (parent !== undefined) attach(parent)
      return
    }
    const ino = inodeOf(dir)
    if (ino === undefined) {
      // Vanished between the `watch` call and the stat — treat it like the
      // ENOENT branch above, the parent's event brings it back.
      watcher.close()
      const parent = linkToParent(dir)
      if (parent !== undefined) attach(parent)
      return
    }
    watcher.on("error", () => detach(dir))
    watchers.set(dir, { watcher, ino })
    for (const child of rule.children) attach(join(dir, child))
  }

  /** A child directory's entry changed on its parent: keep the watcher when
   *  it is still the same directory, replace it when the directory was
   *  removed or swapped for a new inode. */
  function refreshChild(dir: string): void {
    const current = watchers.get(dir)
    const ino = inodeOf(dir)
    if (current !== undefined && current.ino === ino) return
    detach(dir)
    attach(dir)
  }

  function onEvent(dir: string, filename: string | Buffer | null): void {
    const rule = rules.get(dir)
    if (rule === undefined) return
    if (filename === null) {
      // The platform could not say which entry changed. Assume everything.
      for (const child of rule.children) refreshChild(join(dir, child))
      onChange()
      return
    }
    const name = basename(filename.toString())
    let matters = rule.allFiles || rule.files.has(name)
    if (rule.children.has(name)) {
      refreshChild(join(dir, name))
      matters = true
    }
    if (matters) onChange()
  }

  function update(list: WatchRoot[]): void {
    if (closed) return
    rules = new Map()
    for (const root of list) {
      const abs = resolve(root.path)
      if (root.kind === "file") {
        ruleFor(dirname(abs)).files.add(basename(abs))
      } else {
        ruleFor(abs).allFiles = true
        linkToParent(abs)
      }
    }
    // Attach first: a directory that does not exist links its ancestors
    // into `rules` on the way, and those must survive the sweep below.
    for (const dir of [...rules.keys()]) attach(dir)
    for (const [dir, entry] of watchers) {
      if (rules.has(dir)) continue
      entry.watcher.close()
      watchers.delete(dir)
    }
  }

  function close(): void {
    closed = true
    for (const entry of watchers.values()) entry.watcher.close()
    watchers.clear()
  }

  try {
    update(roots)
  } catch (e) {
    close()
    throw e
  }

  return { update, close }
}

export interface WatchTreeHandle {
  /** Replace the root list. Watchers both lists share stay open. */
  update: (roots: WatchRoot[]) => void
  /** Close every watcher. Later `update` calls do nothing. */
  close: () => void
}

/** Marker on the injected `<script>` element (task S2: "serve 模式检测（注入的
 *  脚本自带标记）", spec-plan.md §4) — lets a test (`serve.test.ts`) or later
 *  tooling confirm a served page carries this module's client wiring
 *  without parsing or executing it, and gives {@link injectServeClient} a
 *  fixed string to check for (a defensive double-injection guard —
 *  `createServeServer` only ever calls it on a fresh `buildDeckPreview`
 *  result, which never already contains it, but the check costs nothing). */
export const SERVE_CLIENT_SCRIPT_ID = "pptwise-serve-client"

/**
 * The serve-mode client (task S2), spliced into every served page by
 * {@link injectServeClient} — never seen by the non-serve `pptwise preview
 * --html` download path. Two jobs:
 *
 * 1. Live reload: opens `EventSource('/events')`, reloads the whole page on
 *    `reload` (design ruling 2), shows a fixed top banner on `error`. The
 *    server's own custom `event: error` frame and `EventSource`'s *built-in*
 *    connection-failure event share the same DOM event name on this one
 *    object — a real connection hiccup is a plain `Event` with no `data`
 *    (EventSource auto-reconnects itself off the server's `retry:` hint,
 *    nothing for this page to do); the server's frame is a `MessageEvent`
 *    whose `data` is a JSON `{message}` string. Checking for `.data` first
 *    tells the two apart. No explicit "clear the banner" path either: every
 *    successful rebuild's `reload` does a full `location.reload()`, wiping
 *    the banner along with the rest of the DOM — a separate hide-on-success
 *    branch would be dead code a reload always beats to it.
 *
 * 2. Revision-request submit: rewires the existing export/download button
 *    (`#pf-export-btn`, `buildPreviewHtml`/`./preview-html.ts`) to POST
 *    instead of only downloading. The exact serialized payload comes from
 *    `window.__pptwiseBuildExportBlob` — a plain function reference that
 *    file's own `<script>` closure assigns onto `window` specifically as
 *    this module's seam (see that file's own doc comment for the full
 *    rationale; design ruling 5 forbids a second copy of any part of the
 *    preview-build logic, and calling back into the original closure's own
 *    function is how this reuses it instead of re-deriving the
 *    `{version, deck, requests}` shape here). Called through
 *    `Promise.resolve(...).then(...)` rather than invoked and trusted
 *    directly — cheap insurance that both a synchronous throw *and* a
 *    rejected/async return from `buildExportBlob()` land in the same
 *    `.catch` as a network failure, all surfaced as the same inline
 *    status-line feedback, never a silent no-op. (An earlier version of
 *    this file took a different approach here — briefly monkey-patching
 *    `URL.createObjectURL`/`HTMLAnchorElement.prototype.click` around a
 *    programmatic click on the original button, to capture the `Blob` it
 *    built without a seam existing yet. Reviewed out: it only worked
 *    because that handler happened to be perfectly synchronous start to
 *    finish, an assumption a later change to it — one `await` — could
 *    silently break with zero user-visible error, on the one feature this
 *    whole command exists to make possible.) The rewired button (a
 *    `cloneNode` swapped in for the original — `cloneNode` never copies
 *    `addEventListener` listeners, so the original element, though detached
 *    from the document, keeps `buildPreviewHtml`'s own listener intact and
 *    still runnable via `.click()`) shows success/failure inline; a small
 *    secondary link next to it just calls `originalBtn.click()` — the
 *    untouched, real download path — so a manual copy is always still one
 *    click away regardless of whether the POST succeeds.
 *
 * Exported (S3, S2 re-review's named test carry) purely so
 * `serve-client.test.ts` can execute this exact string under jsdom instead of
 * only grepping it as markup — this file has no other export consumer, isn't
 * re-exported from anywhere `pptwise --help` or the SDK's public surface ever
 * reads, and stays exactly as inert to import as before: `src/cli/serve.ts`
 * is already Node-only (AGENTS.md's layout rule), never reachable from
 * `src/index.ts`'s browser-safe closure regardless of what it exports.
 */
export const SERVE_CLIENT_JS = `
(function () {
  // Live reload is the whole of this client (the revision-request submit
  // that used to sit beside it was removed on 2026-08-16 — see this
  // module's own header). It keeps its own function and its own try/catch
  // at the call site below: an EventSource construction that throws in some
  // unusual embedding must degrade to a page that simply does not
  // auto-refresh, not abort the IIFE.

  function setUpLiveReload() {
    var es = new EventSource('/events')
    es.addEventListener('reload', function () { location.reload() })

    var banner = document.createElement('div')
    banner.id = 'pptwise-serve-error-banner'
    banner.setAttribute('role', 'alert')
    banner.style.cssText =
      'display:none;position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
      'background:#dc2626;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
      'padding:8px 16px;text-align:center'
    document.body.appendChild(banner)

    function showBanner(message) {
      banner.textContent = 'pptwise serve: ' + message
      banner.style.display = 'block'
    }

    es.addEventListener('error', function (e) {
      if (!e || typeof e.data !== 'string') return // a real connection hiccup, not the server's own rebuild-failed frame
      var message = 'rebuild failed'
      try {
        var parsed = JSON.parse(e.data)
        if (parsed && typeof parsed.message === 'string') message = parsed.message
      } catch (err) {}
      showBanner(message)
    })

    // A page opened (or reloaded by hand) after a failed rebuild is the last
    // good build, not the current source. The SSE error frame for that
    // failure went out before this page existed, so ask once.
    if (typeof fetch === 'function') {
      fetch('/status')
        .then(function (res) { return res.json() })
        .then(function (status) {
          if (status && status.latestOk === false) {
            showBanner((typeof status.error === 'string' ? status.error : 'rebuild failed') + ' (showing the last successful build)')
          }
        })
        .catch(function () {})
    }
  }

  try {
    setUpLiveReload()
  } catch (e) {
    console.error('pptwise serve: failed to set up live reload', e)
  }
})()
`.trim()

/** Wraps {@link SERVE_CLIENT_JS} in its own `<script>` tag, marked with
 *  {@link SERVE_CLIENT_SCRIPT_ID}. */
function buildServeClientScriptTag(): string {
  return `<script id="${SERVE_CLIENT_SCRIPT_ID}">${SERVE_CLIENT_JS}</script>`
}

/**
 * Post-processing HTML injection (design ruling 5: `buildPreviewHtml`
 * (`./preview-html.ts`) has no seam of its own for extra script content,
 * and forking a second copy of its build logic is forbidden — so this
 * rewrites the *string* `buildDeckPreview` already returned instead,
 * leaving that module — and every byte it produces for the non-serve
 * `pptwise preview --html` download path — completely untouched).
 * `createServeServer` is the only caller, on every fresh
 * `buildDeckPreview` result (initial build and every rebuild alike).
 * Inserted right before the document's one `</body>`: by the time it runs,
 * every element the injected script itself touches (`#pf-export-btn`, ...)
 * already exists, the same reasoning `buildPreviewHtml` already places its
 * own `<script>` there for.
 */
export function injectServeClient(html: string): string {
  if (html.includes(SERVE_CLIENT_SCRIPT_ID)) return html
  return html.replace("</body>", `${buildServeClientScriptTag()}\n</body>`)
}


/**
 * One theme source as one comparable string, for `createServeServer`'s
 * timed check: `none` when nothing is bound, `builtin:<id>` for a factory
 * preset, and `file:<sha256>` for a theme file, where the digest is over
 * the parsed file's content (`ResolvedTheme.file`, serialized with its keys
 * in a fixed order) rather than over the raw bytes or the file's path,
 * mtime, and size. Content is what the page is drawn from: a rewrite that
 * keeps the timestamp and size, an atomic replace, or a symlink pointed at
 * another file all change this digest and nothing else, while a
 * whitespace-only save changes nothing the page would show and leaves it
 * alone. The lookup's error case is the check's own business
 * (`error:<message>`), since a build that fails has no theme to report.
 */
export function themeSourceKey(resolved: ResolvedTheme | undefined): string {
  if (resolved === undefined) return "none"
  if (resolved.kind === "builtin") return `builtin:${resolved.id}`
  const digest = createHash("sha256").update(JSON.stringify(sortKeysDeep(resolved.file))).digest("hex")
  return `file:${digest}`
}

/**
 * The testable factory (serve wave, task S1). Builds once up front — a
 * failure here rejects the whole call, see this module's own doc comment —
 * then starts listening and watching. Every fs/network resource this
 * function opens (the watchers, the heartbeat and theme-poll timers, the
 * HTTP server) is opened as the last step, after every `await` that could
 * reject, inside one `try` whose `catch` tears down whatever had been
 * opened before rethrowing. A caller that gets a handle tears the rest down
 * through {@link ServeHandle.close}, and a caller that gets an error has
 * nothing left to clean up, which is what makes this safe to call directly
 * from a test without going through the CLI at all.
 */
export async function createServeServer(options: ServeOptions): Promise<ServeHandle> {
  const cwd = options.cwd ?? process.cwd()
  const requestedPort = options.port ?? DEFAULT_PORT
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    throw new PptwiseError(`invalid port ${requestedPort} — expected an integer between 0 and 65535`)
  }

  // First build happens before the server ever starts listening — deliberate:
  // there is no previous-good HTML to fall back to yet, so an invalid target
  // must fail this call outright (CLI exit 1, same as every other command)
  // rather than start a server with nothing to show at `GET /`.
  const initial = await buildDeckPreview(options.target, { cwd })
  let cachedHtml = injectServeClient(initial.html)
  let latestRevision = 1
  let servedRevision = 1
  let latestError: string | undefined
  const sseClients = new Set<ServerResponse>()

  function status(): ServeBuildStatus {
    return latestError === undefined
      ? { latestRevision, servedRevision, latestOk: true }
      : { latestRevision, servedRevision, latestOk: false, error: latestError }
  }

  function writeToAll(chunk: string): void {
    for (const res of sseClients) {
      try {
        res.write(chunk)
      } catch {
        // A client that disconnected mid-broadcast — its own `close`/`error`
        // listener (registered where it's added to `sseClients` below)
        // removes it; one dead client must never stop the rest from hearing
        // about this rebuild.
      }
    }
  }

  function broadcast(event: string, data: unknown): void {
    writeToAll(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const deckDir = initial.isDir ? initial.resolvedTarget : dirname(initial.resolvedTarget)
  let boundThemeName: string | undefined = initial.ir.theme.id

  /** The theme name the target binds right now, read off the spec or IR
   *  file without building. Asked before every build, for the record a
   *  failed one leaves behind: a spec rebound to a name whose file does not
   *  exist yet fails to build, and the file that will fix it has to be
   *  watched and checked for before it exists. A file that cannot be read
   *  or parsed mid-edit keeps the last name. */
  async function peekBoundThemeName(): Promise<string | undefined> {
    const source = initial.isDir ? join(initial.resolvedTarget, SPEC_FILENAME) : initial.resolvedTarget
    try {
      const raw: unknown = JSON.parse(await readFile(source, "utf8"))
      const fromSpec = themeNameFromUnknown(raw)
      if (fromSpec !== undefined) return fromSpec
      const theme = (raw as { theme?: { id?: unknown } } | null)?.theme
      return typeof theme?.id === "string" ? theme.id : boundThemeName
    } catch {
      return boundThemeName
    }
  }

  const projectHit = await findConfig(cwd)
  const watchCeiling = projectHit !== null ? dirname(projectHit.path) : cwd
  const workspaceAssets = join(
    resolveWorkspaceLocation({
      cwd,
      projectConfigPath: projectHit?.path,
      outDir: projectHit?.config.outDir,
      target: initial.resolvedTarget,
      isDir: initial.isDir,
    }).dir,
    ASSETS_DIRNAME,
  )

  function currentWatchRoots(): WatchRoot[] {
    return watchRoots(initial.resolvedTarget, initial.isDir, [
      { path: workspaceAssets, kind: "dir" },
      ...themeWatchRoots(boundThemeName, { startDir: cwd, deckDir, ceilingDir: watchCeiling }),
    ])
  }

  /**
   * Where the bound name resolves to right now, as one comparable string
   * ({@link themeSourceKey}), or the error the lookup raises. Asked the same
   * way a build asks (`resolveThemeByName`, same `startDir`/`deckDir`, same
   * strictness), so whatever the resolver would do differently next build
   * shows up here first, a failure included: a plain file named `themes`
   * on the chain fails a build with ENOTDIR, and it fails this the same
   * way. Never throws: an error is itself an answer, and the change from
   * one answer to another is what matters, into the failure and back out.
   */
  async function themeSourceFingerprint(): Promise<string> {
    if (boundThemeName === undefined) return themeSourceKey(undefined)
    try {
      return themeSourceKey(await resolveThemeByName(boundThemeName, { startDir: cwd, deckDir }))
    } catch (e) {
      return `error:${e instanceof Error ? e.message : String(e)}`
    }
  }

  /** The theme the served page was built with, as the build itself reported
   *  it (never read off the disk a second time after the build: a file that
   *  changed between the build's read and such a re-read would be recorded
   *  as already built, and the next check would find nothing new), and how
   *  many builds have recorded one. A tick that started before a build
   *  finished compares against an answer that build has since replaced, so
   *  it checks the count on return and drops its result when the count
   *  moved. */
  let lastThemeSource = themeSourceKey(initial.resolvedTheme)
  let buildGeneration = 0
  let building = false
  let closed = false

  async function buildOnce(): Promise<void> {
    const revision = ++latestRevision
    building = true
    // A failed build reports no theme, and the record still has to move
    // or the check finds the same difference every tick and rebuilds
    // forever. What stands before the build starts, for the name the
    // source binds now, is the answer to keep in that case: a change that
    // lands after this point differs from it and costs at most one extra
    // rebuild, where an answer read after the failure could swallow it.
    boundThemeName = await peekBoundThemeName()
    const beforeBuild = await themeSourceFingerprint()
    try {
      const result = await buildDeckPreview(options.target, { cwd })
      cachedHtml = injectServeClient(result.html)
      servedRevision = revision
      latestError = undefined
      boundThemeName = result.ir.theme.id
      lastThemeSource = themeSourceKey(result.resolvedTheme)
      broadcast("reload", { revision })
    } catch (e) {
      latestError = e instanceof Error ? e.message : String(e)
      lastThemeSource = beforeBuild
      broadcast("error", { revision, message: latestError })
    }
    // `watchers` is assigned below, before the server listens. No build
    // runs before that: the initial one is awaited above this function.
    if (watchers === undefined) throw new Error("pptwise serve: a rebuild ran before the watchers were attached")
    watchers.update(currentWatchRoots())
    buildGeneration++
    building = false
  }

  // Builds run strictly one after another. Two overlapping builds could
  // otherwise finish out of order and leave the older result in the cache.
  let buildQueue: Promise<void> = Promise.resolve()
  function rebuild(): Promise<void> {
    const run = buildQueue.then(buildOnce)
    buildQueue = run
    return run
  }

  let debounceTimer: NodeJS.Timeout | undefined
  function scheduleRebuild(): void {
    if (closed) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      void rebuild()
    }, DEBOUNCE_MS)
  }

  // One check in flight at a time: a slow read (a network mount up the
  // chain) must not stack ticks behind it.
  let themeCheckInFlight = false
  async function checkThemeSource(): Promise<void> {
    if (themeCheckInFlight) return
    themeCheckInFlight = true
    const generation = buildGeneration
    try {
      const current = await themeSourceFingerprint()
      // Stale on return: the server closed, a build recorded a fresh answer
      // meanwhile, or one is about to. A build in flight records its own
      // answer when it finishes, and the next tick compares against that.
      if (closed || building || generation !== buildGeneration) return
      if (current !== lastThemeSource) scheduleRebuild()
    } finally {
      themeCheckInFlight = false
    }
  }

  const server = createServer((req, res) => {
    const pathname = (req.url ?? "/").split("?")[0]
    if (req.method === "GET" && pathname === "/") {
      const current = status()
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Pptwise-Build-Status": current.latestOk ? "ok" : "failed",
        "X-Pptwise-Served-Revision": String(current.servedRevision),
        "X-Pptwise-Latest-Revision": String(current.latestRevision),
      })
      res.end(cachedHtml)
      return
    }
    if (req.method === "GET" && pathname === "/status") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
      res.end(JSON.stringify(status()))
      return
    }
    if (req.method === "GET" && pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      })
      res.write("retry: 2000\n\n")
      sseClients.add(res)
      res.on("close", () => sseClients.delete(res))
      res.on("error", () => sseClients.delete(res))
      return
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("not found")
  })

  // Everything that holds a resource starts here, after the last `await`
  // that could reject, and inside one `try`: whichever step fails, what
  // the earlier steps opened is torn down before the error leaves. A
  // watcher set that cannot be attached (`watchTree` throws, having closed
  // its own partial set) is the first way out, a port in use the last.
  let watchers: WatchTreeHandle | undefined
  let heartbeat: NodeJS.Timeout | undefined
  let themePoll: NodeJS.Timeout | undefined

  function teardownWatchersAndTimers(): void {
    closed = true
    if (heartbeat) clearInterval(heartbeat)
    if (themePoll) clearInterval(themePoll)
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = undefined
    watchers?.close()
  }

  try {
    watchers = watchTree(currentWatchRoots(), scheduleRebuild)
    heartbeat = setInterval(() => writeToAll(": heartbeat\n\n"), HEARTBEAT_MS)
    themePoll = setInterval(() => void checkThemeSource(), THEME_POLL_MS)
    await new Promise<void>((resolveListen, rejectListen) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.removeListener("listening", onListening)
        rejectListen(err)
      }
      const onListening = () => {
        server.removeListener("error", onError)
        resolveListen()
      }
      server.once("error", onError)
      server.once("listening", onListening)
      server.listen(requestedPort, "127.0.0.1")
    })
  } catch (e) {
    teardownWatchersAndTimers()
    if ((e as NodeJS.ErrnoException).code === "EADDRINUSE") {
      throw new PptwiseError(`port ${requestedPort} is already in use — pick a different one with --port`)
    }
    throw e
  }

  const address = server.address()
  const actualPort = typeof address === "object" && address !== null ? address.port : requestedPort

  let serverClosed = false
  async function close(): Promise<void> {
    if (serverClosed) return
    serverClosed = true
    teardownWatchersAndTimers()
    for (const res of sseClients) res.end()
    sseClients.clear()
    // `res.end()` above finishes each SSE response, but the socket behind a
    // `Connection: keep-alive` response (`GET /events`'s own header) is not
    // guaranteed to be released the instant the response ends —
    // `server.close()`'s callback only fires once every socket the server
    // ever accepted has actually closed, so a lingering keep-alive socket
    // can otherwise leave it hanging indefinitely (S1 review carry).
    // `closeIdleConnections`/`closeAllConnections` ("http: added connection
    // closing methods", nodejs/node#42812) exist on every Node this repo
    // supports (floor 22.19, package.json#engines), so the `typeof` guard is
    // only there for a non-node http server double passed in by a test.
    // Calling both explicitly rather than trusting `close()` is deliberate:
    // whether `close()` alone releases idle keep-alive sockets has varied by
    // release (nodejs/node#52336), and calling both is correct either way, a
    // harmless no-op wherever `close()` already handled it.
    if (typeof server.closeIdleConnections === "function") server.closeIdleConnections()
    if (typeof server.closeAllConnections === "function") server.closeAllConnections()
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((err) => (err ? rejectClose(err) : resolveClose()))
    })
  }

  return { server, rebuild, status, close, url: `http://127.0.0.1:${actualPort}`, port: actualPort }
}

/**
 * Best-effort browser launch (spec-plan.md S1: "--no-open: 默认行为打开浏览器
 * ... 若无则 spawn open (darwin) / xdg-open (linux)"). Nothing
 * in this repo already opens URLs (`./update.ts` runs `npm`, not
 * a GUI app) — this is the one place that does. Never throws and never
 * rejects a caller's own flow: a headless box, a sandboxed CI runner, or a
 * missing `xdg-open` binary all fail silently — the URL `runServe` already
 * printed to the terminal is the fallback, so a failed launch here degrades
 * to "the user copies the URL themselves", not a broken `pptwise serve`.
 * Windows is out of scope (this repo's own dev-machine assumption is
 * macOS/Linux, spec-plan.md design ruling 1) — falls through to the
 * `xdg-open` branch, which simply fails to spawn (caught below) rather than
 * crashing.
 */
export function openBrowser(url: string): void {
  const command = osPlatform() === "darwin" ? "open" : "xdg-open"
  try {
    const child = spawnHidden(command, [url], { stdio: "ignore", detached: true })
    child.on("error", () => {})
    child.unref()
  } catch {
    // spawn() itself can throw synchronously (e.g. EMFILE) — equally non-fatal.
  }
}

export interface RunServeOptions {
  port?: number
  /** `false` suppresses the browser launch (`--no-open`). Default `true`. */
  open?: boolean
  cwd?: string
}

/**
 * `pptwise serve <target>` (`../cli.ts`'s CLI wiring). Resolving does not
 * mean the command is finished — unlike every other `run*` (`./commands.ts`),
 * which does its one unit of work and returns, this one starts a long-lived
 * server and returns almost immediately after; the open listening socket
 * `createServeServer` set up is what keeps the CLI process alive from here
 * (the standard long-running-dev-server shape — same reason `vite dev`'s own
 * process doesn't exit right after printing its URL), not this function
 * blocking on anything.
 */
export async function runServe(target: string, opts: RunServeOptions = {}): Promise<void> {
  const handle = await createServeServer({ target, port: opts.port, cwd: opts.cwd })
  console.log(`pptwise serve: ${handle.url} (Ctrl+C to stop)`)
  if (opts.open !== false) openBrowser(handle.url)
  process.on("SIGINT", () => {
    void handle.close().then(
      () => process.exit(0),
      () => process.exit(1),
    )
  })
}
