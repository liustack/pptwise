// Browser half of the pptwise dsh plugin: the deck preview card.
//
// The host half (`./preview-tool.js`) registers `pptwise_preview`, stamps a
// preview id into the tool's result text, and serves the rendered bundle from
// its own route under that id. This file is what turns that payload into
// something a person can look at: a thumbnail strip in the tool card, and a
// full-screen view on click. No new tab, no localhost URL, no
// "open this link yourself", which is the whole reason the tool exists.
//
// `dsh.client.immediately` is not optional for this plugin. The client module
// table is lazy: a boot-graph row only loads when something imports its id,
// and nothing in the shell imports a third-party plugin. Without the flag
// this file is served and never executed — which is exactly how the first
// build shipped, with the tool rendering in the generic row and no error
// anywhere to say the card had never been loaded at all.
//
// Hand-written in the lazy-CJS bundle protocol (`window.__ModuleLoader__.load`
// with a factory returning cordis-plugin exports), matching the host half's
// zero-dependency stance and modlens's precedent: no build step, no JSX, no
// imports from dsh client packages beyond what `require` hands back at
// materialization time. `react` arrives through that same `require`, so this
// package still declares no react dependency of its own.
//
// It renders nothing itself. Every slide it shows is markup `renderSlideSvg`
// already produced, carried verbatim from the tool result — the same single
// rendering path the CLI, the review gallery and the promotional images all
// read from. A second renderer living in a UI is how those would drift into
// describing different products.
//
// The two halves of a card have different lifetimes, and that is the whole of
// what went wrong in the field. What it draws comes from one request; what its
// buttons do is a second request made minutes or days later, against files the
// user may since have deleted. Reopen a transcript after that and the card used
// to have two failure modes and no words for either: under Code Mode the fetch
// 404'd and the entire card — strip, Open, Download — rendered nothing, so the
// tool call read as if it had produced nothing; with a payload already in hand,
// the strip drew perfectly and the viewer opened on
// `{"error":"unknown preview id"}`, displayed as a document, framed by this
// card's own Close button. So: a missing deck is now an answer (the card says
// the deck is gone, and how long it was), every way into the viewer asks the
// route first, and the host half answers the iframe with a page rather than
// with JSON.
//
// The correction after that was learning to tell "gone" from "this request did
// not work" — see `verdictOf`. Collapsing the two meant one flaky response
// permanently retired a deck that was sitting on disk the whole time.
//
// Preview is a tab in DSH's right sidebar, the way DSH opens a presented
// file: the deck one page at a time, with the keyboard in it from the moment
// it opens. It used to be an iframe of the finished `preview.html` in a modal
// of this card's own, and two things were wrong with that inside DSH: nothing
// moved the keyboard into the frame, so ←/→ never reached the deck until the
// reader clicked it, and the page brought its own light/dark switch beside
// DSH's. `preview.html` is still what harnesses without a plugin UI open.
// Every card here wears DSH's own design variables, buttons and tags (see
// THE LOOK below), so its colours follow DSH's theme.
window.__ModuleLoader__.load({
  id: '@liustack/pptwise',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var TOOL_NAME = 'pptwise_preview'

    /** The one-pass build. Its result carries the same preview stamp, so the deck card draws it. */
    var BUILD_TOOL_NAME = 'pptwise_build'

    /** The theme wall, drawn by its own card below. */
    var THEMES_TOOL_NAME = 'pptwise_themes'

    /** The outline: the checked spec's pages, one row each. */
    var OUTLINE_TOOL_NAME = 'pptwise_outline'

    // The words the newer cards show, in the harness's own language. DSH's
    // locale service gets the two dictionaries when it is there (`apply`),
    // and `t` reads through it, so a card follows the language the user set.
    // Before it is up, or in a shell without one, the page's own language
    // decides. Keys and dictionaries live here, beside the cards that use them.
    var LOCALE_NS = 'pptwise'
    var STRINGS = {
      zh: {
        'outline.title': '大纲',
        'outline.pages': '{n} 页',
        'outline.theme': '主题 {theme}',
        'type.cover': '封面',
        'type.chapter': '章节',
        'type.content': '正文',
        'type.ending': '结尾',
        'card.unavailable': '这份内容已不在本机的预览目录里。',
        'card.retry': '重试',
        'card.open': '预览',
        'card.draft': '草稿',
        'card.needsRevision': '待修改',
        'card.findings': '{n} 条检查提示',
        'card.themes': '{n} 个主题',
        'card.signature': '招牌版式 {x}/{n} 页',
        'card.saving': '正在保存…',
        'card.retryDownload': '重新下载',
        'card.export.gone': '不可用',
        'card.export.damaged': '已损坏',
        'card.export.refused': '被拒绝',
        'badge.gone': '已不在',
        'badge.damaged': '已损坏',
        'badge.refused': '被拒绝',
        'viewer.counter': '第 {n} / 共 {m} 页',
        'viewer.prev': '上一页',
        'viewer.next': '下一页',
        'viewer.pages': '全部页面',
        'viewer.close': '关闭',
        'pane.deck': '幻灯片',
        'pane.themes': '主题',
        'pane.compare': '对比上一版',
        'desk.version': '第 {n} 版',
        'desk.pages': '{n} 页',
        'desk.written': '已写 {x}/{n} 页',
        'desk.needsRevision': '待修改，未出 .pptx',
        'desk.changed': '改了 {n} 页',
        'desk.unchanged': '与上一版相同',
        'desk.removed': '删了 {n} 页',
        'desk.open': '预览',
        'desk.download': '下载 .pptx',
        'desk.compare': '对比上一版',
        'desk.page': '第 {n} 页',
        'desk.edit': '改这页',
        'desk.changedMark': '改过',
        'desk.addedMark': '新增',
        'compare.title': '第 {from} 版 → 第 {to} 版',
        'compare.before': '上一版',
        'compare.after': '这一版',
        'compare.none': '没有这一页',
        'compare.removed': '这一版删掉了',
        'edit.prefix': '第 {n} 页：',
        'alt.title': '其他主题',
        'alt.switch': '换成 {name}',
      },
      en: {
        'outline.title': 'Outline',
        'outline.pages': '{n} pages',
        'outline.theme': 'Theme {theme}',
        'type.cover': 'Cover',
        'type.chapter': 'Section',
        'type.content': 'Content',
        'type.ending': 'Ending',
        'card.unavailable': 'This is no longer in the preview folder on this machine.',
        'card.retry': 'Retry',
        'card.open': 'Preview',
        'card.draft': 'draft',
        'card.needsRevision': 'needs revision',
        'card.findings': '{n} audit findings',
        'card.themes': '{n} themes',
        'card.signature': 'Signature layouts on {x} of {n} pages',
        'card.saving': 'Saving…',
        'card.retryDownload': 'Retry download',
        'card.export.gone': 'Unavailable',
        'card.export.damaged': 'Damaged',
        'card.export.refused': 'Refused',
        'badge.gone': 'gone',
        'badge.damaged': 'damaged',
        'badge.refused': 'refused',
        'viewer.counter': 'Page {n} of {m}',
        'viewer.prev': 'Previous page',
        'viewer.next': 'Next page',
        'viewer.pages': 'All pages',
        'viewer.close': 'Close',
        'pane.deck': 'Slides',
        'pane.themes': 'Themes',
        'pane.compare': 'Compare with last version',
        'desk.version': 'Version {n}',
        'desk.pages': '{n} pages',
        'desk.written': '{x} of {n} pages written',
        'desk.needsRevision': 'Needs revision, no .pptx yet',
        'desk.changed': '{n} pages changed',
        'desk.unchanged': 'Same as the last version',
        'desk.removed': '{n} pages removed',
        'desk.open': 'Preview',
        'desk.download': 'Download .pptx',
        'desk.compare': 'Compare with last version',
        'desk.page': 'Page {n}',
        'desk.edit': 'Edit this page',
        'desk.changedMark': 'Changed',
        'desk.addedMark': 'New',
        'compare.title': 'Version {from} → version {to}',
        'compare.before': 'Last version',
        'compare.after': 'This version',
        'compare.none': 'Not in this version',
        'compare.removed': 'Removed in this version',
        'edit.prefix': 'Page {n}: ',
        'alt.title': 'Other themes',
        'alt.switch': 'Switch to {name}',
      },
    }
    var localeT = null

    function pageLanguage() {
      var lang = ''
      try {
        lang = (document.documentElement && document.documentElement.lang) || (window.navigator && window.navigator.language) || ''
      } catch {
        lang = ''
      }
      return /^zh/i.test(lang) ? 'zh' : 'en'
    }

    function t(key, params) {
      if (localeT) return localeT(key, params)
      var template = STRINGS[pageLanguage()][key] || STRINGS.en[key] || key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, function (match, name) {
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
      })
    }

    /**
     * How many thumbnails the strip draws.
     *
     * The host half inlines exactly this many pages' markup
     * (`THUMBNAIL_STRIP_PAGES`, ./preview-tool.js) and sends the rest as
     * metadata only, so the two numbers are one decision written down twice.
     * `stripPages` filters on markup as well as slicing, which is what keeps a
     * disagreement between them showing up as a shorter strip instead of a row
     * of empty boxes.
     */
    var STRIP_PAGES = 12

    /** Where the deck itself lives — the bundle the strip draws from. */
    function previewBundleUrl(previewId) {
      return '/pptwise/preview/' + previewId
    }

    /** One page from the route, the 0-based `index`th: a thumbnail, or the page full screen. */
    function pageUrl(id, index) {
      return previewBundleUrl(id) + '/page/' + (index + 1)
    }

    /**
     * What one answer from the route says about the deck behind an id.
     *
     * This is the distinction the card was missing, and the bug it caused was
     * not subtle: every non-2xx response collapsed into "expired", so a single
     * 502 from a restarting harness, or a request that never left the tab,
     * retired a deck that was sitting on disk the whole time — permanently,
     * for the life of the page, with a reload the only way back.
     *
     * 404 and 410 are the route's two verdicts about the id itself: never
     * heard of it, or heard of it and cannot serve what is left. Both are
     * final, because nothing regenerates a preview (see the host half). Every
     * other outcome — a 5xx, a proxy error, a socket that never opened — is a
     * statement about this attempt and about nothing else, so the card holds
     * its judgement and the next click tries again.
     */
    function verdictOf(res) {
      if (!res) return Promise.resolve(UNREACHABLE_VERDICT)
      if (res.ok) return Promise.resolve('alive')
      // A status code does not say who produced it. The plugin's route may
      // have failed to register, a proxy may have answered first, or the shell
      // may be serving its own not-found page for a path it does not know —
      // all of which look exactly like our 404 and none of which are evidence
      // that a deck is gone. Only a stamped answer is allowed to retire one.
      //
      // Same-origin, so the header is readable without the server having to
      // list it in `Access-Control-Expose-Headers`. If this route ever became
      // cross-origin that header would have to be added, and until then a proxy
      // that strips ours degrades everything to `unreachable` — a false
      // negative, which is the safe direction: the card offers another try
      // instead of retiring a live deck.
      if (!fromPreviewRoute(res)) return Promise.resolve(UNREACHABLE_VERDICT)
      // Not lumped in with the retryable failures, because retrying an
      // identical request against a door that is closed does nothing. The user
      // has to change something outside this card first.
      //
      // Only a *stamped* 401/403 reaches this line — the check above has
      // already sent an unstamped one to `unreachable`. So this is a narrow
      // door: a plain reverse proxy's own 401 does not carry our header and
      // gets a Retry it may well be able to satisfy, which is the safe way
      // round. The host half sends no 401/403 of its own at all.
      if (res.status === 401 || res.status === 403) return Promise.resolve('refused')
      if (res.status !== 404 && res.status !== 410) return Promise.resolve(UNREACHABLE_VERDICT)
      // Both final, and they need opposite sentences in front of a person, so
      // the status alone is not enough to act on. The route says which kind in
      // the body; reading it is why this function is asynchronous.
      return readFailureCode(res).then(function (code) {
        return code === 'preview_damaged' ? 'damaged' : 'gone'
      })
    }

    /** The header the host half stamps on every answer it writes. */
    var ROUTE_HEADER = 'x-pptwise-preview'

    function fromPreviewRoute(res) {
      var headers = res && res.headers
      if (!headers || typeof headers.get !== 'function') return false
      return headers.get(ROUTE_HEADER) === '1'
    }

    /**
     * The machine-readable half of a failure, or nothing.
     *
     * Read from the body rather than guessed from the prose. A body that will
     * not parse is not a reason to give up on the status we already have, so
     * this resolves with null and the caller falls back to the coarser reading.
     */
    function readFailureCode(res) {
      if (!res || typeof res.json !== 'function') return Promise.resolve(null)
      return res
        .json()
        .then(function (body) {
          return body && typeof body.code === 'string' ? body.code : null
        })
        .catch(function () {
          return null
        })
    }

    /** A request that never produced a response says nothing about the deck. */
    var UNREACHABLE_VERDICT = 'unreachable'

    /**
     * The verdicts a Retry button can honestly do something about.
     *
     * Only `unreachable`. `gone` and `damaged` are final by construction —
     * nothing regenerates a preview — and `refused` is the route answering, so
     * the identical request will be refused identically until something changes
     * elsewhere. This is called from the render path, not just asserted about:
     * a version of this that was only ever tested as a pure function shipped a
     * Retry button on a refusal it could never satisfy.
     */
    function isRetryable(verdict) {
      return verdict === UNREACHABLE_VERDICT
    }

    /** The verdicts that mean this deck will not open, whatever the user does next. */
    function isFinal(verdict) {
      return verdict === 'gone' || verdict === 'damaged' || verdict === 'refused'
    }

    /**
     * Are these bytes a zip, and therefore plausibly a .pptx?
     *
     * `50 4b 03 04` is the local file header every zip starts with, and Office
     * Open XML is a zip. This is not a deep validation and does not try to be —
     * it is the one check that separates "a deck" from "an HTML page a proxy
     * returned with status 200", which is the failure that actually happened.
     */
    function isZip(blob) {
      if (!blob || typeof blob.slice !== 'function' || typeof blob.arrayBuffer !== 'function') {
        return Promise.resolve(false)
      }
      return blob
        .slice(0, 4)
        .arrayBuffer()
        .then(function (head) {
          var bytes = new Uint8Array(head)
          return bytes.length === 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
        })
        .catch(function () {
          return false
        })
    }

    /**
     * What the card says once it knows the deck behind its id is gone.
     *
     * One sentence, used by the badge, the export button and the degraded row
     * alike, because they are all reporting the same fact and a card that
     * words it three ways reads as three different problems.
     *
     * It no longer says "expired", and that is a correctness fix rather than a
     * wording preference: nothing expires a preview. There is no timer, no
     * size budget and no sweep, so telling the user their preview timed out
     * sent them looking for a retention setting that does not exist.
     *
     * It does not name a culprit either, and that is the same correction made
     * twice. All the route observed is that nothing is at the place this id
     * names, the `.pptwise/previews/` folder of the project it was rendered
     * in. Deletion is the usual reason and not the only one: a project folder
     * moved or renamed since leaves the deck alive and out of reach, which is
     * a fact about the folder and not about anything the user did wrong.
     */
    var MISSING_HINT =
      'The rendered deck for this preview is no longer on disk where this session looks for it. ' +
      "Previews are never removed on a timer, so it was either deleted or its project's .pptwise/previews/ " +
      'folder has moved. Run pptwise_preview again to rebuild it.'

    /** What the card says when it could not reach the route at all. */
    var UNREACHABLE_HINT =
      'Could not reach the pptwise preview route. The deck may still be there — try again.'

    /** What the card says when the route answered, but refused. */
    var REFUSED_HINT =
      'The pptwise preview route refused this request. The deck may still be there, ' +
      'but this browser is not allowed to read it. Trying again will be refused the same way.'

    /**
     * What the card says when the deck was rendered and its bookkeeping is not
     * readable.
     *
     * Deliberately never the word "deleted", and never "no longer on disk". The
     * host half tells these two apart and says so in a machine-readable code;
     * before this sentence existed the card threw that away and reported both
     * as a deletion, so a `record.json` truncated by a full disk arrived at the
     * user as an accusation that they had removed their own work. The pages are
     * very likely still sitting next to the file that went bad.
     */
    var DAMAGED_HINT =
      'This preview cannot be opened: the file describing it is present but unreadable. ' +
      'The rendered pages may still be on disk — run pptwise_preview again to rebuild it.'

    /** The sentence that goes with a verdict, in the one place that shows all of them. */
    function hintFor(verdict) {
      if (verdict === 'gone') return MISSING_HINT
      if (verdict === 'damaged') return DAMAGED_HINT
      if (verdict === 'refused') return REFUSED_HINT
      return UNREACHABLE_HINT
    }

    /** The one word the badge shows, per verdict. Never "gone" for anything but gone. */
    function badgeFor(verdict) {
      if (verdict === 'damaged') return 'damaged'
      if (verdict === 'refused') return 'refused'
      return 'gone'
    }

    /**
     * Everything the tool said in text, joined.
     *
     * This is the channel that survives Code Mode: a tool invoked from inside
     * `run_code` is a sub-call, and the registry computes `presentationMeta`
     * for top-level calls only, so on this repo's default agent preset the
     * structured payload never exists. The result text always does — which is
     * why both the preview id and, when the deck itself is gone, the one fact
     * left about it are read back out of here.
     */
    function resultTextOf(block) {
      var text = ''
      var content = (block && (block.content || (block.result && block.result.content))) || []
      for (var i = 0; i < content.length; i++) {
        if (content[i] && typeof content[i].text === 'string') text += content[i].text
      }
      return text
    }

    /**
     * A short tag that tells one card's SVG ids from another's on the same
     * page. Taken from the end: an id starts with its project folder, which
     * every card from one project shares, and ends with its own uuid.
     */
    function idStamp(id) {
      return String(id).slice(-8)
    }

    /** The preview id the tool stamped into its own result text. */
    function previewIdOf(block) {
      var m = /pptwise-preview:([A-Za-z0-9-]+)/.exec(resultTextOf(block))
      return m ? m[1] : null
    }

    /** The theme wall's id, stamped the same way by `pptwise_themes`. */
    function wallIdOf(block) {
      var m = /pptwise-themes:([A-Za-z0-9-]+)/.exec(resultTextOf(block))
      return m ? m[1] : null
    }

    /** The outline's id, stamped the same way by `pptwise_outline`. */
    function outlineIdOf(block) {
      var m = /pptwise-outline:([A-Za-z0-9-]+)/.exec(resultTextOf(block))
      return m ? m[1] : null
    }

    /**
     * How long the deck was, read back out of the tool's own summary line.
     *
     * The tool's summary line is what survives in a transcript once the
     * rendered files are gone, and this is the fact the card reads back out of
     * it. The bundle does not survive: it never enters the session log under
     * Code Mode, and putting it there would mean a session log that grows by a
     * deck's worth of SVG per call — the trade this plugin already decided
     * against. So when the route can no longer serve the deck, one number
     * parsed from a line already in the log is the difference between a card
     * that says "there were nine pages here" and a card that vanishes as if
     * the tool had never run.
     *
     * Parsed rather than carried in a second machine-readable stamp: the
     * sentence is written by `modelSummary` in this plugin's own host half,
     * one file away, and a test drives the real output of that function
     * through this parser, so the two cannot drift apart without that test
     * going red.
     */
    function pageCountOf(block) {
      var m = /\brendered (\d+) pages?\b/.exec(resultTextOf(block))
      return m ? Number(m[1]) : null
    }

    /**
     * Pull the preview bundle out of a frozen tool-call node.
     *
     * Only sessions saved by an older host half have one: it used to put the
     * whole bundle on `presentationMeta`, and those logs still carry it. The
     * current host half sends the id alone (the bundle in the tool's value
     * reached the model under Code Mode), so a new card always comes from the
     * route. The exact field the runtime lands meta on has moved between rc
     * builds, so this reads the handful of shapes it can appear under rather
     * than pinning one. Returning null falls through to the route.
     */
    function bundleOf(block) {
      if (!block) return null
      var candidates = [block.meta, block.resultView, block.result && block.result.meta, block.presentationMeta]
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i]
        if (c && c.card === 'pptwise-preview' && c.bundle && Array.isArray(c.bundle.pages)) return c.bundle
        if (c && c.bundle && Array.isArray(c.bundle.pages)) return c.bundle
      }
      return null
    }

    /**
     * Every page the deck has, markup or not.
     *
     * The pages past the strip arrive with `svg: null`, and they still belong
     * here: this is what the card counts and what decides whether there is a
     * deck at all. Filtering them out would make the header under-report a
     * long deck's length, and would make a card vanish rather than say
     * anything if a bundle ever arrived carrying no markup at all.
     */
    function viewablePages(bundle) {
      return bundle && Array.isArray(bundle.pages) ? bundle.pages : []
    }

    function hasMarkup(page) {
      return !!page && typeof page.svg === 'string' && page.svg.length > 0
    }

    /**
     * The pages the strip can actually draw: the first `STRIP_PAGES`, minus
     * any that arrived without markup. See `STRIP_PAGES` for why the filter is
     * normally a no-op and why it is here anyway.
     */
    function stripPages(pages) {
      return pages.slice(0, STRIP_PAGES).filter(hasMarkup)
    }

    /** The number a reader would call this page, not its index in the array. */
    function pageNumberOf(page, index) {
      return (page && typeof page.page === 'number' ? page.page : null) || index + 1
    }

    /**
     * Namespace one page's internal ids.
     *
     * Every slide is a standalone SVG document whose ids only have to be
     * unique inside itself. Several of them in one page merge id spaces, so a
     * `url(#decor-tech-field)` on slide 6 would resolve against slide 3's
     * definition of the same id. The host half solves this at build time for
     * the files it writes (`src/lib/svg-ids.ts`); the same transform has to
     * run here because this card mounts several documents into one DOM.
     */
    function namespaceIds(svg, prefix) {
      return svg
        .replace(/\bid="([^"]*)"/g, function (_m, id) {
          return 'id="' + prefix + id + '"'
        })
        .replace(/url\(#([^)"']*)\)/g, function (_m, id) {
          return 'url(#' + prefix + id + ')'
        })
        .replace(/\b(xlink:href|href)="#([^"]*)"/g, function (_m, attr, id) {
          return attr + '="#' + prefix + id + '"'
        })
    }

    // THE DRAFT DESK'S BOOKKEEPING.
    //
    // Which turn produced which deck, outline or theme wall is read off the
    // session log, never kept by this plugin. A Conversation definition
    // matches the pptwise tool calls (top-level `tool/call` and `tool/result`,
    // and the `tool/ptc-dispatch` pair a Code Mode sub-call writes), and turns
    // each into a hidden chat node carrying the id stamped in its result
    // text. The turn tail then asks the chat target for this turn's nodes.
    // Because everything is derived from events already in the log, a forked
    // session or a replayed one gets exactly the cards its own log implies,
    // and no plugin event is ever written into a session.
    //
    // The version number comes from the same log and counts turns, not
    // builds: a version is what one turn handed the user. The model may
    // build three times in a turn (a draft that needs revision, the clean
    // build, a preview of it), and the user still sees one deck, so every
    // deck call in a turn shares that turn's number, and "the last version"
    // is the last deck of an earlier turn. Each call's state carries, per
    // deck, the turn and version of the latest call and the id it drew,
    // handed forward from the nearest earlier pptwise call. Only the events
    // the client has loaded take part, so a deck whose earlier turns lie
    // before the loaded window counts from there.
    var ARTIFACT_KIND = 'pptwise-artifact'
    var ARTIFACT_TOOLS = {
      pptwise_preview: 'deck',
      pptwise_build: 'deck',
      pptwise_themes: 'themes',
      pptwise_outline: 'outline',
    }
    var STAMP_KINDS = { preview: 'deck', themes: 'themes', outline: 'outline' }

    function isRecord(value) {
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    }

    function contentText(content) {
      if (typeof content === 'string') return content
      if (!Array.isArray(content)) return ''
      var text = ''
      for (var i = 0; i < content.length; i++) {
        if (content[i] && typeof content[i].text === 'string') text += content[i].text
      }
      return text
    }

    function argsOf(raw) {
      if (isRecord(raw)) return raw
      if (typeof raw !== 'string') return {}
      try {
        var parsed = JSON.parse(raw)
        return isRecord(parsed) ? parsed : {}
      } catch {
        return {}
      }
    }

    /** The stamp a pptwise result carries: `{ kind, id }`, or null. */
    function stampOf(text) {
      var m = /pptwise-(preview|themes|outline):([A-Za-z0-9-]+)/.exec(text)
      return m ? { kind: STAMP_KINDS[m[1]], id: m[2] } : null
    }

    /** Identity and role of one event for the definition, or null. */
    function artifactMatch(event) {
      var data = event && event.data
      if (!isRecord(data)) return null
      if (event.type === 'tool/call') {
        if (!ARTIFACT_TOOLS[data.name] || typeof data.callId !== 'string') return null
        return { id: data.callId, role: 'start' }
      }
      if (event.type === 'tool/ptc-dispatch-start' || event.type === 'tool/ptc-dispatch') {
        if (!ARTIFACT_TOOLS[data.name] || typeof data.subCallId !== 'string') return null
        return { id: data.subCallId, role: event.type === 'tool/ptc-dispatch-start' ? 'start' : 'update' }
      }
      if (event.type === 'tool/result') {
        var message = data.message
        var callId = isRecord(message) && isRecord(message.source) ? message.source.callId : undefined
        if (typeof callId !== 'string' || !stampOf(contentText(message.content))) return null
        return { id: callId, role: 'update' }
      }
      return null
    }

    /** What the matched events say about one call: tool, target, and the id its result stamped. */
    function artifactInfo(matches) {
      var info = { name: null, kind: null, target: '', id: null }
      for (var i = 0; i < matches.length; i++) {
        var event = matches[i].event
        var data = event && event.data
        if (!isRecord(data)) continue
        if (event.type === 'tool/call' || event.type === 'tool/ptc-dispatch-start' || event.type === 'tool/ptc-dispatch') {
          info.name = data.name
          info.kind = ARTIFACT_TOOLS[data.name] || null
          var args = argsOf(data.arguments)
          info.target = String(args.target || args.title || '')
        }
        var text = event.type === 'tool/ptc-dispatch'
          ? contentText(data.content)
          : event.type === 'tool/result' && isRecord(data.message)
            ? contentText(data.message.content)
            : ''
        var stamp = text ? stampOf(text) : null
        if (stamp) {
          info.id = stamp.id
          if (!info.kind) info.kind = stamp.kind
        }
      }
      return info
    }

    /** Which deck a target names: its last path segment, whatever the spelling of the rest. */
    function deckKey(target) {
      var parts = String(target || '')
        .replace(/\\/g, '/')
        .replace(/\/(deck\.spec\.json|deck\.json)$/, '')
        .replace(/\/+$/, '')
        .split('/')
      return (parts[parts.length - 1] || '').replace(/\.json$/, '')
    }

    /**
     * The turn a matched event belongs to, or null where DSH placed it in no
     * turn. A call with no turn counts as a turn of its own.
     */
    function turnOf(match) {
      var location = match && match.location
      if (!location || (location.kind !== 'turn' && location.kind !== 'step')) return null
      return location.turn ? location.turn.turn : null
    }

    function startOf(matches) {
      for (var i = 0; i < matches.length; i++) if (matches[i].role === 'start') return matches[i]
      return matches[0]
    }

    /**
     * Which version a deck call in `turn` belongs to, given the record the
     * earlier calls left for that deck: the same one as an earlier call in
     * the same turn, otherwise one more than the last, compared with the
     * deck that last one drew.
     */
    function placeVersion(record, turn) {
      if (!record) return { version: 1, priorId: null }
      if (turn !== null && record.turn === turn) return { version: record.version, priorId: record.priorId }
      return { version: record.version + 1, priorId: record.lastId }
    }

    /** The per-deck record after the previous pptwise call. */
    function decksAfter(previous) {
      if (!previous) return {}
      var base = (previous.state && previous.state.decks) || {}
      var matches = previous.matches || []
      var info = artifactInfo(matches)
      if (info.kind !== 'deck' || !info.id) return base
      var key = deckKey(info.target)
      var turn = turnOf(startOf(matches))
      var placed = placeVersion(base[key], turn)
      var next = Object.assign({}, base)
      next[key] = { turn: turn, version: placed.version, priorId: placed.priorId, lastId: info.id }
      return next
    }

    var artifactDefinition = {
      kind: ARTIFACT_KIND,
      target: 'chat',
      match: artifactMatch,
      start: function (_context, _match, reader) {
        var previous = reader && typeof reader.previous === 'function' ? reader.previous(ARTIFACT_KIND) : undefined
        return { decks: decksAfter(previous) }
      },
      update: function (context) {
        return context.state
      },
      buildViewNode: function (context) {
        var start = context.start || context.matches[0]
        if (!start) return null
        var info = artifactInfo(context.matches)
        if (!info.id || !info.kind) return null
        var decks = (context.state && context.state.decks) || {}
        var placed = info.kind === 'deck' ? placeVersion(decks[deckKey(info.target)], turnOf(start)) : { version: 1, priorId: null }
        return {
          key: context.key,
          kind: ARTIFACT_KIND,
          id: context.id,
          target: 'chat',
          anchorSeq: start.event.seq,
          location: start.location,
          visibility: 'hidden',
          data: {
            callId: context.id,
            tool: info.name,
            kind: info.kind,
            id: info.id,
            target: info.target,
            version: placed.version,
            priorId: placed.priorId,
          },
        }
      },
    }

    // WHERE FULL SCREEN OPENS. A tab type of DSH's right sidebar claims
    // `dsh-resource://pptwise/...` addresses (`registerViewer`). The address
    // names what the pane shows, and the navigation params carry the page to
    // open on, so clicking page 5 in the chat lands on page 5 even when the
    // deck's tab is already open.
    var VIEWER_ID = '@liustack/pptwise:viewer'
    var VIEWER_KIND = 'pptwise'
    var PANE_PREFIX = 'dsh-resource://pptwise/'

    /** The address of the pane a target names: `{ view, id, priorId? }`. */
    function paneAddress(target) {
      if (target.view === 'compare') return PANE_PREFIX + 'compare/' + target.id + '/' + target.priorId
      return PANE_PREFIX + (target.view === 'themes' ? 'themes/' : 'deck/') + target.id
    }

    /** The target an address names, or null for one that is not a pane of ours. */
    function parsePaneAddress(address) {
      var m = /^dsh-resource:\/\/pptwise\/(deck|themes)\/([A-Za-z0-9-]+)$/.exec(String(address || ''))
      if (m) return { view: m[1], id: m[2] }
      m = /^dsh-resource:\/\/pptwise\/compare\/([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)$/.exec(String(address || ''))
      return m ? { view: 'compare', id: m[1], priorId: m[2] } : null
    }

    /**
     * The sidebar, once `registerViewer` has found it: `open(target)` and
     * `editPage(n)`. Null in a shell without it, where a card falls back to
     * its own layer.
     */
    var viewerHost = null

    /** Open a pane in DSH's sidebar. False when there is no sidebar to open it in. */
    function openInSidebar(target) {
      return viewerHost !== null && viewerHost.open(target)
    }

    /** Whether a card can start a message in the composer of the session on screen. */
    function canDraft() {
      return viewerHost !== null && typeof viewerHost.draft === 'function'
    }

    function PreviewCard(react, reactDom, ui) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect

      // THE LOOK. Every card, and every full-screen pane, takes its whole
      // appearance from DSH's own design variables, so it sits in the chat
      // like the cards DSH ships and follows DSH's light and dark themes with
      // no switch of its own. The geometry is the present card's
      // (`ui-deliverables`): a filled header with a 40px icon tile, a 13px
      // title over a 10px tertiary line, hairline `border-l1` edges, the
      // `radius-lg` corner. Buttons, tags and icons are DSH's own, from
      // `@deepseek-ai/dsh-client-ui-primitives`, when the shell's module table
      // has it (`ui`). Their CSS-module class names are hashed per build, so
      // nothing here can reuse them: the stand-ins below repeat the same
      // tokens for a shell without the module, and the sheet styles only the
      // layout around them. The slides keep their own colours, which are the
      // deck's theme and not the harness's.
      var STYLE_ID = 'pptwise-dsh-style'
      var FOCUS_RING = '0 0 0 var(--dsw-focus-ring-width, 2px) var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))'
      var CSS = [
        '.pw-card,.pw-pane{--pw-fill:var(--dsw-static-neutral-50);--pw-hover:var(--dsw-static-neutral-100)}',
        'body[data-ds-dark-theme] .pw-card,body[data-ds-dark-theme] .pw-pane{--pw-fill:var(--dsw-static-neutral-850);--pw-hover:var(--dsw-static-neutral-800)}',
        '.pw-card{box-sizing:border-box;display:flex;flex-direction:column;min-width:0;margin:4px 0 6px;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}',
        '.pw-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;box-sizing:border-box;min-height:60px;padding:8px 10px;background:var(--pw-fill)}',
        '.pw-icon{display:grid;flex:none;place-items:center;box-sizing:border-box;width:40px;height:40px;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l1);border-radius:10px;background:color-mix(in srgb,var(--dsw-static-neutral-00) 50%,transparent);color:var(--dsw-alias-link)}',
        'body[data-ds-dark-theme] .pw-icon{background:color-mix(in srgb,var(--dsw-static-neutral-00) 5%,transparent)}',
        '.pw-icon-letter{font-size:13px;font-weight:600}',
        '.pw-titles{display:flex;flex:1 1 180px;flex-direction:column;justify-content:center;gap:2px;min-width:0}',
        '.pw-title{overflow:hidden;font-size:13px;font-weight:500;line-height:20px;text-overflow:ellipsis;white-space:nowrap}',
        '.pw-meta{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;min-width:0;font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
        '.pw-actions{display:inline-flex;flex:0 1 auto;flex-wrap:wrap;align-items:center;gap:6px;max-width:100%;min-width:0;margin-left:auto}',
        '.pw-note{padding:8px 10px 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
        '.pw-unavail{display:flex;align-items:center;gap:10px;padding:10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
        '.pw-strip{display:flex;gap:10px;overflow-x:auto;padding:10px;border-top:0.5px solid var(--dsw-alias-border-l1)}',
        '.pw-tile{display:flex;flex:0 0 auto;flex-direction:column;gap:4px;width:132px;min-width:0}',
        '.pw-tile-desk{width:160px}',
        '.pw-alts{border-top:0.5px solid var(--dsw-alias-border-l1)}',
        '.pw-alts-head{padding:8px 10px 0;font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
        '.pw-alts .pw-strip{border-top:0;padding-top:6px}',
        '.pw-alts .pw-thumb[role=button]{cursor:pointer}',
        '.pw-shot{position:relative}',
        '.pw-thumb{position:relative;box-sizing:border-box;width:100%;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--pw-fill);transition:border-color 120ms ease}',
        '.pw-thumb[role=button]{cursor:zoom-in}',
        '.pw-thumb[role=button]:hover{border-color:var(--dsw-alias-border-l4)}',
        '.pw-thumb:focus-visible{outline:none;box-shadow:' + FOCUS_RING + '}',
        '.pw-thumb img{position:absolute;inset:0;display:block;width:100%;height:100%}',
        '.pw-cap{display:flex;align-items:center;gap:6px;min-width:0;height:18px;overflow:hidden;font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
        '.pw-cap>*{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
        '.pw-cap>:first-child{flex:none}',
        '.pw-theme-id{color:var(--dsw-alias-label-primary);font-weight:500}',
        '.pw-num{display:inline-grid;place-items:center;box-sizing:border-box;min-width:18px;height:18px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}',
        '.pw-edit{position:absolute;right:6px;bottom:6px;box-sizing:border-box;max-width:calc(100% - 12px);height:22px;padding:0 8px;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;line-height:20px;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;opacity:0;pointer-events:none;transition:opacity 120ms ease}',
        '.pw-shot:hover .pw-edit,.pw-shot:focus-within .pw-edit{opacity:1;pointer-events:auto}',
        '.pw-edit:hover{background:var(--pw-hover)}',
        '.pw-edit:focus-visible{outline:none;box-shadow:' + FOCUS_RING + '}',
        '@media (hover:none){.pw-edit{opacity:1;pointer-events:auto}}',
        // One type column for the whole list, as wide as its longest label
        // ("Content" is wider than two Chinese characters), so every heading
        // starts at the same place in every language.
        '.pw-rows{display:grid;grid-template-columns:22px max-content minmax(0,1fr);column-gap:8px;margin:0;padding:0;list-style:none;border-top:0.5px solid var(--dsw-alias-border-l1)}',
        '.pw-row{grid-column:1/-1;display:grid;grid-template-columns:subgrid;align-items:baseline;padding:7px 12px 7px 10px;font-size:13px;line-height:20px}',
        '.pw-row+.pw-row{border-top:0.5px solid var(--dsw-alias-border-l1)}',
        '.pw-row-n{color:var(--dsw-alias-label-tertiary);text-align:right;font-variant-numeric:tabular-nums}',
        '.pw-row-type{color:var(--dsw-alias-label-tertiary);font-size:12px}',
        '.pw-row-text{min-width:0}',
        '.pw-row-h{font-weight:500}',
        '.pw-row-s{margin-left:8px;color:var(--dsw-alias-label-secondary)}',
        '.pw-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}',
        '.pw-btn[data-variant=outline]{border:0.5px solid var(--dsw-alias-border-l3)}',
        '.pw-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
        '.pw-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}',
        '.pw-btn:disabled{cursor:not-allowed;opacity:0.4}',
        '.pw-btn-icon{display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center}',
        '.pw-tag{display:inline-flex;align-items:center;border-radius:999px;padding:1px 8px;font-size:11px;line-height:17px;font-weight:500;white-space:nowrap}',
        '.pw-tag[data-tone=outline]{border:0.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-tertiary)}',
        '.pw-tag[data-tone=neutral]{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}',
        '.pw-tag[data-tone=success]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}',
        '.pw-tag[data-tone=info]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-state-business-primary)}',
        '.pw-tag[data-tone=warning]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);color:var(--dsw-alias-state-warn-primary)}',
        '.pw-tag[data-tone=danger]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}',
        '.pw-pane{box-sizing:border-box;display:flex;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);outline:none}',
        '.pw-pane-bar{display:flex;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:4px 10px;box-sizing:border-box;min-height:38px;padding:4px 6px 4px 12px;border-bottom:0.5px solid var(--dsw-alias-border-l3)}',
        '.pw-pane-title{flex:1 1 120px;min-width:0;overflow:hidden;font-size:13px;font-weight:500;line-height:20px;text-overflow:ellipsis;white-space:nowrap}',
        '.pw-counter{flex:none;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
        '.pw-pane-bar .pw-actions{gap:2px}',
        '.pw-pane-bar>.pw-counter:last-child{margin-right:6px}',
        '.pw-stage{position:relative;display:flex;flex:1 1 auto;align-items:center;justify-content:center;min-height:0;padding:16px;overflow:hidden;background:var(--pw-fill)}',
        '.pw-slide{display:block;max-width:100%;max-height:100%;border-radius:var(--dsw-radius-sm);box-shadow:0 0 0 0.5px var(--dsw-alias-border-l2);user-select:none}',
        '.pw-zone{position:absolute;top:0;bottom:0;z-index:1;display:flex;align-items:center;box-sizing:border-box;width:max(56px,16%);padding:0 10px;border:0;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}',
        '.pw-zone[data-side=prev]{left:0;justify-content:flex-start}',
        '.pw-zone[data-side=next]{right:0;justify-content:flex-end}',
        '.pw-zone:disabled{cursor:default}',
        '.pw-zone:disabled .pw-zone-knob{visibility:hidden}',
        '.pw-zone-knob{display:grid;place-items:center;width:32px;height:32px;border-radius:999px;background:var(--dsw-alias-button-floating-fill,var(--dsw-alias-bg-layer-3));box-shadow:var(--dsw-shadow-lv2,0 1px 4px rgba(0,0,0,.12));font-size:18px;opacity:0;transition:opacity 120ms ease}',
        '.pw-stage:hover .pw-zone-knob,.pw-zone:focus-visible .pw-zone-knob{opacity:1}',
        '.pw-zone:hover .pw-zone-knob{background:var(--dsw-alias-button-floating-hover,var(--pw-hover))}',
        '.pw-zone:focus-visible{outline:none}',
        '.pw-zone:focus-visible .pw-zone-knob{box-shadow:' + FOCUS_RING + '}',
        '@media (hover:none){.pw-zone-knob{opacity:1}}',
        '.pw-vstrip{display:flex;flex:0 0 auto;gap:8px;overflow-x:auto;padding:10px 12px;border-top:0.5px solid var(--dsw-alias-border-l3)}',
        '.pw-vthumb{position:relative;flex:0 0 auto;box-sizing:border-box;width:96px;aspect-ratio:16/9;padding:0;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--pw-fill);cursor:pointer}',
        '.pw-vthumb img{display:block;width:100%;height:100%;object-fit:contain}',
        '.pw-vthumb:hover{border-color:var(--dsw-alias-border-l4)}',
        '.pw-vthumb[aria-current=true]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}',
        '.pw-vthumb:focus-visible{outline:none;box-shadow:' + FOCUS_RING + '}',
        '.pw-vthumb-n{position:absolute;left:4px;bottom:3px;padding:0 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:14px}',
        '.pw-wall{display:grid;flex:1 1 auto;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));align-content:start;gap:16px;min-height:0;overflow:auto;padding:16px}',
        '.pw-wall-col{display:flex;flex-direction:column;gap:6px;min-width:0}',
        '.pw-compare{display:flex;flex:1 1 auto;flex-direction:column;gap:16px;min-height:0;overflow:auto;padding:12px 16px 16px}',
        '.pw-compare-row{display:flex;flex-direction:column;gap:6px}',
        '.pw-compare-label{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500}',
        '.pw-compare-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}',
        '.pw-compare-head{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
        '.pw-compare-img{display:block;box-sizing:border-box;width:100%;border:0.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--pw-fill)}',
        '.pw-compare-empty{display:grid;place-items:center;box-sizing:border-box;border:0.5px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-tertiary);font-size:12px}',
        '.pw-layer{position:fixed;inset:0;z-index:9999;display:flex;box-sizing:border-box;padding:24px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent)}',
        '.pw-layer-panel{display:flex;flex:1 1 auto;min-width:0;overflow:hidden;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl);box-shadow:var(--dsw-shadow-lv3,0 8px 32px rgba(0,0,0,.18))}',
        '.pw-tab-icon{display:inline-flex;margin-right:6px;vertical-align:-3px}',
      ].join('\n')

      function ensureStyles() {
        if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
        var el = document.createElement('style')
        el.id = STYLE_ID
        el.textContent = CSS
        document.head.appendChild(el)
      }
      ensureStyles()

      /** One of DSH's icons by its export name, at 14px, or nothing in a shell without them. */
      function iconNode(name, size) {
        return ui && typeof ui[name] === 'function' ? h(ui[name], { size: size || 14 }) : null
      }

      /** What sits in a card's icon tile: DSH's file glyph for a deck, its own icons for the others. */
      function fileIcon(kind, size) {
        if (kind === 'deck' && ui && typeof ui.FileTypeIcon === 'function') return h(ui.FileTypeIcon, { kind: 'ppt', size: size || 24 })
        var name = kind === 'outline' ? 'IconChecklistOutlineRegular' : kind === 'themes' ? 'IconPersonalizationOutlineRegular' : 'IconDeliverDocRegular'
        return iconNode(name, size || 20) || h('span', { className: 'pw-icon-letter' }, kind === 'outline' ? '≡' : 'P')
      }

      /** DSH's `Button` (small), or a stand-in wearing the same tokens. `icon` names one of DSH's icons. */
      function Btn(props) {
        var rest = {}
        for (var key in props) {
          if (key !== 'variant' && key !== 'icon' && key !== 'children') rest[key] = props[key]
        }
        var variant = props.variant || 'outline'
        var icon = props.icon ? iconNode(props.icon) : null
        if (ui && ui.Button) return h(ui.Button, Object.assign(rest, { variant: variant, size: 'sm', icon: icon }), props.children)
        return h(
          'button',
          Object.assign({ type: 'button' }, rest, { className: 'pw-btn' + (rest.className ? ' ' + rest.className : ''), 'data-variant': variant }),
          icon ? h('span', { className: 'pw-btn-icon' }, icon) : null,
          props.children,
        )
      }

      /** DSH's `Tag`, or a stand-in with the same tones. */
      function Badge(props) {
        if (ui && ui.Tag) return h(ui.Tag, { tone: props.tone }, props.children)
        return h('span', { className: 'pw-tag', 'data-tone': props.tone }, props.children)
      }

      /** A list of nodes as children, without the holes the optional ones leave. */
      function kids(list) {
        return (list || []).filter(function (node) {
          return node !== null && node !== undefined && node !== false
        })
      }

      /** A card's header, the way the present card lays one out: icon tile, title over one quiet line, actions. */
      function CardHead(props) {
        var meta = kids(props.meta)
        var actions = kids(props.actions)
        return h(
          'div',
          { className: 'pw-head' },
          h('span', { className: 'pw-icon', 'aria-hidden': true }, fileIcon(props.icon)),
          h(
            'div',
            { className: 'pw-titles' },
            h('div', { className: 'pw-title', title: props.title }, props.title),
            meta.length > 0 ? h('div', { className: 'pw-meta' }, meta) : null,
          ),
          actions.length > 0 ? h('div', { className: 'pw-actions' }, actions) : null,
        )
      }

      /** Enter and Space on a focused `role="button"` element, the keyboard a real button would have had. */
      function activateOn(onClick) {
        if (!onClick) return undefined
        return function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }
      }

      /** One slide, mounted as real SVG so it scales with its box. */
      function Slide(props) {
        var ref = react.useRef(null)
        useEffect(
          function () {
            var el = ref.current
            if (!el) return
            el.innerHTML = namespaceIds(props.svg, props.prefix)
            var svg = el.querySelector('svg')
            if (svg) {
              svg.setAttribute('width', '100%')
              svg.setAttribute('height', '100%')
              svg.style.display = 'block'
            }
          },
          [props.svg, props.prefix],
        )
        return h('div', {
          ref: ref,
          style: { position: 'absolute', inset: 0 },
        })
      }

      /** One thumbnail: a 16:9 box holding the slide, clickable into the viewer. */
      function Frame(props) {
        return h(
          'div',
          {
            className: 'pw-thumb',
            style: { aspectRatio: (props.width || 1280) + ' / ' + (props.height || 720) },
            onClick: props.onClick,
            role: props.onClick ? 'button' : undefined,
            tabIndex: props.onClick ? 0 : undefined,
            onKeyDown: activateOn(props.onClick),
            title: props.title,
          },
          h(Slide, { svg: props.page.svg, prefix: props.prefix }),
        )
      }

      /**
       * Mount a full-screen layer on `document.body`, outside the card.
       *
       * `position: fixed` alone does not escape an ancestor that clips. From
       * DSH 0.1.7 the card sits inside a collapsible work group whose body has
       * a `max-height`, scrolls, and paints a `mask-image` fade while it
       * scrolls, and a mask crops fixed descendants along with everything
       * else. The viewer opened as a 680x400 window inside the chat column. A
       * portal moves the layer's DOM to the body, where nothing clips it, while
       * React keeps it in this card's tree, so its state and events stay here.
       *
       * `react-dom` comes from the shell's module table, as `react` does (the
       * shipped Tooltip portals to `document.body` the same way). A shell
       * whose table has no `createPortal` gets the layer in place, which is
       * what every build before the work group drew correctly.
       */
      function inBody(node) {
        if (reactDom && typeof reactDom.createPortal === 'function') {
          return reactDom.createPortal(node, document.body)
        }
        return node
      }

      /**
       * The full-screen pane where DSH has no right sidebar to put it in: a
       * layer over the page, on the body (`inBody`), closed by a click on the
       * surround, by the pane's own Close, or by Esc inside the pane.
       */
      function Layer(props) {
        return inBody(
          h(
            'div',
            {
              className: 'pw-layer',
              'data-pptwise-layer': '',
              onClick: function (e) {
                if (e.target === e.currentTarget) props.onClose()
              },
            },
            h('div', { className: 'pw-layer-panel' }, props.children),
          ),
        )
      }

      /**
       * The export.
       *
       * Fetched and saved by hand rather than left to a plain `download`
       * anchor. A preview id can genuinely stop resolving — the user is free
       * to delete what it names — and on a bare anchor that failure arrives as
       * a 404 body the browser saves as a file, which is how the first version
       * handed people a `pptx.json` and called it a download. Going through
       * fetch means a failure can say so.
       *
       * The states are the verdicts, plus `busy` and `failed`. Anything final
       * (`gone`, `damaged`, `refused`) disables the button and says which;
       * `failed` is this attempt not working and leaves it clickable. Before
       * that split, one dropped request turned a live export into a dead button
       * for the rest of the session.
       *
       * This component owns no state. It reads `props.status` and reports
       * through `props.onStatus(next, order)`, both of which belong to the
       * card's store — see THE STORE for why a component keeping "just a
       * little" of its own is how this went wrong twice. The `order` it passes
       * back is one ticket for the whole attempt, in the download lane. Two
       * clicks can still answer out of order, of course. What the ticket buys
       * is that the older answer is the one discarded, and that an answer about
       * the deck cannot discard this one.
       */
      function ExportButton(props) {
        // `props.verdict` is the card telling this button what it already
        // learned from the route. Before it, the only way to find out was to
        // click and wait for the fetch to fail, so a card that knew perfectly
        // well the export was dead still offered it as `Download .pptx`.
        var status = isFinal(props.verdict) ? props.verdict : props.status
        var setStatus = props.onStatus

        function save() {
          if (status === 'busy' || isFinal(status)) return
          // One ticket for this whole attempt, in its own lane. Two clicks race
          // the same way two Opens do, and the download lane is separate from
          // the deck lane so a slow export cannot make a fresh verdict look
          // stale — or the reverse.
          var order = { lane: 'download', ticket: nextTicket() }
          setStatus('busy', order)
          fetch('/pptwise/preview/' + props.previewId + '/pptx')
            .then(function (res) {
              return verdictOf(res).then(function (verdict) {
                if (verdict !== 'alive') {
                  var error = new Error('preview route answered ' + (res ? res.status : 'nothing'))
                  error.verdict = verdict
                  throw error
                }
                return res.blob()
              })
            })
            .then(function (blob) {
              // Look at the bytes before saving them. A 200 whose body is a
              // login page, a proxy notice or an error document is exactly how
              // the first version of this button handed people a `pptx.json`
              // and called it a download — the status line said fine and the
              // content was not a deck. A .pptx is a zip, so its first four
              // bytes are the only claim worth checking.
              return isZip(blob).then(function (ok) {
                if (!ok) {
                  var error = new Error('the preview route returned something that is not a .pptx')
                  error.verdict = UNREACHABLE_VERDICT
                  throw error
                }
                return blob
              })
            })
            .then(function (blob) {
              var url = URL.createObjectURL(blob)
              var a = document.createElement('a')
              a.href = url
              // Matches the name the host half gave the file it is serving
              // (`exportName`, preview-tool.js): a deck with unfilled pages
              // must not be saved under a name that reads as finished work.
              // The title is the deck's `filename`, often written with its
              // extension already, which used to save `deck.pptx.pptx`.
              var stem = (props.name || 'deck').replace(/\.pptx$/i, '') || 'deck'
              a.download = stem + (props.draft ? '-draft' : '') + '.pptx'
              document.body.appendChild(a)
              a.click()
              a.remove()
              setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
              setStatus('idle', order)
            })
            .catch(function (error) {
              // A rejection carrying no verdict is not the route speaking: the
              // request never landed, or it landed and reading the body failed
              // halfway. Neither says anything final about the deck. Only the
              // route's own answers do — and `refused` counts among them, since
              // clicking again sends the identical request to the same closed
              // door. Folding 401/403 into `failed` offered a retry that could
              // only fail again, under a sentence about the network.
              var verdict = error && error.verdict
              setStatus(isFinal(verdict) ? verdict : 'failed', order)
            })
        }

        return h(
          Btn,
          {
            onClick: save,
            variant: props.variant || 'outline',
            icon: 'IconDownloadOutlineRegular',
            title: isFinal(status)
              ? hintFor(status)
              : status === 'failed'
                ? UNREACHABLE_HINT
                : props.draft
                  ? 'Download the editable .pptx. It is a draft: some pages are still unfilled placeholders'
                  : 'Download the editable .pptx',
          },
          status === 'busy'
            ? t('card.saving')
            : isFinal(status)
              ? t('card.export.' + status)
              : status === 'failed'
                ? t('card.retryDownload')
                : props.label || t('desk.download'),
        )
      }

      /**
       * The missing card's own line, under the header.
       *
       * Said out loud rather than left to a tooltip: the whole complaint this
       * exists to answer is a card that told the user nothing at all.
       */
      function VerdictNote(props) {
        return h('div', { className: 'pw-note' }, hintFor(props.verdict))
      }

      /**
       * The tag that marks a deck the route will not serve, and says which
       * kind of "will not".
       *
       * It used to read `gone` whatever had happened, which is how a damaged
       * `record.json` reached the user as a deletion. The word comes from the
       * verdict now, and the verdict comes from a code the route sends.
       */
      function VerdictBadge(props) {
        return h(
          'span',
          { title: hintFor(props.verdict) },
          h(Badge, { tone: props.verdict === 'refused' ? 'warning' : 'danger' }, t('badge.' + badgeFor(props.verdict))),
        )
      }

      // THE STORE.
      //
      // Seven review rounds produced seven defects of one shape: state that
      // could not say which preview it was about, or a write that landed on the
      // wrong one. Three of those were introduced by the fix for the previous
      // one. What is left is one entry and one number, and this note describes
      // only what the code in front of you does.
      //
      // ONE ENTRY. The card draws one deck at a time, so the store holds one
      // deck's state, stamped with the preview id it belongs to. A render reads
      // it only while that stamp matches the deck it is drawing (`mine`);
      // otherwise it reads `UNASKED` and the deck that has scrolled past lends
      // nothing to the one that replaced it — not its verdict, not its open
      // viewer, not its download status. Arriving at a deck replaces the entry
      // outright rather than adjusting the one already there, which is what
      // makes that true of every field at once instead of field by field.
      //
      // ONE NUMBER. A monotonic counter hands out a ticket per request, and one
      // per arrival. An entry starts life holding its arrival's ticket as the
      // high-water mark of both lanes, and a write is accepted only if its
      // ticket is at least the mark of the lane it names. That single
      // comparison does two jobs:
      //
      //  - within one stay, an older answer cannot overwrite a newer one. Two
      //    clicks on Open used to race last-writer-wins: the second request
      //    answered 410 and settled the card, then the first answered 200 and
      //    un-settled it, reopening a viewer for a deck the route had just
      //    disowned. "Last to arrive" and "most recent" are not the same thing,
      //    and only one of them is a fact about the deck.
      //
      //  - across stays, an answer from a stay the card has left is refused by
      //    the same line, because the current entry's mark was taken when the
      //    card arrived — which is after that request went out. This is why
      //    there is no second stamp to compare. An earlier version addressed
      //    entries by `{ id, visit }` and matched the visit exactly, and it had
      //    to: a new entry started both lanes at zero, so a departed stay's
      //    ticket was the higher number and won. Seeding the marks from the
      //    arrival inverts that. The danger did not go away, the arithmetic
      //    turned round — leave the seed at zero and a viewer opens by itself
      //    over a deck the user has only just come back to.
      //
      // Two lanes, deck and download, each with a mark of its own, so a slow
      // export cannot make a fresh verdict look stale, or the reverse.
      //
      // Nothing is written during a render — not the store, and not the counter
      // below. The store is *read* during one, in `deck`, which is ordinary
      // React. What this file must not do is let a render decide or remember
      // anything, which is how the ref-based version broke under a render that
      // was thrown away. Nothing is captured from a render either: a request
      // takes its ticket when it is sent, and what it is measured against is
      // whatever the store holds when it answers.
      //
      // `useLayoutEffect` rather than `useEffect` for the maintenance, and the
      // reason is narrow: it puts the entry in place during the commit that
      // paints the buttons, so there is no frame in which a click could land on
      // a deck that has nowhere to write its answer. It is not load-bearing for
      // ordering — the fetch effect waits for the entry through its dependency
      // list rather than through hook order, so a passive spelling declared
      // anywhere fetches just the same. That was measured, not reasoned: with
      // `maintainStore` rewritten as a passive effect and moved below the fetch
      // effect, all 189 tests across this plugin's two suites stay green. A
      // structural test could tell the two spellings apart. No behaviour test
      // in this suite does.
      //
      // What this does NOT do, stated because overclaiming here has itself been
      // a recurring defect:
      //
      //  - it does not stop a request that has been left behind from finishing.
      //    A download started on a previous visit still saves its file, because
      //    the user did ask for it; what it cannot do is report back.
      //  - it cannot stop a component from keeping state of its own and going
      //    around the store. See the tripwire test for what is and is not
      //    caught, and `.issues/…/design.md` §5.12 for the list of shapes that
      //    are known to slip past it.
      //  - the id stamp is not something a behaviour test in this suite can
      //    see, and that half was measured: drop it from the read and all 189
      //    tests stay green (round 9, K1). `maintainStore` is a layout effect,
      //    so the render that pairs the old entry with the new id is replaced
      //    before the browser paints and before any assertion runs. It is kept
      //    for what that render would do on the way past — mount the viewer's
      //    iframe against the new deck's URL on the strength of the old deck's
      //    open flag, and send the bundle request while the old entry still
      //    holds the marks it would be measured against. That half is read off
      //    React's commit order, not off a failing test, and it is free: the
      //    same comparison is already there for the fetch effect to wait on.
      //
      // `AbortController` was considered and left out: cancelling still leaves
      // an abort rejection to handle, so it moves a check rather than removing
      // one, and adds a second thing to keep in sync.

      /**
       * What a preview is, to this card, before anything has been asked about
       * it — and what a render reads for a deck whose entry is not in place
       * yet. `id` is null because that is precisely what makes it nobody's.
       */
      var UNASKED = {
        id: null,
        bundle: null,
        verdict: null,
        viewerOpen: false,
        viewerPage: 1,
        download: 'idle',
        attempt: 0,
        seen: { deck: 0, download: 0 },
      }

      /**
       * A brand new entry for a deck this card has just arrived at.
       *
       * Both lanes start at the arrival's own ticket, which is the whole of how
       * a request from an earlier stay is turned away: it took a smaller number
       * before this arrival took its own.
       */
      function arrivalAt(id, ticket) {
        return Object.assign({}, UNASKED, { id: id, seen: { deck: ticket, download: ticket } })
      }

      /**
       * The card's monotonic counter: one number per request, and one per
       * arrival.
       *
       * It lives in this factory's closure, so every card the plugin renders
       * draws from the same sequence — which is more than the store needs (each
       * card's numbers are only ever compared with its own) and keeps it out of
       * component state, and therefore out of the render.
       *
       * Arrivals draw from the same sequence as requests on purpose, and it is
       * not a convenience: an arrival's number has to be comparable with the
       * tickets of requests already in flight, or it could not outrank them.
       */
      var lastTicket = 0
      function nextTicket() {
        lastTicket += 1
        return lastTicket
      }

      /** The card itself: a strip of thumbnails, and a button that opens the viewer. */
      function PptwisePreviewCard(props) {
        var direct = bundleOf(props.block)
        var previewId = previewIdOf(props.block)
        var pageCount = pageCountOf(props.block)

        // One entry, stamped with the deck it belongs to — see THE STORE.
        var store = useState(UNASKED)

        /**
         * Keep the entry pointed at the deck this card is showing.
         *
         * The only place an entry is replaced. Runs on commit, so a render
         * React threw away changes nothing.
         *
         * Arriving at a deck builds a NEW entry, always, even for an id this
         * card was showing a moment ago. That is the point: the previous stay
         * and this one are two different recipients, so the requests still in
         * flight from the previous one have a number to be turned away by (see
         * `arrivalAt`). Nothing is carried over — carrying the download status
         * alone was enough, once, to label a live deck's export `Unavailable`
         * on the strength of the previous deck's 410.
         *
         * The store is left strictly alone when it already holds this deck, so
         * a second run of this effect cannot replace a live entry. The number
         * is taken outside the updater because React may run an updater more
         * than once, and this one has to stay a plain function of `entry`.
         */
        function maintainStore() {
          var arrival = nextTicket()
          store[1](function (entry) {
            return entry.id === previewId ? entry : arrivalAt(previewId, arrival)
          })
        }
        react.useLayoutEffect(maintainStore, [previewId])

        /**
         * The only way an asynchronous result changes anything.
         *
         * `order` is `{ lane, ticket }`: which sequence this write belongs to,
         * and where in it. UI actions that are their own newest intent take a
         * fresh ticket, and the two lanes are independent.
         *
         * One refusal, doing two jobs — see THE STORE. An older ticket never
         * overwrites a newer one in the same lane, and an answer from a stay
         * this card has left is older than the arrival that replaced it.
         */
        function commit(change, order) {
          store[1](function (entry) {
            if (order.ticket < entry.seen[order.lane]) return entry
            var seen = Object.assign({}, entry.seen)
            seen[order.lane] = order.ticket
            return Object.assign({}, entry, change, { seen: seen })
          })
        }

        // Read side: this preview's own entry, or the state of a preview
        // nobody has asked about yet. Derived from props, so a render decides
        // nothing and remembers nothing. `mine` is also what the fetch effect
        // waits on: until the entry is this deck's, a request sent from here
        // would be measured against the previous deck's marks.
        var mine = previewId !== null && store[0].id === previewId
        var deck = mine ? store[0] : UNASKED
        var verdict = deck.verdict
        // Every way this deck will not open, under one name. `gone` used to
        // stand in for all of them, which is why a damaged preview and a
        // refused request both told the user their deck had been deleted.
        var settled = isFinal(verdict)

        // A bundle a saved session already carries (see `bundleOf`); otherwise
        // fetch it by id from the plugin's own route, which is how every card
        // the current host half produces gets its deck, in both modes.
        useEffect(
          function () {
            // `!mine` is the render between arriving at a deck and
            // `maintainStore` putting its entry in place. A request sent from
            // there would be ordered against the *previous* deck's marks, and
            // the entry it wrote into would be thrown away a moment later — so
            // it waits, and `mine` is in the dependency list below, which is
            // what brings it back the moment there is somewhere to write to.
            if (direct || !mine || deck.bundle) return
            var order = { lane: 'deck', ticket: nextTicket() }
            fetch(previewBundleUrl(previewId))
              .then(function (r) {
                // A 404 or 410 is an answer, not a failure to get one: the
                // harness is there and it has never heard of this deck, or
                // has and cannot serve what is left of it. Swallowing that is
                // what made a whole card — thumbnails, Open, Download —
                // disappear out of a reopened transcript without a word.
                // Anything else this records as `unreachable`, which the card
                // reads as "no verdict yet" rather than as a dead deck.
                return verdictOf(r).then(function (answer) {
                  if (answer !== 'alive') {
                    commit({ verdict: answer }, order)
                    return null
                  }
                  return r.json()
                })
              })
              .then(function (b) {
                if (!b) return
                commit({ bundle: b, verdict: 'alive' }, order)
              })
              .catch(function () {
                // Not a verdict: the request never landed, or it landed and the
                // body would not parse. Either way that is a fact about this
                // attempt and not about the deck, and reporting it as a missing
                // preview would outlive its cause. The generic row is the
                // degrade, and every later click — Open, Download — asks the
                // route again from scratch.
                commit({ verdict: UNREACHABLE_VERDICT }, order)
              })
          },
          [direct, previewId, mine, deck.bundle, deck.attempt],
        )

        var bundle = direct || deck.bundle

        /**
         * Ask before opening, every time.
         *
         * The bundle a card is drawing came from one request, and the viewer
         * is a second one made minutes or days later — a browser tab left open
         * across a harness restart is enough to put a whole deck's lifetime
         * between them. Opening on the strength of the first request is how
         * the viewer landed on `{"error":"unknown preview id"}` rendered as a
         * document, framed by this card's own Close button. The check is one
         * loopback request against the route the iframe is about to hit
         * anyway, and it doubles as a refresh of the strip.
         *
         * The ticket is taken here, when the click happens, and it is the only
         * thing this request carries — see THE STORE. No write asks "is this
         * still current": arriving anywhere else, including back at this same
         * deck, takes a higher number, so an answer to a click the user walked
         * away from lands nowhere. Both halves of that have been a defect here.
         * First the wrong deck: click Open on A, let the card move to B while
         * A's request is in flight, and A's success opened the viewer — pointed
         * at B, which had been asked nothing at all. Then the wrong time: go
         * A → B → A, and A's first-stay success opened a viewer over the deck
         * the user had only just come back to.
         */
        function openViewer(page) {
          if (!previewId || settled) return
          var startAt = page > 1 ? page : 1
          // Two clicks on Open are two requests, and the one that answers
          // second is not necessarily the newer one. The ticket is what stops
          // an older 200 from undoing a newer 410 and reopening the viewer on
          // a deck the route has just disowned.
          var order = { lane: 'deck', ticket: nextTicket() }
          fetch(previewBundleUrl(previewId))
            .then(function (r) {
              return verdictOf(r).then(function (answer) {
                if (answer !== 'alive') {
                  // Recorded, and therefore said out loud: this is the click
                  // that used to do nothing visible at all when the route
                  // refused it, leaving the button in place and the user
                  // clicking it again. Every verdict now reaches the card.
                  commit({ verdict: answer }, order)
                  return null
                }
                return r.json()
              })
            })
            .then(function (b) {
              if (!b) return
              commit({ bundle: b, verdict: 'alive', viewerOpen: true, viewerPage: startAt }, order)
            })
            .catch(function () {
              // The modal stays shut either way, but only the route's own
              // verdict retires the deck. A click that never reached the
              // harness, or reached it and came back unreadable, leaves the
              // strip live and the button clickable, which is what makes trying
              // again the obvious next move rather than an impossible one.
              commit({ verdict: UNREACHABLE_VERDICT }, order)
            })
        }

        // With DSH's right sidebar, "open" means handing the deck to it: the
        // store's open flag is the decision (taken by `openViewer` under its
        // ticket, so every ordering rule above still holds), and this hands it
        // over once and lowers the flag again. Without the sidebar the flag
        // keeps the layer below on screen.
        var hosted = viewerHost !== null
        useEffect(
          function () {
            if (!deck.viewerOpen || !previewId || settled || !hosted) return
            openInSidebar({ view: 'deck', id: previewId, page: deck.viewerPage })
            commit({ viewerOpen: false, viewerPage: 1 }, { lane: 'deck', ticket: nextTicket() })
          },
          [deck.viewerOpen, deck.viewerPage, previewId, settled, hosted],
        )

        if (!bundle) {
          // Nothing to draw and nothing said about why: the card refusing to
          // invent a deck it does not have.
          if (verdict === null || verdict === 'alive') return null
          // Otherwise the tool did run, and the transcript still says how long
          // the deck was. That number survives a deleted preview on purpose:
          // the host half keeps no gravestone on disk, so the tool's own
          // summary line, still sitting in the log, is the only evidence this
          // card can still read that nine pages once existed here. A card that
          // vanishes instead is the one thing worse than a card reporting a
          // problem: the user is left doubting the deck was ever generated.
          //
          // The Retry button appears only for the one verdict a retry can
          // change. `refused` and the final verdicts get the same row without
          // it, because a button that re-sends an identical request to a door
          // that just closed is a promise the card cannot keep.
          return h(
            'div',
            { className: 'pw-card' },
            h(CardHead, {
              icon: 'deck',
              title: 'deck',
              meta: [
                settled ? h(VerdictBadge, { key: 'v', verdict: verdict }) : null,
                pageCount !== null ? h('span', { key: 'n' }, t('desk.pages', { n: pageCount })) : null,
              ],
              actions: [
                isRetryable(verdict)
                  ? h(
                      Btn,
                      {
                        key: 'retry',
                        onClick: function () {
                          commit({ attempt: deck.attempt + 1 }, { lane: 'deck', ticket: nextTicket() })
                        },
                        title: hintFor(verdict),
                      },
                      t('card.retry'),
                    )
                  : null,
              ],
            }),
            h(VerdictNote, { verdict: verdict }),
          )
        }

        var pages = viewablePages(bundle)
        if (pages.length === 0) return null

        var slide = bundle.slide || { width: 1280, height: 720 }
        var findingCount = bundle.pages.reduce(function (n, p) {
          return n + ((p.findings && p.findings.length) || 0)
        }, 0)
        // Only a build that needs revision says false: it drew the pages and
        // wrote no .pptx, so there is nothing for a download button to fetch.
        var exportable = bundle.exportable !== false

        return h(
          'div',
          { className: 'pw-card' },
          h(CardHead, {
            icon: 'deck',
            title: bundle.title || 'deck',
            meta: [
              // The deck is on screen and the route has already said it
              // cannot serve it any more. Both halves are true, and the
              // thumbnails are the half worth keeping — they are the deck,
              // not a picture of a button. What goes is the promise that
              // clicking them leads anywhere.
              settled ? h(VerdictBadge, { key: 'v', verdict: verdict }) : null,
              // The deck still has placeholder pages. The export goes out
              // anyway (see `--draft` in preview-tool.js's `execute`), so this
              // tag is what keeps that from being a silent substitution: the
              // user is looking at unfinished work and the file they save
              // says so too.
              bundle.draft
                ? h(
                    'span',
                    { key: 'draft', title: 'Some pages are still unfilled placeholders — the export is labelled a draft' },
                    h(Badge, { tone: 'warning' }, t('card.draft')),
                  )
                : null,
              exportable
                ? null
                : h(
                    'span',
                    { key: 'revise', title: 'This build needs revision, so it wrote no .pptx' },
                    h(Badge, { tone: 'warning' }, t('card.needsRevision')),
                  ),
              h('span', { key: 'n' }, t('desk.pages', { n: bundle.pages.length })),
              // Build by build, how far the writing has got: the pages still
              // standing as placeholders are the ones not written yet.
              bundle.draft
                ? h(
                    'span',
                    { key: 'w', 'data-written': '' },
                    t('desk.written', {
                      x: bundle.pages.filter(function (p) { return p.placeholder !== true }).length,
                      n: bundle.pages.length,
                    }),
                  )
                : null,
              findingCount > 0 ? h('span', { key: 'f' }, t('card.findings', { n: findingCount })) : null,
              // How many of the pages that can take one the theme's signature layouts drew.
              signatureMeta(bundle),
            ],
            actions: [
              // No viewer without an id, and none for an id the route has
              // already disowned: the full-size view is a route keyed by it.
              // A button that opened an empty frame would be worse than an
              // absent one, and the thumbnails below go inert for the same
              // reason.
              previewId && !settled
                ? h(Btn, { key: 'open', icon: 'IconBrowseOutlineRegular', onClick: function () { openViewer(1) } }, t('card.open'))
                : null,
              previewId && exportable
                ? h(ExportButton, {
                    key: 'pptx',
                    previewId: previewId,
                    name: bundle.title,
                    draft: bundle.draft,
                    verdict: verdict,
                    status: deck.download,
                    onStatus: function (next, order) { commit({ download: next }, order) },
                  })
                : null,
            ],
          }),
          h(
            'div',
            { className: 'pw-strip' },
            stripPages(pages).map(function (page, i) {
              return h(
                'div',
                { key: page.id || i, className: 'pw-tile' },
                h(Frame, {
                  page: page,
                  prefix: 'pft' + i + '-',
                  width: slide.width,
                  height: slide.height,
                  title: (page.type || 'page') + ' ' + pageNumberOf(page, i),
                  // Opens the viewer on this page. Clicking page 3 and
                  // landing on page 1 is the kind of small lie that makes a
                  // strip feel decorative.
                  onClick:
                    previewId && !settled
                      ? function () { openViewer(pageNumberOf(page, i)) }
                      : undefined,
                }),
              )
            }),
          ),
          h(Alternatives, { themes: bundle.alternatives, slide: slide }),
          settled ? h(VerdictNote, { verdict: verdict }) : null,
          // No id comparison here, and none needed: `deck` is this preview's own
          // entry or the unasked state, so a viewer left open on another deck
          // is not something this can read.
          deck.viewerOpen && previewId && !settled && !hosted
            ? h(
                Layer,
                {
                  onClose: function () {
                    commit({ viewerOpen: false, viewerPage: 1 }, { lane: 'deck', ticket: nextTicket() })
                  },
                },
                h(PaneBody, {
                  target: { view: 'deck', id: previewId, page: deck.viewerPage },
                  revision: 0,
                  closeButton: true,
                  onClose: function () {
                    commit({ viewerOpen: false, viewerPage: 1 }, { lane: 'deck', ticket: nextTicket() })
                  },
                }),
              )
            : null,
        )
      }

      /** What the theme card says once the route has said it cannot serve the wall. */
      function wallHintFor(verdict) {
        if (verdict === 'gone') {
          return 'This theme wall is no longer on disk where this session looks for it. Run pptwise_themes again to draw it.'
        }
        return hintFor(verdict)
      }

      /**
       * A theme's caption: the number the question panel's options start
       * with ("1 brief"), the model is told this order in the result, then
       * the theme's id and label.
       */
      function ThemeLabel(props) {
        var theme = props.theme
        return h(
          'div',
          { className: 'pw-cap pw-theme-cap', title: theme.label },
          h('span', { className: 'pw-num', 'data-theme-number': props.n }, String(props.n)),
          h('span', { className: 'pw-theme-id' }, theme.id),
          theme.label && theme.label !== theme.id ? h('span', null, theme.label) : null,
        )
      }

      /**
       * The deck's own pages in other themes, under a build's strip: one
       * numbered column per theme, the way the theme wall draws them. A click
       * starts the message that asks for that theme ("Switch to Clinic"), for
       * the user to send or change. Nothing without a composer to write in.
       */
      function Alternatives(props) {
        var themes = Array.isArray(props.themes) ? props.themes : []
        if (themes.length === 0) return null
        var slide = props.slide
        var drafting = canDraft()
        return h(
          'div',
          { className: 'pw-alts', 'data-pptwise-alternatives': '' },
          h('div', { className: 'pw-alts-head' }, t('alt.title')),
          h(
            'div',
            { className: 'pw-strip' },
            themes.map(function (theme, i) {
              var pages = Array.isArray(theme.pages) ? theme.pages.filter(hasMarkup) : []
              var ask = t('alt.switch', { name: theme.label || theme.id })
              var onClick = drafting
                ? function () {
                    viewerHost.draft(ask)
                  }
                : undefined
              return h(
                'div',
                { key: theme.id || i, className: 'pw-tile', 'data-alt-theme': theme.id },
                pages.map(function (page, j) {
                  return h(Frame, {
                    key: page.file || j,
                    page: page,
                    prefix: 'pfa' + i + '-' + j + '-',
                    width: slide.width,
                    height: slide.height,
                    title: drafting ? ask : theme.label || theme.id,
                    onClick: onClick,
                  })
                }),
                // The number the record carries, the one the model was told.
                h(ThemeLabel, { theme: theme, n: theme.n }),
              )
            }),
          ),
        )
      }

      /**
       * The theme wall: one column per theme, its cover over its content
       * page, in the same thumbnail strip the deck card draws. Open shows the
       * wall full size. No download: a wall has no deck behind it.
       *
       * Simpler than the deck card on purpose. There is no export to race and
       * no viewer page to remember, so one fetch per wall id is the whole of
       * its state, and an answer for an id the card has left is dropped.
       */
      function PptwiseThemesCard(props) {
        var wallId = wallIdOf(props.block)
        var state = useState({ id: null, bundle: null, verdict: null, open: false, attempt: 0 })
        var wall = wallId !== null && state[0].id === wallId ? state[0] : { id: null, bundle: null, verdict: null, open: false, attempt: 0 }
        var setWall = state[1]
        var attempt = state[0].attempt

        useEffect(
          function () {
            if (!wallId) return undefined
            var left = false
            fetch(previewBundleUrl(wallId))
              .then(function (r) {
                return verdictOf(r).then(function (answer) {
                  if (answer !== 'alive') return { verdict: answer, bundle: null }
                  return r.json().then(function (b) {
                    return { verdict: 'alive', bundle: b }
                  })
                })
              })
              .catch(function () {
                return { verdict: UNREACHABLE_VERDICT, bundle: null }
              })
              .then(function (next) {
                if (left) return
                setWall(function (prev) {
                  return { id: wallId, bundle: next.bundle, verdict: next.verdict, open: false, attempt: prev.attempt }
                })
              })
            return function () {
              left = true
            }
          },
          [wallId, attempt],
        )

        function update(change) {
          setWall(function (prev) {
            return Object.assign({}, prev, change)
          })
        }

        var bundle = wall.bundle

        if (!bundle || !Array.isArray(bundle.themes)) {
          if (wall.verdict === null || wall.verdict === 'alive') return null
          return h(
            'div',
            { className: 'pw-card' },
            h(CardHead, {
              icon: 'themes',
              title: 'themes',
              meta: [isFinal(wall.verdict) ? h(VerdictBadge, { key: 'v', verdict: wall.verdict }) : null],
              actions: [
                isRetryable(wall.verdict)
                  ? h(Btn, { key: 'retry', onClick: function () { update({ attempt: attempt + 1 }) } }, t('card.retry'))
                  : null,
              ],
            }),
            h('div', { className: 'pw-note' }, wallHintFor(wall.verdict)),
          )
        }

        var slide = bundle.slide || { width: 1280, height: 720 }
        var stamp = idStamp(wallId)
        function open() {
          if (!openInSidebar({ view: 'themes', id: wallId })) update({ open: true })
        }

        return h(
          'div',
          { className: 'pw-card' },
          h(CardHead, {
            icon: 'themes',
            title: bundle.title || 'themes',
            meta: [h('span', { key: 'n' }, t('card.themes', { n: bundle.themes.length }))],
            actions: [h(Btn, { key: 'open', icon: 'IconBrowseOutlineRegular', onClick: open }, t('card.open'))],
          }),
          h(
            'div',
            { className: 'pw-strip' },
            bundle.themes.map(function (theme, i) {
              var pages = Array.isArray(theme.pages) ? theme.pages.filter(hasMarkup) : []
              return h(
                'div',
                { key: theme.id || i, className: 'pw-tile', 'data-theme': theme.id },
                pages.map(function (page, j) {
                  return h(Frame, {
                    key: page.type || j,
                    page: page,
                    prefix: 'ptw' + stamp + '-' + i + '-' + j + '-',
                    width: slide.width,
                    height: slide.height,
                    title: theme.id + ' ' + (page.type || 'page'),
                    onClick: open,
                  })
                }),
                h(ThemeLabel, { theme: theme, n: i + 1 }),
              )
            }),
          ),
          wall.open
            ? h(
                Layer,
                { onClose: function () { update({ open: false }) } },
                h(PaneBody, { target: { view: 'themes', id: wallId }, revision: 0, closeButton: true, onClose: function () { update({ open: false }) } }),
              )
            : null,
        )
      }

      /**
       * One fetch of whatever the route keeps under an id: a deck, a wall or
       * an outline. The newer cards need nothing more than this, since they
       * have no export to race and no viewer page to remember. An answer for
       * an id the card has left is dropped.
       */
      function useRouteBundle(id) {
        var state = useState({ id: null, bundle: null, verdict: null, attempt: 0 })
        var setState = state[1]
        var attempt = state[0].attempt
        useEffect(
          function () {
            if (!id) return undefined
            var left = false
            fetch(previewBundleUrl(id))
              .then(function (r) {
                return verdictOf(r).then(function (answer) {
                  if (answer !== 'alive') return { verdict: answer, bundle: null }
                  return r.json().then(function (b) {
                    return { verdict: 'alive', bundle: b }
                  })
                })
              })
              .catch(function () {
                return { verdict: UNREACHABLE_VERDICT, bundle: null }
              })
              .then(function (next) {
                if (left) return
                setState(function (prev) {
                  return { id: id, bundle: next.bundle, verdict: next.verdict, attempt: prev.attempt }
                })
              })
            return function () {
              left = true
            }
          },
          [id, attempt],
        )
        var mine = id !== null && state[0].id === id
        return {
          bundle: mine ? state[0].bundle : null,
          verdict: mine ? state[0].verdict : null,
          retry: function () {
            setState(function (prev) {
              return Object.assign({}, prev, { attempt: prev.attempt + 1 })
            })
          },
        }
      }

      /** What a card says when the route cannot serve what it was asked for. */
      function Unavailable(props) {
        return h(
          'div',
          { className: 'pw-unavail' },
          h('span', null, isFinal(props.verdict) ? t('card.unavailable') : UNREACHABLE_HINT),
          isRetryable(props.verdict) ? h(Btn, { onClick: props.onRetry }, t('card.retry')) : null,
        )
      }

      /** The outline itself: one row per page, number, page type, heading, and what the page says. */
      function OutlineList(props) {
        var outline = props.outline
        var pages = Array.isArray(outline.pages) ? outline.pages : []
        return h(
          'div',
          { className: 'pw-card', 'data-pptwise-outline': '' },
          h(CardHead, {
            icon: 'outline',
            title: outline.title || t('outline.title'),
            meta: [
              h('span', { key: 'n' }, t('outline.pages', { n: pages.length })),
              outline.theme ? h('span', { key: 'theme' }, t('outline.theme', { theme: outline.theme })) : null,
            ],
          }),
          h(
            'ol',
            { className: 'pw-rows' },
            pages.map(function (page, i) {
              return h(
                'li',
                { key: page.id || i, className: 'pw-row', 'data-page': page.page },
                h('span', { className: 'pw-row-n' }, String(page.page || i + 1)),
                h('span', { className: 'pw-row-type', title: page.kind || undefined }, t('type.' + (page.type || 'content'))),
                h(
                  'span',
                  { className: 'pw-row-text' },
                  h('span', { className: 'pw-row-h' }, page.heading),
                  page.summary ? h('span', { className: 'pw-row-s' }, page.summary) : null,
                ),
              )
            }),
          ),
        )
      }

      /** The outline card in the tool row: the rows `pptwise_outline` checked, fetched by id. */
      function PptwiseOutlineCard(props) {
        var id = outlineIdOf(props.block)
        var got = useRouteBundle(id)
        if (!got.bundle || !Array.isArray(got.bundle.pages)) {
          if (got.verdict === null || got.verdict === 'alive') return null
          return h('div', { className: 'pw-card' }, h(Unavailable, { verdict: got.verdict, onRetry: got.retry }))
        }
        return h(OutlineList, { outline: got.bundle })
      }

      /** The key two versions of a page are matched by: its slide id, else its page id. */
      function pageKey(page) {
        return (page && (page.slideId || page.id)) || null
      }

      /**
       * Which pages of this version differ from the last one, matched by
       * slide id. A page whose markup hash moved is changed, a key the last
       * version did not have is new, and a key only the last version had was
       * removed. Without a hash on every page (a deck from before hashes) the
       * two cannot be compared, and the card says nothing rather than guess.
       */
      function diffPages(bundle, prior) {
        var result = { comparable: false, marks: {}, changed: [], removed: [] }
        if (!bundle || !prior || !Array.isArray(bundle.pages) || !Array.isArray(prior.pages)) return result
        var all = bundle.pages.concat(prior.pages)
        for (var i = 0; i < all.length; i++) {
          if (!all[i] || typeof all[i].hash !== 'string' || !pageKey(all[i])) return result
        }
        result.comparable = true
        var before = {}
        prior.pages.forEach(function (page, index) {
          before[pageKey(page)] = { page: page, index: index }
        })
        var seen = {}
        bundle.pages.forEach(function (page, index) {
          var key = pageKey(page)
          seen[key] = true
          var old = before[key]
          if (!old) {
            result.marks[key] = 'added'
            result.changed.push({ key: key, index: index, priorIndex: null, mark: 'added' })
          } else if (old.page.hash !== page.hash) {
            result.marks[key] = 'changed'
            result.changed.push({ key: key, index: index, priorIndex: old.index, mark: 'changed' })
          }
        })
        prior.pages.forEach(function (page, index) {
          if (!seen[pageKey(page)]) result.removed.push({ key: pageKey(page), priorIndex: index })
        })
        return result
      }

      /** A 16:9 tile holding a page: its inline markup when the bundle has it, else the page from the route. */
      function PageTile(props) {
        if (hasMarkup(props.page)) {
          return h(Frame, {
            page: props.page,
            prefix: props.prefix,
            width: props.width,
            height: props.height,
            title: props.title,
            onClick: props.onClick,
          })
        }
        return h(
          'div',
          {
            className: 'pw-thumb',
            role: props.onClick ? 'button' : undefined,
            tabIndex: props.onClick ? 0 : undefined,
            onClick: props.onClick,
            onKeyDown: activateOn(props.onClick),
            title: props.title,
            style: { aspectRatio: (props.width || 1280) + ' / ' + (props.height || 720) },
          },
          props.src ? h('img', { src: props.src, alt: '', loading: 'lazy', draggable: false }) : null,
        )
      }

      /**
       * Two versions of every changed page, side by side. It opens where the
       * full-screen view opens: the right sidebar, or the layer without one.
       */
      function CompareView(props) {
        var got = useRouteBundle(props.id)
        var prior = useRouteBundle(props.priorId)
        var ref = useAutoFocus(props.revision)
        var diff = diffPages(got.bundle, prior.bundle)
        var slide = (got.bundle && got.bundle.slide) || { width: 1280, height: 720 }
        var ratio = slide.width + ' / ' + slide.height
        var rows = diff.changed
          .map(function (row) {
            return { label: t('desk.page', { n: row.index + 1 }), mark: row.mark, before: row.priorIndex, after: row.index }
          })
          .concat(
            diff.removed.map(function (row) {
              return { label: t('compare.removed'), mark: 'removed', before: row.priorIndex, after: null }
            }),
          )
        function side(id, index, empty) {
          if (index === null) return h('div', { className: 'pw-compare-empty', style: { aspectRatio: ratio } }, empty)
          return h('img', { className: 'pw-compare-img', src: pageUrl(id, index), alt: '', style: { aspectRatio: ratio } })
        }
        return h(
          'div',
          {
            ref: ref,
            className: 'pw-pane',
            tabIndex: -1,
            'data-pptwise-compare': props.id,
            onKeyDown: closeOnEscape(props.onClose),
          },
          h(
            'div',
            { className: 'pw-pane-bar' },
            h('span', { className: 'pw-pane-title' }, t('compare.title', { from: props.version - 1, to: props.version })),
            props.closeButton ? h(Btn, { variant: 'ghost', icon: 'IconCloseOutlineRegular', onClick: props.onClose }, t('viewer.close')) : null,
          ),
          !got.bundle || !prior.bundle
            ? got.verdict === null || prior.verdict === null || (got.verdict === 'alive' && prior.verdict === 'alive')
              ? null
              : h(Unavailable, { verdict: got.bundle ? prior.verdict : got.verdict, onRetry: got.bundle ? prior.retry : got.retry })
            : h(
                'div',
                { className: 'pw-compare' },
                h('div', { className: 'pw-compare-cols pw-compare-head' }, h('span', null, t('compare.before')), h('span', null, t('compare.after'))),
                rows.map(function (row, i) {
                  return h(
                    'div',
                    { key: i, className: 'pw-compare-row', 'data-compare-row': row.mark },
                    h(
                      'div',
                      { className: 'pw-compare-label' },
                      h('span', null, row.label),
                      row.mark === 'added' ? h(Badge, { tone: 'success' }, t('desk.addedMark')) : null,
                      row.mark === 'changed' ? h(Badge, { tone: 'info' }, t('desk.changedMark')) : null,
                    ),
                    h(
                      'div',
                      { className: 'pw-compare-cols' },
                      side(props.priorId, row.before, t('compare.none')),
                      side(props.id, row.after, t('compare.removed')),
                    ),
                  )
                }),
              ),
        )
      }

      /**
       * The draft desk: this turn's deck, kept below the turn where the work
       * group cannot fold it away. The strip shows every page, tags the ones
       * that changed since the last version of the same deck, and lets the
       * user open it full screen, download it, compare it with the last
       * version, or start a message about one page.
       *
       * A tile's caption is its page number and, when it changed, one tag:
       * nothing else, so a caption never runs into the next tile. "Edit this
       * page" sits over the tile and shows on hover or keyboard focus.
       */
      /** `Signature layouts on 7 of 9 pages`, for a build that kept the count and has a page that can take one. */
      function signatureMeta(bundle) {
        var signature = bundle.signature
        if (!signature || !(signature.offered > 0)) return null
        return h('span', { key: 's', 'data-signature': '' }, t('card.signature', { x: signature.drawn, n: signature.offered }))
      }

      function DraftDesk(props) {
        var entry = props.entry
        var got = useRouteBundle(entry.id)
        var prior = useRouteBundle(entry.priorId || null)
        var ui = useState({ layer: null, download: 'idle' })
        function set(change) {
          ui[1](function (prev) {
            return Object.assign({}, prev, change)
          })
        }
        function open(target) {
          if (!openInSidebar(target)) set({ layer: target })
        }
        var bundle = got.bundle
        if (!bundle || !Array.isArray(bundle.pages)) {
          if (got.verdict === null || got.verdict === 'alive') return null
          return h('div', { className: 'pw-card', 'data-pptwise-desk': '' }, h(Unavailable, { verdict: got.verdict, onRetry: got.retry }))
        }
        var pages = viewablePages(bundle)
        var slide = bundle.slide || { width: 1280, height: 720 }
        var exportable = bundle.exportable !== false
        var written = pages.filter(function (page) {
          return page.placeholder !== true
        }).length
        var diff = entry.priorId ? diffPages(bundle, prior.bundle) : { comparable: false, marks: {}, changed: [], removed: [] }
        var differs = diff.changed.length > 0 || diff.removed.length > 0
        var stamp = idStamp(entry.id)
        var layer = ui[0].layer
        return h(
          'div',
          { className: 'pw-card', 'data-pptwise-desk': entry.id },
          h(CardHead, {
            icon: 'deck',
            title: bundle.title || 'deck',
            meta: [
              h(Badge, { key: 'v', tone: 'neutral' }, h('span', { 'data-desk-version': entry.version }, t('desk.version', { n: entry.version }))),
              h('span', { key: 'n' }, t('desk.pages', { n: pages.length })),
              bundle.draft ? h('span', { key: 'w', 'data-desk-written': '' }, t('desk.written', { x: written, n: pages.length })) : null,
              exportable ? null : h(Badge, { key: 'r', tone: 'warning' }, t('desk.needsRevision')),
              signatureMeta(bundle),
              diff.comparable
                ? h(
                    'span',
                    { key: 'd', 'data-desk-diff': '' },
                    differs
                      ? [diff.changed.length > 0 ? t('desk.changed', { n: diff.changed.length }) : null, diff.removed.length > 0 ? t('desk.removed', { n: diff.removed.length }) : null]
                          .filter(Boolean)
                          .join(' · ')
                      : t('desk.unchanged'),
                  )
                : null,
            ],
            actions: [
              h(Btn, { key: 'open', icon: 'IconBrowseOutlineRegular', onClick: function () { open({ view: 'deck', id: entry.id, page: 1 }) } }, t('desk.open')),
              exportable
                ? h(ExportButton, {
                    key: 'pptx',
                    previewId: entry.id,
                    name: bundle.title,
                    draft: bundle.draft,
                    verdict: got.verdict,
                    status: ui[0].download,
                    onStatus: function (next) { set({ download: next }) },
                    label: t('desk.download'),
                  })
                : null,
              diff.comparable && differs
                ? h(
                    Btn,
                    {
                      key: 'compare',
                      icon: 'IconCompareSplitOutlineRegular',
                      onClick: function () { open({ view: 'compare', id: entry.id, priorId: entry.priorId, version: entry.version }) },
                    },
                    t('desk.compare'),
                  )
                : null,
            ],
          }),
          h(
            'div',
            { className: 'pw-strip' },
            pages.map(function (page, i) {
              var n = pageNumberOf(page, i)
              var mark = diff.comparable ? diff.marks[pageKey(page)] : undefined
              return h(
                'div',
                { key: pageKey(page) || i, className: 'pw-tile pw-tile-desk', 'data-desk-page': n, 'data-desk-mark': mark || undefined },
                h(
                  'div',
                  { className: 'pw-shot' },
                  h(PageTile, {
                    page: page,
                    src: pageUrl(entry.id, i),
                    prefix: 'pwd' + stamp + '-' + i + '-',
                    width: slide.width,
                    height: slide.height,
                    title: t('desk.page', { n: n }),
                    onClick: function () { open({ view: 'deck', id: entry.id, page: n }) },
                  }),
                  props.editPage
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'pw-edit',
                          'data-desk-edit': n,
                          title: t('desk.edit'),
                          onClick: function () { props.editPage(n) },
                        },
                        t('desk.edit'),
                      )
                    : null,
                ),
                h(
                  'div',
                  { className: 'pw-cap' },
                  h('span', null, t('desk.page', { n: n })),
                  mark ? h(Badge, { tone: mark === 'added' ? 'success' : 'info' }, t(mark === 'added' ? 'desk.addedMark' : 'desk.changedMark')) : null,
                ),
              )
            }),
          ),
          // The desk is what stays in view once the turn's work group folds,
          // so the other themes go here as well as on the build card. Only
          // this build's own: every build hands back the ones still current,
          // so an earlier build's would show pages the deck has rewritten.
          h(Alternatives, { themes: bundle.alternatives, slide: slide }),
          layer
            ? h(
                Layer,
                { onClose: function () { set({ layer: null }) } },
                h(PaneBody, { target: layer, revision: 0, closeButton: true, onClose: function () { set({ layer: null }) }, onEditPage: props.editPage }),
              )
            : null,
        )
      }

      /**
       * The turn tail: this turn's last deck as the draft desk, or, in a turn
       * that drew no deck, its last outline or theme wall, so a card made
       * inside Code Mode is still in view once the turn's work folds away.
       */
      function DraftTail(props) {
        var list = props.useArtifacts(String(props.turn.turn))
        if (!list || list.length === 0) return null
        var entry = null
        for (var i = list.length - 1; i >= 0; i--) {
          if (list[i] && list[i].kind === 'deck') {
            entry = list[i]
            break
          }
        }
        if (!entry) entry = list[list.length - 1]
        if (!entry || !entry.id) return null
        if (entry.kind === 'deck') return h(DraftDesk, { key: entry.id, entry: entry, editPage: props.editPage })
        var block = { content: [{ type: 'text', text: (entry.kind === 'outline' ? 'pptwise-outline:' : 'pptwise-themes:') + entry.id }] }
        return h(
          'div',
          { 'data-pptwise-tail': entry.kind },
          h(entry.kind === 'outline' ? PptwiseOutlineCard : PptwiseThemesCard, { key: entry.id, block: block }),
        )
      }

      // THE FULL-SCREEN VIEW. One pane per kind of thing a card can open: a
      // deck to page through, a theme wall, or two versions side by side. In
      // DSH it is a tab in the right sidebar (see `registerViewer`), where the
      // user can widen the sidebar or switch it to full screen with DSH's own
      // control. A shell without the sidebar gets the same pane in a layer
      // over the page.
      //
      // The deck view pages the rendered SVGs straight from the route
      // (`/page/<n>`). It replaced an iframe of `preview.html`, which never
      // took the keyboard: nothing focused the frame, so ←/→ landed on the
      // chat's document, and the page carried its own light/dark switch.
      // `preview.html` stays what harnesses without a plugin UI open.

      /** Move the keyboard into a pane when it opens, and again on every navigation to it. */
      function useAutoFocus(key) {
        var ref = react.useRef(null)
        useEffect(
          function () {
            var el = ref.current
            if (el && typeof el.focus === 'function') el.focus({ preventScroll: true })
          },
          [key],
        )
        return ref
      }

      function closeOnEscape(onClose) {
        return function (e) {
          if (e.key === 'Escape' && onClose) {
            e.preventDefault()
            onClose()
          }
        }
      }

      /** Wheel movement, mostly sideways, that counts as one swipe. */
      var SWIPE_DELTA = 40
      var SWIPE_PAUSE_MS = 450

      /**
       * A deck, one page at a time: the page, previous and next areas on its
       * left and right, "Page N of M", and every page in a strip below.
       * ←/→, PageUp/PageDown, Space and Shift+Space page, Home and End jump,
       * Esc closes. A trackpad's sideways swipe pages too.
       *
       * `revision` counts navigations to the pane. A new one (the user clicked
       * another thumbnail in the chat) moves to the page it carried; paging
       * inside the pane is remembered against the revision it happened in.
       */
      function DeckViewer(props) {
        var got = useRouteBundle(props.id)
        var start = props.page > 0 ? props.page : 1
        var state = useState({ page: start, at: props.revision, download: 'idle' })
        var ref = useAutoFocus(props.revision)
        var bundle = got.bundle
        var pages = bundle && Array.isArray(bundle.pages) ? bundle.pages : []
        var total = pages.length
        var page = state[0].at === props.revision ? state[0].page : start
        if (total > 0) page = Math.min(Math.max(1, page), total)

        useEffect(
          function () {
            var root = ref.current
            var thumb = root && root.querySelector('[data-viewer-thumb="' + page + '"]')
            if (thumb && typeof thumb.scrollIntoView === 'function') thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' })
          },
          [page, total],
        )

        function go(n) {
          if (total === 0) return
          var next = Math.min(Math.max(1, n), total)
          state[1](function (prev) {
            return Object.assign({}, prev, { page: next, at: props.revision })
          })
        }
        /** A click on an area or a thumbnail pages and hands the keyboard back to the pane. */
        function step(n) {
          go(n)
          if (ref.current) ref.current.focus({ preventScroll: true })
        }
        function onKeyDown(e) {
          if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
          var key = e.key
          // Space on one of the pane's own buttons (download, close) is that button's.
          if (key === ' ' && e.target !== e.currentTarget && e.target.tagName === 'BUTTON' && !e.target.hasAttribute('data-viewer-thumb')) return
          var to = null
          if (key === 'ArrowRight' || key === 'PageDown' || (key === ' ' && !e.shiftKey)) to = page + 1
          else if (key === 'ArrowLeft' || key === 'PageUp' || (key === ' ' && e.shiftKey)) to = page - 1
          else if (key === 'Home') to = 1
          else if (key === 'End') to = total
          else if (key === 'Escape') {
            closeOnEscape(props.onClose)(e)
            return
          }
          if (to === null) return
          e.preventDefault()
          go(to)
        }
        function onWheel(e) {
          var dx = e.deltaX
          if (Math.abs(dx) < SWIPE_DELTA || Math.abs(dx) <= Math.abs(e.deltaY)) return
          // One swipe sends a burst of wheel events; the stage remembers when it last paged.
          var stage = e.currentTarget
          var now = Date.now()
          var last = Number(stage.getAttribute('data-swiped-at') || 0)
          if (now - last < SWIPE_PAUSE_MS) return
          stage.setAttribute('data-swiped-at', String(now))
          go(dx > 0 ? page + 1 : page - 1)
        }

        var title = (bundle && bundle.title) || ''
        var exportable = !!bundle && bundle.exportable !== false
        var body
        if (!bundle) {
          body = got.verdict === null || got.verdict === 'alive' ? null : h(Unavailable, { verdict: got.verdict, onRetry: got.retry })
        } else {
          body = [
            h(
              'div',
              { key: 'stage', className: 'pw-stage', onWheel: onWheel },
              h(
                'button',
                {
                  type: 'button',
                  className: 'pw-zone',
                  'data-side': 'prev',
                  'aria-label': t('viewer.prev'),
                  title: t('viewer.prev'),
                  disabled: page <= 1,
                  onClick: function () { step(page - 1) },
                },
                h('span', { className: 'pw-zone-knob' }, iconNode('IconChevronLeftOutlineRegular') || '‹'),
              ),
              total > 0 ? h('img', { className: 'pw-slide', src: pageUrl(props.id, page - 1), alt: t('desk.page', { n: page }), draggable: false }) : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'pw-zone',
                  'data-side': 'next',
                  'aria-label': t('viewer.next'),
                  title: t('viewer.next'),
                  disabled: page >= total,
                  onClick: function () { step(page + 1) },
                },
                h('span', { className: 'pw-zone-knob' }, iconNode('IconChevronRightOutlineRegular') || '›'),
              ),
            ),
            h(
              'div',
              { key: 'strip', className: 'pw-vstrip', 'aria-label': t('viewer.pages') },
              pages.map(function (p, i) {
                var n = i + 1
                return h(
                  'button',
                  {
                    key: pageKey(p) || i,
                    type: 'button',
                    className: 'pw-vthumb',
                    'data-viewer-thumb': n,
                    'aria-current': n === page ? 'true' : undefined,
                    'aria-label': t('desk.page', { n: n }),
                    onClick: function () { step(n) },
                  },
                  h('img', { src: pageUrl(props.id, i), alt: '', loading: 'lazy', draggable: false }),
                  h('span', { className: 'pw-vthumb-n' }, String(n)),
                )
              }),
            ),
          ]
        }
        return h(
          'div',
          {
            ref: ref,
            className: 'pw-pane',
            tabIndex: -1,
            role: 'region',
            'aria-label': title || t('pane.deck'),
            'data-pptwise-viewer': props.id,
            'data-page': total > 0 ? page : undefined,
            onKeyDown: onKeyDown,
          },
          h(
            'div',
            { className: 'pw-pane-bar' },
            h('span', { className: 'pw-pane-title', title: title }, title),
            total > 0 ? h('span', { className: 'pw-counter', 'data-viewer-counter': '', 'aria-live': 'polite' }, t('viewer.counter', { n: page, m: total })) : null,
            h(
              'span',
              { className: 'pw-actions' },
              props.onEditPage && total > 0
                ? h(Btn, { variant: 'ghost', icon: 'IconEditOutlineRegular', 'data-viewer-edit': page, onClick: function () { props.onEditPage(page) } }, t('desk.edit'))
                : null,
              exportable
                ? h(ExportButton, {
                    variant: 'ghost',
                    previewId: props.id,
                    name: title,
                    draft: bundle.draft,
                    verdict: got.verdict,
                    status: state[0].download,
                    onStatus: function (next) {
                      state[1](function (prev) {
                        return Object.assign({}, prev, { download: next })
                      })
                    },
                  })
                : null,
              props.closeButton ? h(Btn, { variant: 'ghost', icon: 'IconCloseOutlineRegular', onClick: props.onClose }, t('viewer.close')) : null,
            ),
          ),
          body,
        )
      }

      /** A theme wall full size: every theme as a numbered column of its cover over its content page. */
      function WallView(props) {
        var got = useRouteBundle(props.id)
        var ref = useAutoFocus(props.revision)
        var bundle = got.bundle
        var themes = bundle && Array.isArray(bundle.themes) ? bundle.themes : []
        var slide = (bundle && bundle.slide) || { width: 1280, height: 720 }
        var stamp = idStamp(props.id)
        return h(
          'div',
          { ref: ref, className: 'pw-pane', tabIndex: -1, 'data-pptwise-wall': props.id, onKeyDown: closeOnEscape(props.onClose) },
          h(
            'div',
            { className: 'pw-pane-bar' },
            h('span', { className: 'pw-pane-title' }, (bundle && bundle.title) || t('pane.themes')),
            bundle ? h('span', { className: 'pw-counter' }, t('card.themes', { n: themes.length })) : null,
            props.closeButton ? h('span', { className: 'pw-actions' }, h(Btn, { variant: 'ghost', icon: 'IconCloseOutlineRegular', onClick: props.onClose }, t('viewer.close'))) : null,
          ),
          !bundle
            ? got.verdict === null || got.verdict === 'alive' ? null : h(Unavailable, { verdict: got.verdict, onRetry: got.retry })
            : h(
                'div',
                { className: 'pw-wall' },
                themes.map(function (theme, i) {
                  return h(
                    'div',
                    { key: theme.id || i, className: 'pw-wall-col', 'data-theme': theme.id },
                    h(ThemeLabel, { theme: theme, n: i + 1 }),
                    (Array.isArray(theme.pages) ? theme.pages.filter(hasMarkup) : []).map(function (page, j) {
                      return h(Frame, {
                        key: page.type || j,
                        page: page,
                        prefix: 'pwv' + stamp + '-' + i + '-' + j + '-',
                        width: slide.width,
                        height: slide.height,
                        title: theme.id + ' ' + (page.type || 'page'),
                      })
                    }),
                  )
                }),
              ),
        )
      }

      /** Whichever pane a target names: `{ view: 'deck' | 'themes' | 'compare', id, page?, priorId?, version? }`. */
      function PaneBody(props) {
        var target = props.target
        if (target.view === 'themes') return h(WallView, { id: target.id, revision: props.revision, onClose: props.onClose, closeButton: props.closeButton })
        if (target.view === 'compare') {
          return h(CompareView, {
            id: target.id,
            priorId: target.priorId,
            version: target.version,
            revision: props.revision,
            onClose: props.onClose,
            closeButton: props.closeButton,
          })
        }
        return h(DeckViewer, {
          id: target.id,
          page: target.page,
          revision: props.revision,
          onClose: props.onClose,
          closeButton: props.closeButton,
          onEditPage: props.onEditPage,
        })
      }

      /** The sidebar tab's body: the pane its address names, opened on the page its navigation carried. */
      function PaneTab(props) {
        var info = props.useTabInfo()
        var navigation = info.tab.navigation
        var target = parsePaneAddress(navigation.address)
        if (!target) return null
        var params = navigation.params || {}
        if (typeof params.page === 'number') target.page = params.page
        if (typeof params.version === 'number') target.version = params.version
        return h(PaneBody, {
          target: target,
          revision: navigation.revision,
          onClose: function () { info.tab.actions.close() },
          onEditPage: viewerHost && viewerHost.editPage ? viewerHost.editPage : undefined,
        })
      }

      /** The sidebar tab's title: the deck's own title once the route has it. */
      function PaneTitle(props) {
        var info = props.useTabInfo()
        var target = parsePaneAddress(info.tab.navigation.address)
        var got = useRouteBundle(target && target.view !== 'compare' ? target.id : null)
        var text = target && target.view === 'compare' ? t('pane.compare') : (got.bundle && got.bundle.title) || info.tab.title
        return h(react.Fragment, null, h('span', { className: 'pw-tab-icon' }, fileIcon(target && target.view === 'themes' ? 'themes' : 'deck', 16)), text)
      }

      return {
        deck: PptwisePreviewCard,
        themes: PptwiseThemesCard,
        outline: PptwiseOutlineCard,
        tail: DraftTail,
        paneTab: PaneTab,
        paneTitle: PaneTitle,
      }
    }

    function registerCard(ctx) {
      // `slots` is a declared dependency (see `exports.inject` below), so
      // cordis does not apply this plugin until the service exists. The guard
      // stays as a belt-and-braces check, but it must never be the thing that
      // silently makes this card a no-op — which is exactly what happened
      // when `inject` was empty: apply ran before the slot registry was up,
      // this returned quietly, and the tool rendered in the generic row with
      // no sign anything had failed.
      if (!ctx.slots || typeof ctx.slots.inject !== 'function') {
        console.error('[pptwise] preview card skipped: no slot registry on this context')
        return
      }
      var react
      try {
        react = require('react')
      } catch (error) {
        console.error('[pptwise] preview card skipped: ' + error)
        return
      }
      // Optional, unlike `react`: it only lifts the viewer out of a clipping
      // ancestor (see `inBody`), and a shell without it still gets a card.
      var reactDom = null
      try {
        reactDom = require('react-dom')
      } catch (error) {
        console.warn('[pptwise] react-dom unavailable, the viewer opens inside the card: ' + error)
      }
      // DSH's own buttons, tags and icons. Optional as well: a shell whose
      // module table lacks them gets stand-ins wearing the same tokens.
      var ui = null
      try {
        ui = require('@deepseek-ai/dsh-client-ui-primitives')
      } catch (error) {
        console.warn('[pptwise] DSH primitives unavailable, the cards draw their own buttons: ' + error)
      }
      var cards = PreviewCard(react, reactDom, ui)
      // One registration per wire name. `pptwise_build` stamps the same
      // preview id `pptwise_preview` does, so the deck card draws both.
      var seats = [
        [TOOL_NAME, cards.deck],
        [BUILD_TOOL_NAME, cards.deck],
        [THEMES_TOOL_NAME, cards.themes],
        [OUTLINE_TOOL_NAME, cards.outline],
      ]
      seats.forEach(function (seat) {
        ctx.slots.inject('tool.call.toolview', function* () {
          yield ctx.slots.register({ name: 'tool.call.toolview', key: seat[0] }, seat[1])
        })
      })
      registerTail(ctx, cards.tail)
      registerViewer(ctx, cards)
    }

    /**
     * Start a message about one page: the composer gets "Page N: " (in the
     * harness's language) and the keyboard. Whatever the user had already
     * typed stays, with the prefix on a new line after it.
     */
    function editPageIn(sessions, sessionId, n) {
      draftIn(sessions, sessionId, t('edit.prefix', { n: n }))
    }

    /**
     * Put `prefix` on a line of its own at the end of the composer's draft,
     * once, and give it the keyboard: what the user had typed stays.
     */
    function draftIn(sessions, sessionId, prefix) {
      var binding = sessions.binding(sessionId)
      var conversation = binding && binding.ctx && typeof binding.ctx.get === 'function' ? binding.ctx.get('conversation') : undefined
      if (!conversation || !conversation.input || typeof conversation.input.for !== 'function') {
        console.warn('[pptwise] no composer to prefill for this session')
        return
      }
      var input = conversation.input.for(binding.ctx)
      var current = ''
      try {
        var snapshot = input.state && typeof input.state.getSnapshot === 'function' ? input.state.getSnapshot() : undefined
        current = (snapshot && typeof snapshot.draft === 'string' && snapshot.draft) || ''
      } catch {
        current = ''
      }
      var kept = current.replace(/\s+$/, '')
      // Asking twice for the same page leaves one prefix, not two in a row.
      var bare = prefix.replace(/\s+$/, '')
      if (kept !== bare && kept.slice(-bare.length - 1) !== '\n' + bare) {
        input.setDraft(kept === '' ? prefix : kept + '\n' + prefix)
      }
      input.focus()
    }

    /**
     * The draft desk under each finished turn. Rides a scoped `ctx.inject`
     * because the Conversation and session services exist only in the web
     * shell's session scope: a shell without them still gets every tool card.
     */
    function registerTail(ctx, DraftTail) {
      if (typeof ctx.inject !== 'function') return
      ctx.inject(['slots', 'uiConversation', 'sessions'], function (scope) {
        try {
          scope.effect(function () {
            return scope.uiConversation.events.register(artifactDefinition)
          }, 'pptwise: conversation definition')
          scope.slots.inject('conversation.chat.turnTail', function* () {
            yield scope.slots.register(
              {
                name: 'conversation.chat.turnTail',
                id: '@liustack/pptwise',
                inject: function (sessionId) {
                  var binding = scope.sessions.binding(sessionId)
                  if (binding === undefined) throw new Error('pptwise: unknown session "' + sessionId + '"')
                  var chat = scope.uiConversation.binding(binding).target('chat')
                  return {
                    editPage: function (n) {
                      editPageIn(scope.sessions, sessionId, n)
                    },
                    keyedHooks: {
                      artifacts: function (turn) {
                        var snapshot = chat.getSnapshot()
                        if (snapshot === undefined) throw new Error('pptwise: Chat target is unavailable')
                        return snapshot.nodes.turnDataSource(Number(turn), ARTIFACT_KIND)
                      },
                    },
                  }
                },
              },
              DraftTail,
            )
          })
        } catch (error) {
          console.error('[pptwise] draft desk skipped: ' + error)
        }
      })
    }

    /**
     * Preview in DSH's right sidebar: a tab type for pptwise addresses,
     * its body and its title. Rides a scoped `ctx.inject` like the turn tail,
     * so a shell without the sidebar keeps every card, and the cards open
     * their own layer instead (`openInSidebar` answers false).
     */
    function registerViewer(ctx, cards) {
      if (typeof ctx.inject !== 'function') return
      ctx.inject(['slots', 'sidebarRight', 'sidebarRightTabs', 'sessions'], function (scope) {
        try {
          scope.effect(function () {
            return scope.sidebarRightTabs.register({
              id: VIEWER_ID,
              kind: VIEWER_KIND,
              patterns: [PANE_PREFIX + '**'],
              canOpen: function (address) {
                return parsePaneAddress(address) !== null
              },
              title: function (address) {
                var target = parsePaneAddress(address)
                return t(target && target.view === 'themes' ? 'pane.themes' : target && target.view === 'compare' ? 'pane.compare' : 'pane.deck')
              },
            })
          }, 'pptwise: sidebar type')
          scope.slots.inject('sidebar.right.pane.tab', function* () {
            yield scope.slots.register({ name: 'sidebar.right.pane.tab', key: VIEWER_ID }, cards.paneTab)
          })
          scope.slots.inject('sidebar.right.pane.tab.title', function* () {
            yield scope.slots.register({ name: 'sidebar.right.pane.tab.title', key: VIEWER_ID }, cards.paneTitle)
          })
          scope.effect(function () {
            viewerHost = {
              open: function (target) {
                try {
                  var params = {}
                  if (typeof target.page === 'number') params.page = target.page
                  if (typeof target.version === 'number') params.version = target.version
                  scope.sidebarRight.openResource(paneAddress(target), { kind: VIEWER_KIND, params: params })
                  return true
                } catch (error) {
                  // No session on screen to open it in: the card's own layer will do.
                  console.warn('[pptwise] sidebar would not open the deck: ' + error)
                  return false
                }
              },
              editPage: function (n) {
                var mounted = scope.sidebarRight.mounted
                var sessionId = mounted && typeof mounted.getSnapshot === 'function' ? mounted.getSnapshot() : undefined
                if (sessionId === undefined) {
                  console.warn('[pptwise] no session on screen to write about page ' + n)
                  return
                }
                editPageIn(scope.sessions, sessionId, n)
              },
              draft: function (text) {
                var mounted = scope.sidebarRight.mounted
                var sessionId = mounted && typeof mounted.getSnapshot === 'function' ? mounted.getSnapshot() : undefined
                if (sessionId === undefined) {
                  console.warn('[pptwise] no session on screen to write in')
                  return
                }
                draftIn(scope.sessions, sessionId, text)
              },
            }
            return function () {
              viewerHost = null
            }
          }, 'pptwise: sidebar opener')
        } catch (error) {
          console.error('[pptwise] full screen stays in the card: ' + error)
        }
      })
    }

    /**
     * Hand the cards' words to DSH's locale service, when there is one. Rides
     * a scoped `ctx.inject` so a shell without the service, and this repo's
     * tests, still get cards, worded in the page's own language.
     */
    function registerLocale(ctx) {
      if (typeof ctx.inject !== 'function') return
      ctx.inject(['locale'], function (scope) {
        try {
          scope.effect(function () {
            var off = scope.locale.register(LOCALE_NS, STRINGS)
            localeT = scope.locale.bind(LOCALE_NS)
            return function () {
              localeT = null
              off()
            }
          }, 'pptwise: dictionaries')
        } catch (error) {
          console.warn('[pptwise] card words stay in the page language: ' + error)
        }
      })
    }

    function apply(ctx) {
      // A card that fails to register is a console line, not a dead turn —
      // the generic tool row still renders the call, same posture the host
      // half takes for its own registrations.
      try {
        registerLocale(ctx)
      } catch (error) {
        console.error('[pptwise] card dictionaries skipped: ' + error)
      }
      try {
        registerCard(ctx)
      } catch (error) {
        console.error('[pptwise] preview card registration skipped: ' + error)
      }
    }

    exports.apply = apply
    // Declared, not sniffed: cordis holds this plugin until the slot registry
    // is up. The shipped `ui-skill` registrant declares the same service for
    // the same reason.
    exports.inject = ['slots']
    // Exposed for this repo's tests only; not part of the plugin contract.
    exports.__testing = {
      bundleOf: bundleOf,
      previewIdOf: previewIdOf,
      wallIdOf: wallIdOf,
      outlineIdOf: outlineIdOf,
      artifactDefinition: artifactDefinition,
      deckKey: deckKey,
      editPageIn: editPageIn,
      draftIn: draftIn,
      t: t,
      STRINGS: STRINGS,
      pageCountOf: pageCountOf,
      verdictOf: verdictOf,
      isRetryable: isRetryable,
      isFinal: isFinal,
      isZip: isZip,
      ROUTE_HEADER: ROUTE_HEADER,
      MISSING_HINT: MISSING_HINT,
      UNREACHABLE_HINT: UNREACHABLE_HINT,
      REFUSED_HINT: REFUSED_HINT,
      DAMAGED_HINT: DAMAGED_HINT,
      namespaceIds: namespaceIds,
      viewablePages: viewablePages,
      stripPages: stripPages,
      hasMarkup: hasMarkup,
      pageNumberOf: pageNumberOf,
      previewBundleUrl: previewBundleUrl,
      pageUrl: pageUrl,
      STRIP_PAGES: STRIP_PAGES,
      TOOL_NAME: TOOL_NAME,
      BUILD_TOOL_NAME: BUILD_TOOL_NAME,
      THEMES_TOOL_NAME: THEMES_TOOL_NAME,
      OUTLINE_TOOL_NAME: OUTLINE_TOOL_NAME,
      paneAddress: paneAddress,
      parsePaneAddress: parsePaneAddress,
    }
    return module.exports
  },
})
