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
 * re-deriving the bare-name/`decksDir` resolution a second time. The one
 * exception is the set opened before the first build, which comes from
 * `locateDeck` (`./commands.ts`), the locator that build itself calls, and
 * which that build's own answer replaces as soon as it finishes: a deck
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
 * another name follows along. Everything else about the theme source is
 * settled by one record: a build reads every theme input it depends on
 * once, at its start (the bound name off the spec or IR, where that name
 * resolves to, and the deck-local `theme.json` the rebind guard compares
 * against; `collectThemeInputs`, `./theme-inputs.ts`), and reports that
 * record whether it succeeds or fails (`DeckBuildError`). Every
 * {@link THEME_POLL_MS} the same record is collected again the same way
 * and its key compared with the last build's. A different key is a
 * rebuild; the same key, an error included, is not, so a file that stays
 * broken is built once. That one comparison covers a `themes/` appearing,
 * disappearing, being moved away whole, or being replaced by a plain file
 * anywhere on the lookup chain, including above the project root where no
 * watcher can sit without listening to `/Users` or the like. It also
 * covers a theme file rewritten with its timestamp and size kept (a
 * restore, a save that preserves mtime, a symlink pointed elsewhere),
 * because what is compared is the content, never the file's metadata, and
 * a rebind refusal lifted by a change to the guard's own input. There is
 * no hand-over between the two mechanisms: the watcher only makes the
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
import { type FSWatcher, statSync, watch } from "node:fs"
import { createServer, type Server, type ServerResponse } from "node:http"
import { platform as osPlatform } from "node:os"
import { basename, dirname, join, resolve, sep } from "node:path"
import { THEME_ID_PATTERN } from "@/ir"
import { PptwiseError } from "../errors"
import { spawnHidden } from "./child"
import { buildDeckPreview, collectDeckThemeInputs, DeckBuildError, type DeckLocation, locateDeck } from "./commands"
import { findConfig } from "./config"
import { ASSETS_DIRNAME, PAGES_DIRNAME, SPEC_FILENAME, THEME_FILENAME } from "./deck-dir"
import { boundThemeName, type ThemeInputs } from "./theme-inputs"
import { themeCandidates } from "./theme-resolve"
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
/** How often the theme inputs are collected again and compared with the
 *  record the last build left — see this module's own doc comment and
 *  {@link createServeServer}. */
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
 * same way, so a watcher never sits on a dead inode. A watched directory
 * reports every watched directory directly under it by name, whether that
 * one exists yet, exists now, or was there at startup and has since been
 * removed or replaced: the entry's appearance, removal, or replacement is
 * never filtered out on the parent. The root list is not fixed at
 * creation: {@link WatchTreeHandle.update} takes a new list, checks every
 * watcher it keeps against what now sits at its path (one whose directory
 * was removed or replaced is closed and attached afresh, or hung off its
 * parent when nothing is there), attaches what is new and closes what is
 * no longer named, keeping every watcher both lists share that still sits
 * on its directory. `close` closes every watcher the tree ever
 * opened, and a later `update` is a no-op, so a rebuild that finishes after
 * shutdown cannot reopen anything. Attaching is one directory at a time,
 * and a directory that cannot be watched for any reason other than not
 * existing (a plain file where a directory was expected gives ENOTDIR)
 * throws; when that happens while the tree is being created, every watcher
 * opened before it is closed first, so a caller that never receives a
 * handle has nothing left to close. When it happens inside a later
 * `update`, the new rules stay, and so does every watcher that update
 * opened or kept: a watcher found sitting on a dead directory is gone, one
 * reopened on a replaced directory stays, and the directories after the
 * failing one in that update are not attached until the next. The caller
 * keeps hearing about every directory attached so far, the ancestor that
 * reports the offending entry going away included, and can try the list
 * again. Every directory between a watched one and `ceilingDir` (the
 * project root, or the start directory without a project) has a rule of
 * its own that names the watched directory under it, so that ancestor
 * exists whether or not the list named it: a `themes/` at the project
 * root has the root itself watching its name while the deck is served
 * from two levels down, not only when the deck is the root. Without a
 * ceiling, an ancestor gets a rule only when the list names it too or a
 * missing directory hangs off it.
 * The other way the tree touches watchers is inside an `fs.watch` callback,
 * where a child entry's event makes it stat and possibly re-attach that
 * child. The same failures are possible there (the parent swapped for a
 * plain file between the event and the stat gives ENOTDIR), and a throw
 * out of an `fs.watch` callback is an uncaught exception that ends the
 * process, so nothing is allowed out: whatever the callback throws goes to
 * `onError` instead, with the tree left as the callback got to, and the
 * caller's next `update` (the rebuild it schedules on that error) is the
 * one place the whole set is put right again.
 */
export function watchTree(
  roots: WatchRoot[],
  onChange: () => void,
  onError: (error: unknown) => void,
  options: { ceilingDir?: string } = {},
): WatchTreeHandle {
  let rules = new Map<string, WatchRule>()
  const watchers = new Map<string, { watcher: FSWatcher; ino: bigint }>()
  const ceiling = options.ceilingDir === undefined ? undefined : resolve(options.ceilingDir)
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

  /** Whether `dir` sits strictly inside the ceiling. The ceiling itself
   *  is the last directory to get a rule; nothing above it is watched. */
  function insideCeiling(dir: string): boolean {
    if (ceiling === undefined || dir === ceiling) return false
    return dir.startsWith(ceiling.endsWith(sep) ? ceiling : ceiling + sep)
  }

  /** Gives every directory from `dir`'s parent up to the ceiling a rule
   *  that names the next step down, whether or not the list named any of
   *  them, so a watched directory's appearance, removal, or replacement is
   *  reported by whichever ancestor is there to see it. Past the ceiling,
   *  or with none, the chain continues only through directories the
   *  rules already know. */
  function linkAncestors(dir: string): void {
    for (let child = dir; ; child = dirname(child)) {
      const parent = dirname(child)
      if (parent === child) return
      if (!insideCeiling(child) && !rules.has(parent)) return
      ruleFor(parent).children.add(basename(child))
    }
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

  /** Whether a watcher the tree holds still sits on the directory at its
   *  path. A path with a plain file somewhere along it (ENOTDIR) has no
   *  directory there any more than a missing one does. */
  function stillWatchesItsDirectory(dir: string, ino: bigint): boolean {
    try {
      return inodeOf(dir) === ino
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOTDIR") return false
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
      watcher = watch(dir, (_event, filename) => {
        try {
          onEvent(dir, filename)
        } catch (e) {
          onError(e)
        }
      })
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
    // From here the watcher is open and this function owns it until it is
    // in `watchers`: whatever the stat says, or throws (the directory
    // swapped for a plain file since the `watch` call gives ENOTDIR), the
    // watcher is closed before this returns or throws, so nothing `close`
    // cannot reach is left running.
    let ino: bigint | undefined
    try {
      ino = inodeOf(dir)
    } catch (e) {
      watcher.close()
      throw e
    }
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
    // A watched directory hears about every watched directory directly
    // under it, and so does every ancestor up to the ceiling, whether the
    // list named it or not: a `themes/` that was there at startup and is
    // later removed or swapped for a plain file is an event on its parent
    // that names it, not one the name filter drops, and that parent has a
    // watcher whether it is the deck directory, the project root two
    // levels above the deck, or something in between.
    for (const dir of [...rules.keys()]) linkAncestors(dir)
    // Every watcher held is checked against what now sits at its path:
    // one whose directory was removed or replaced is closed here, subtree
    // included, and attached afresh below, where a path with nothing to
    // watch hangs off its parent like any missing directory. Then attach:
    // a directory that does not exist links its ancestors into `rules` on
    // the way, and those survive the sweep at the end. A list that cannot
    // be attached in full leaves the new rules in place with every watcher
    // attaching got to, and throws: nothing opened is closed again, since
    // the ancestors that report the offending entry going away are among
    // them, and the sweep in `finally` closes what neither the new rules
    // nor the attaching so far wanted. So after any update, whether it
    // threw or not, every open watcher has a rule, and the tree listens by
    // the newest list as far as it could be attached.
    try {
      for (const [dir, entry] of [...watchers]) {
        if (!watchers.has(dir)) continue
        if (!stillWatchesItsDirectory(dir, entry.ino)) detach(dir)
      }
      for (const dir of [...rules.keys()]) attach(dir)
    } finally {
      for (const [dir, entry] of watchers) {
        if (rules.has(dir)) continue
        entry.watcher.close()
        watchers.delete(dir)
      }
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
 * The testable factory (serve wave, task S1). Locates the target, starts
 * watching it, builds once, then starts listening. A failed first build
 * rejects the whole call, see this module's own doc comment. The watchers
 * open before that build rather than after it: the build reads every page
 * at its start and a large deck renders for seconds after, and a page
 * saved in between used to land before anything was watching, leaving the
 * served page on the draft the build had read while the status called it
 * current. Now that save is an event like any other, and the rebuild it
 * schedules waits for the first build and runs once the server is up.
 *
 * Every fs/network resource this function opens (the watchers, the
 * heartbeat and theme-poll timers, the HTTP server) is opened inside one
 * `try` whose `catch` tears down whatever had been opened before
 * rethrowing, the first build included. A caller that gets a handle tears
 * the rest down through {@link ServeHandle.close}, and a caller that gets
 * an error has nothing left to clean up, which is what makes this safe to
 * call directly from a test without going through the CLI at all.
 */
export async function createServeServer(options: ServeOptions): Promise<ServeHandle> {
  const cwd = options.cwd ?? process.cwd()
  const requestedPort = options.port ?? DEFAULT_PORT
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    throw new PptwiseError(`invalid port ${requestedPort} — expected an integer between 0 and 65535`)
  }

  // Where the target is, located the way the first build will locate it,
  // and the project it sits in: everything the watch set needs before
  // that build has read anything. A target that cannot be located fails
  // here, before anything is opened, with the error the build would raise.
  const located = await locateDeck(options.target, { cwd })
  const projectHit = await findConfig(cwd)
  const watchCeiling = projectHit !== null ? dirname(projectHit.path) : cwd

  // Set by the first build, below. The server only listens once it has
  // succeeded, so nothing reads these before then.
  let cachedHtml = ""
  let latestRevision = 0
  let servedRevision = 0
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

  const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))

  /** The target the watch set is drawn for: as located above until the
   *  first build has resolved it, then as that build resolved it, which
   *  is what every later build resolves too. */
  let watchedTarget: DeckLocation = located

  /** The theme name the last build found bound, for the watcher set: a
   *  spec rebound to a name whose file does not exist yet fails to build,
   *  and the file that will fix it has to be watched before it exists. A
   *  build whose source could not be read keeps the last name. Unknown
   *  until the first build has read the source, so the set opened before
   *  it holds no theme files: a theme changed while that build runs is
   *  left to the timed check, which compares against what the build
   *  read. */
  let watchedThemeName: string | undefined

  function currentWatchRoots(): WatchRoot[] {
    const { resolvedTarget, isDir } = watchedTarget
    const deckDir = isDir ? resolvedTarget : dirname(resolvedTarget)
    const workspaceAssets = join(
      resolveWorkspaceLocation({
        cwd,
        projectConfigPath: projectHit?.path,
        outDir: projectHit?.config.outDir,
        target: resolvedTarget,
        isDir,
      }).dir,
      ASSETS_DIRNAME,
    )
    return watchRoots(resolvedTarget, isDir, [
      { path: workspaceAssets, kind: "dir" },
      ...themeWatchRoots(watchedThemeName, { startDir: cwd, deckDir, ceilingDir: watchCeiling }),
    ])
  }

  /** The key of the theme inputs the last build read, as the build itself
   *  reported them (never collected a second time after the build: a file
   *  that changed between the build's read and such a re-read would be
   *  recorded as already built, and the next check would find nothing
   *  new), and how many builds have recorded one. A tick that started
   *  before a build finished compares against a record that build has
   *  since replaced, so it checks the count on return and drops its result
   *  when the count moved. */
  let lastThemeInputsKey = ""
  let buildGeneration = 0
  let building = false
  let closed = false

  /** A build's record, success or failure, becomes the record on file. A
   *  failed build renders no theme, and the record still has to move or
   *  the check finds the same difference every tick and rebuilds forever.
   *  A theme file broken only for the length of one save is then on record
   *  as the broken read, the next tick finds the restored file different
   *  from that and rebuilds, while a file that stays broken is found the
   *  same and left alone. */
  function recordThemeInputs(inputs: ThemeInputs): void {
    lastThemeInputsKey = inputs.key
    watchedThemeName = boundThemeName(inputs) ?? watchedThemeName
  }

  /**
   * One build attempt, start to finish: the page, the record the timed
   * check compares against, and the watcher set for the theme the source
   * binds now. Whatever fails, this settles the attempt: the failure
   * becomes the attempt's status (a build that failed keeps the last good
   * page, and so does a build that rendered but could not re-attach its
   * watchers, since the page it rendered is still the newest good one), the
   * generation moves, and `building` clears. A watcher update that throws
   * (a plain file named `themes` at the project root gives ENOTDIR) leaves
   * the tree attached as far as it got ({@link watchTree}), so the parent
   * directory that reports the offending file going away is still heard,
   * and the build it triggers attaches the rest.
   */
  async function buildOnce(): Promise<void> {
    // The attempt's number, outcome, and page are published together when
    // it settles. Until then `status()` describes the last finished attempt:
    // publishing the number up front paired it with the previous attempt's
    // error for as long as the build ran, a failure that had not happened.
    const revision = latestRevision + 1
    let html: string | undefined
    let error: string | undefined
    building = true
    try {
      try {
        const result = await buildDeckPreview(options.target, { cwd })
        html = injectServeClient(result.html)
        recordThemeInputs(result.themeInputs)
      } catch (e) {
        // Every failure `buildDeckPreview` raises carries its record.
        if (!(e instanceof DeckBuildError)) throw e
        error = e.message
        recordThemeInputs(e.themeInputs)
      }
      // `watchers` is assigned below, before the server listens. No build
      // runs before that: the initial one is awaited above this function.
      if (watchers === undefined) throw new Error("pptwise serve: a rebuild ran before the watchers were attached")
      watchers.update(currentWatchRoots())
    } catch (e) {
      // The build's own failure, when there was one, names the cause the
      // author can act on; a watcher failure on top of it says the same
      // thing about the same path.
      error ??= messageOf(e)
    } finally {
      latestRevision = revision
      latestError = error
      if (html !== undefined) {
        cachedHtml = html
        servedRevision = revision
      }
      buildGeneration++
      building = false
    }
    if (error === undefined) broadcast("reload", { revision })
    else broadcast("error", { revision, message: error })
  }

  // Builds run strictly one after another. Two overlapping builds could
  // otherwise finish out of order and leave the older result in the cache.
  // The chain must never hold a rejection: a rejected link would skip
  // every `then` queued after it, and the timer that calls `rebuild()`
  // has no handler for it either, so the process would go down on an
  // unhandled rejection. `buildOnce` settles every failure itself; the
  // `catch` here is the guarantee for anything that still gets past it.
  // The chain starts shut and opens once the server is up: the watchers
  // are already open while the first build runs, and a rebuild a change
  // schedules meanwhile waits here instead of racing that build. When
  // startup fails the chain never opens, and nothing queued on it runs.
  let openBuildQueue!: () => void
  let buildQueue: Promise<void> = new Promise<void>((resolveOpen) => (openBuildQueue = resolveOpen))
  function rebuild(): Promise<void> {
    const run = buildQueue.then(buildOnce).catch((e: unknown) => {
      latestError = messageOf(e)
      building = false
      broadcast("error", { revision: latestRevision, message: latestError })
    })
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
  // chain) must not stack ticks behind it. The check collects the theme
  // inputs exactly as a build collects them (`collectDeckThemeInputs`,
  // same target, same `cwd`, same strictness), so whatever a build would
  // read differently next time shows up here first, a failure included: a
  // plain file named `themes` on the chain fails a build with ENOTDIR, and
  // it is recorded here the same way. The collection never throws: an
  // error is itself an answer, and the change from one answer to another
  // is what matters, into the failure and back out.
  let themeCheckInFlight = false
  async function checkThemeSource(): Promise<void> {
    if (themeCheckInFlight) return
    themeCheckInFlight = true
    const generation = buildGeneration
    try {
      const current = (await collectDeckThemeInputs(options.target, { cwd })).key
      // Stale on return: the server closed, a build recorded a fresh answer
      // meanwhile, or one is about to. A build in flight records its own
      // answer when it finishes, and the next tick compares against that.
      if (closed || building || generation !== buildGeneration) return
      if (current !== lastThemeInputsKey) scheduleRebuild()
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

  // Everything that holds a resource starts here, inside one `try`:
  // whichever step fails, what the earlier steps opened is torn down
  // before the error leaves. A watcher set that cannot be attached
  // (`watchTree` throws, having closed its own partial set) is the first
  // way out, a failed first build the next, a port in use the last.
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

  /** A watcher event the tree could not act on ({@link watchTree}'s
   *  `onError`): the failure is the status until the rebuild it schedules
   *  says otherwise, and that rebuild's watcher update, the same one a
   *  build always ends with, is what repairs the set or fails the same
   *  way for the same reason. */
  function onWatchError(e: unknown): void {
    if (closed) return
    latestError = messageOf(e)
    broadcast("error", { revision: latestRevision, message: latestError })
    scheduleRebuild()
  }

  try {
    watchers = watchTree(currentWatchRoots(), scheduleRebuild, onWatchError, { ceilingDir: watchCeiling })
    // The first build happens before the server ever starts listening,
    // deliberately: there is no previous-good HTML to fall back to yet, so
    // an invalid target must fail this call outright (CLI exit 1, same as
    // every other command) rather than start a server with nothing to show
    // at `GET /`.
    const initial = await buildDeckPreview(options.target, { cwd })
    cachedHtml = injectServeClient(initial.html)
    latestRevision = 1
    servedRevision = 1
    recordThemeInputs(initial.themeInputs)
    watchedTarget = { resolvedTarget: initial.resolvedTarget, isDir: initial.isDir }
    watchers.update(currentWatchRoots())
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

  openBuildQueue()

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
