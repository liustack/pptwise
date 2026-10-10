// Browser half of the pptwise dsh plugin: the deck preview card.
//
// The host half (`./preview-tool.js`) registers `pptwise_preview`, stamps a
// preview id into the tool's result text, and serves the rendered bundle from
// its own route under that id. This file is what turns that payload into
// something a person can look at: a thumbnail strip in the tool card, and a
// full-size modal on click. No new tab, no localhost URL, no
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
// It also *views* nothing of its own any more. The modal used to be a small
// React slideshow — arrow keys, a page counter, prev/next buttons, a stand-in
// for pages the server had declined to send — sitting next to the finished
// `preview.html` that `pptwise preview --html` writes for every run and that
// harnesses without a plugin UI are told to open. Two viewers, one deck, and
// only one of them tested. The modal is now an iframe pointing at that file,
// and keeps only the two things the file cannot do for itself: close, and hand
// over the .pptx.
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
        'desk.version': '第 {n} 版',
        'desk.pages': '{n} 页',
        'desk.written': '已写 {x}/{n} 页',
        'desk.needsRevision': '待修改，未出 .pptx',
        'desk.changed': '改了 {n} 页',
        'desk.unchanged': '与上一版相同',
        'desk.removed': '删了 {n} 页',
        'desk.open': '全屏翻看',
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
        'compare.close': '关闭',
        'edit.prefix': '第 {n} 页：',
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
        'desk.version': 'Version {n}',
        'desk.pages': '{n} pages',
        'desk.written': '{x} of {n} pages written',
        'desk.needsRevision': 'Needs revision, no .pptx yet',
        'desk.changed': '{n} pages changed',
        'desk.unchanged': 'Same as the last version',
        'desk.removed': '{n} pages removed',
        'desk.open': 'Full screen',
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
        'compare.close': 'Close',
        'edit.prefix': 'Page {n}: ',
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

    /**
     * Where the full-size viewer lives — the html `preview --html` wrote.
     *
     * `#page=N` is that page's own way in, and a URL is the only thing this
     * card can hand it: the frame is a document, not a component with props.
     * N counts pages the way a reader does, so it is the thumbnail's own
     * label rather than its index in a strip that may be a prefix of the deck.
     */
    function previewHtmlUrl(previewId, startPage) {
      var url = '/pptwise/preview/' + previewId + '/html'
      return startPage > 1 ? url + '#page=' + startPage : url
    }

    /** Where the deck itself lives — the bundle the strip draws from. */
    function previewBundleUrl(previewId) {
      return '/pptwise/preview/' + previewId
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
     * twice. All the route observed is that nothing is at this id under the
     * previews root this session is reading. Deletion is the usual reason and
     * not the only one: `PPTWISE_HOME` decides that root, so a deck written
     * under a different one is alive and out of reach, which is a fact about
     * configuration and not about anything the user did wrong.
     */
    var MISSING_HINT =
      'The rendered deck for this preview is no longer on disk where this session looks for it. ' +
      'Previews are never removed on a timer, so it was either deleted or written under a different ' +
      'PPTWISE_HOME. Run pptwise_preview again to rebuild it.'

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

    /** What the export button says once it knows it cannot succeed. */
    function exportLabelFor(verdict) {
      if (verdict === 'damaged') return 'Damaged'
      if (verdict === 'refused') return 'Refused'
      return 'Unavailable'
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
    // The version number comes from the same log: each call's state carries,
    // per deck, how many decks came before it and the id of the last one,
    // handed forward from the nearest earlier pptwise call. Only the events
    // the client has loaded take part, so a deck whose earlier builds lie
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

    /** The per-deck count and last id after the previous pptwise call. */
    function decksAfter(previous) {
      if (!previous) return {}
      var base = (previous.state && previous.state.decks) || {}
      var info = artifactInfo(previous.matches || [])
      if (info.kind !== 'deck' || !info.id) return base
      var key = deckKey(info.target)
      var next = Object.assign({}, base)
      next[key] = { count: (base[key] ? base[key].count : 0) + 1, lastId: info.id }
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
        var before = info.kind === 'deck' ? decks[deckKey(info.target)] : undefined
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
            version: before ? before.count + 1 : 1,
            priorId: before ? before.lastId : null,
          },
        }
      },
    }

    function PreviewCard(react, reactDom) {
      var h = react.createElement
      var useState = react.useState
      var useEffect = react.useEffect

      var COLORS = {
        line: 'var(--dsw-alias-separator, rgba(127,127,127,0.28))',
        dim: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,0.85))',
        text: 'var(--dsw-alias-label-primary, inherit)',
        stage: 'var(--dsw-alias-fill-quaternary, rgba(127,127,127,0.12))',
      }

      /**
       * The viewer's own two buttons, styled in a sheet rather than inline.
       *
       * Everything else in this file styles elements directly, which is fine
       * until a button has to answer the pointer: a solid white button that
       * does not change under the cursor reads as broken before it reads as
       * plain, and `:hover` cannot be written inline at all.
       *
       * The colours have to live here too, not just the hover rules. An
       * element's own `style` attribute outranks any sheet, so leaving
       * `background` and `border` inline lets them win every hover — the
       * transition still runs, which is what makes the result look wired up
       * while the colour never moves. The alternative is `!important` on four
       * declarations, which is the same bug with an override on top.
       *
       * Sized against the harness's shell rather than the card's: these sit
       * over a full-screen view, so at the card's 13px/23px they read as
       * smaller than the controls they are covering. Solid marks the errand —
       * taking the deck away is why the row exists — and the outline marks
       * the exit.
       */
      var MODAL_STYLE_ID = 'pptwise-modal-style'
      var MODAL_BTN_BASE =
        'font:inherit;font-size:13px;padding:7px 16px;border-radius:8px;cursor:pointer;'
      function ensureModalStyles() {
        if (document.getElementById(MODAL_STYLE_ID)) return
        var el = document.createElement('style')
        el.id = MODAL_STYLE_ID
        el.textContent =
          '.pf-mbtn{' +
          MODAL_BTN_BASE +
          'border:1px solid rgba(255,255,255,0.5);background:transparent;color:#fff;' +
          'transition:background-color .12s,border-color .12s}' +
          '.pf-mbtn:hover{background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.8)}' +
          '.pf-mbtn-primary{' +
          MODAL_BTN_BASE +
          'font-weight:600;border:1px solid transparent;background:#fff;color:#111;' +
          'transition:background-color .12s}' +
          '.pf-mbtn-primary:hover{background:#e2e2e2}'
        document.head.appendChild(el)
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
            style: {
              position: 'relative',
              aspectRatio: (props.width || 1280) + ' / ' + (props.height || 720),
              background: COLORS.stage,
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid ' + COLORS.line,
              cursor: props.onClick ? 'zoom-in' : 'default',
              width: '100%',
            },
            onClick: props.onClick,
            role: props.onClick ? 'button' : undefined,
            tabIndex: props.onClick ? 0 : undefined,
            onKeyDown: props.onClick
              ? function (e) {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    props.onClick()
                  }
                }
              : undefined,
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
       * Full-size viewer: the deck's own `preview.html`, in an iframe.
       *
       * Everything a reader does inside it — ←/→, the filmstrip, the
       * light/dark surround, the audit findings panel — belongs to that page,
       * which was written, tested and shipped for the harnesses that have no
       * plugin UI. This modal contributes the two things the page has no way
       * to offer from inside itself: a way out, and the export. It renders on
       * the body (`inBody`), never inside the card.
       */
      function Modal(props) {
        var frameRef = react.useRef(null)

        useEffect(
          function () {
            ensureModalStyles()
            function onKey(e) {
              if (e.key === 'Escape') props.onClose()
            }
            document.addEventListener('keydown', onKey)
            // Once the reader clicks the deck, keystrokes go to the iframe's
            // own document and never reach this one — so Escape has to be
            // heard there too, or it stops working exactly when the modal is
            // in use. The frame is same-origin by construction (its src is
            // this plugin's own route), and the access is guarded anyway:
            // losing Escape is not worth throwing inside an effect for. The
            // listener needs no removal of its own, since it dies with the
            // document when this modal unmounts.
            var frame = frameRef.current
            function listenInside() {
              try {
                var doc = frame.contentDocument
                if (doc) doc.addEventListener('keydown', onKey)
              } catch {
                /* not reachable from here after all — the outer listener stands */
              }
            }
            if (frame) frame.addEventListener('load', listenInside)
            return function () {
              document.removeEventListener('keydown', onKey)
              if (frame) frame.removeEventListener('load', listenInside)
            }
          },
          [props.onClose, props.src],
        )

        return inBody(h(
          'div',
          {
            style: {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              // Opaque, not the usual translucent backdrop. This covers the
              // whole viewport with a document, so there is nothing behind it
              // worth a glimpse of — and a glimpse is all a translucent one
              // gives. At 0.8 the harness's own composer stayed legible right
              // under this modal's buttons and the eye read the two as one
              // strip of controls; at 0.94 its title bar and its `Session
              // log` pill still ghosted through at 6% white, the pill landing
              // 14px outside the edge these buttons are aligned to.
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            },
            onClick: function (e) {
              if (e.target === e.currentTarget) props.onClose()
            },
          },
          h(
            'div',
            {
              style: {
                width: 'min(100%, 1600px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              },
              onClick: function (e) {
                if (e.target === e.currentTarget) props.onClose()
              },
            },
            // Above the frame, not below it. Below, this row lands in the
            // strip of backdrop the harness's own input area occupies, and
            // whatever the backdrop lets through sits on the same baseline.
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  flex: '0 0 auto',
                  // Lines this row's right edge up with the Light/Dark toggle
                  // in the previewed page's own header, which sits one row
                  // below it. That page's own `header` rule reserves the same
                  // inset (`padding:11px 18px`, preview-html.ts); without
                  // matching it, two right-aligned rows 14px apart miss each
                  // other by just enough to look like a mistake, not a choice.
                  paddingRight: 18,
                },
                onClick: function (e) {
                  if (e.target === e.currentTarget) props.onClose()
                },
              },
              props.previewId
                ? h(ExportButton, {
                    previewId: props.previewId,
                    name: props.name,
                    draft: props.draft,
                    status: props.downloadStatus,
                    onStatus: props.onDownloadStatus,
                    className: 'pf-mbtn-primary',
                  })
                : null,
              h(
                'button',
                { onClick: props.onClose, className: 'pf-mbtn' },
                'Close',
              ),
            ),
            h('iframe', {
              ref: frameRef,
              src: props.src,
              title: 'pptwise deck preview',
              style: {
                // Takes the rest of the dialog and lets the page inside do its
                // own layout. Its stage carries `aspect-ratio: 16/9` and sizes
                // itself off the viewport it is handed, so the slide keeps its
                // shape at any frame size. Pinning the *frame* to 16:9 instead
                // would have to reserve room for that page's header and
                // filmstrip, and every guess at how much is wrong the moment
                // either one changes height.
                flex: '1 1 auto',
                width: '100%',
                minHeight: 0,
                border: 0,
                borderRadius: 8,
                background: COLORS.stage,
              },
            }),
          ),
        ))
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
          'button',
          {
            onClick: save,
            className: props.className,
            style: props.style,
            title: isFinal(status)
              ? hintFor(status)
              : status === 'failed'
                ? UNREACHABLE_HINT
                : props.draft
                  ? 'Download the editable .pptx. It is a draft: some pages are still unfilled placeholders'
                  : 'Download the editable .pptx',
          },
          status === 'busy'
            ? 'Saving…'
            : isFinal(status)
              ? exportLabelFor(status)
              : status === 'failed'
                ? 'Retry download'
                : props.label || 'Download .pptx',
        )
      }

      /**
       * The missing card's own line, under the header.
       *
       * Said out loud rather than left to a tooltip: the whole complaint this
       * exists to answer is a card that told the user nothing at all.
       */
      function VerdictNote(props) {
        return h(
          'div',
          { style: { fontSize: 12, color: COLORS.dim, paddingTop: 2 } },
          hintFor(props.verdict),
        )
      }

      /**
       * The badge that marks a deck the route will not serve, and says which
       * kind of "will not".
       *
       * It used to read `gone` whatever had happened, which is how a damaged
       * `record.json` reached the user as a deletion. The word comes from the
       * verdict now, and the verdict comes from a code the route sends.
       */
      function VerdictBadge(props) {
        return h(
          'span',
          {
            title: hintFor(props.verdict),
            style: {
              border: '1px solid ' + COLORS.line,
              borderRadius: 5,
              padding: '0 6px',
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: 10,
              letterSpacing: '0.04em',
            },
          },
          badgeFor(props.verdict),
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

        if (!bundle) {
          // Nothing to draw and nothing said about why: the card refusing to
          // invent a deck it does not have.
          if (verdict === null || verdict === 'alive') return null
          // Otherwise the tool did run, and the transcript still says how long
          // the deck was. That number survives a deleted preview on purpose:
          // the host half keeps no gravestone on disk, so the tool's own
          // summary line, still sitting in the log, is the only evidence this
          // card can still read that nine pages once existed here. A card that vanishes instead is the one thing worse
          // than a card reporting a problem: the user is left doubting the deck
          // was ever generated.
          //
          // The Retry button appears only for the one verdict a retry can
          // change. `refused` and the final verdicts get the same row without
          // it, because a button that re-sends an identical request to a door
          // that just closed is a promise the card cannot keep.
          return h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 0 6px' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLORS.dim } },
              h('span', { style: { color: COLORS.text, fontWeight: 600 } }, 'deck'),
              settled ? h(VerdictBadge, { verdict: verdict }) : null,
              pageCount !== null ? h('span', null, pageCount + ' pages') : null,
              isRetryable(verdict)
                ? h(
                    'button',
                    {
                      onClick: function () {
                        commit({ attempt: deck.attempt + 1 }, { lane: 'deck', ticket: nextTicket() })
                      },
                      title: hintFor(verdict),
                      style: {
                        marginLeft: 'auto',
                        font: 'inherit',
                        fontSize: 12,
                        padding: '3px 10px',
                        borderRadius: 7,
                        border: '1px solid ' + COLORS.line,
                        background: 'transparent',
                        color: COLORS.text,
                        cursor: 'pointer',
                      },
                    },
                    'Retry',
                  )
                : null,
            ),
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
          { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 0 6px' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLORS.dim } },
            h('span', { style: { color: COLORS.text, fontWeight: 600 } }, bundle.title || 'deck'),
            // The deck is on screen and the route has already said it cannot
            // serve it any more. Both halves are true, and the thumbnails are
            // the half worth keeping — they are the deck, not a picture of a
            // button. What goes is the promise that clicking them leads
            // anywhere.
            settled ? h(VerdictBadge, { verdict: verdict }) : null,
            // The deck still has placeholder pages. The export goes out
            // anyway (see `--draft` in preview-tool.js's `execute`), so this
            // badge is what keeps that from being a silent substitution: the
            // user is looking at unfinished work and the file they save says
            // so too.
            bundle.draft
              ? h(
                  'span',
                  {
                    title: 'Some pages are still unfilled placeholders — the export is labelled a draft',
                    style: {
                      border: '1px solid ' + COLORS.line,
                      borderRadius: 5,
                      padding: '0 6px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      fontSize: 10,
                      letterSpacing: '0.04em',
                    },
                  },
                  'draft',
                )
              : null,
            exportable
              ? null
              : h(
                  'span',
                  {
                    title: 'This build needs revision, so it wrote no .pptx',
                    style: {
                      border: '1px solid ' + COLORS.line,
                      borderRadius: 5,
                      padding: '0 6px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      fontSize: 10,
                      letterSpacing: '0.04em',
                    },
                  },
                  'needs revision',
                ),
            h('span', null, bundle.pages.length + ' pages'),
            // Build by build, how far the writing has got: the pages still
            // standing as placeholders are the ones not written yet.
            bundle.draft
              ? h(
                  'span',
                  { 'data-written': '' },
                  t('desk.written', {
                    x: bundle.pages.filter(function (p) { return p.placeholder !== true }).length,
                    n: bundle.pages.length,
                  }),
                )
              : null,
            findingCount > 0 ? h('span', null, findingCount + ' audit findings') : null,
            // No viewer without an id, and none for an id the route has
            // already disowned: the full-size view is a route keyed by it. A
            // button that opened an empty frame would be worse than an absent
            // one, and the thumbnails below go inert for the same reason.
            previewId && !settled
              ? h(
                  'button',
                  {
                    onClick: function () { openViewer(1) },
                    style: {
                      marginLeft: 'auto',
                      font: 'inherit',
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 7,
                      border: '1px solid ' + COLORS.line,
                      background: 'transparent',
                      color: COLORS.text,
                      cursor: 'pointer',
                    },
                  },
                  'Open',
                )
              : null,
            previewId && exportable
              ? h(ExportButton, {
                  previewId: previewId,
                  name: bundle.title,
                  draft: bundle.draft,
                  verdict: verdict,
                  status: deck.download,
                  onStatus: function (next, order) { commit({ download: next }, order) },
                  style: {
                    font: 'inherit',
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 7,
                    border: '1px solid ' + COLORS.line,
                    background: 'transparent',
                    color: COLORS.text,
                    cursor: 'pointer',
                  },
                })
              : null,
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 } },
            stripPages(pages).map(function (page, i) {
              return h(
                'div',
                { key: page.id || i, style: { flex: '0 0 auto', width: 132 } },
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
          settled ? h(VerdictNote, { verdict: verdict }) : null,
          // No id comparison here, and none needed: `deck` is this preview's own
          // entry or the unasked state, so a viewer left open on another deck
          // is not something this can read.
          deck.viewerOpen && previewId && !settled
            ? h(Modal, {
                src: previewHtmlUrl(previewId, deck.viewerPage),
                previewId: exportable ? previewId : null,
                name: bundle.title,
                draft: bundle.draft,
                downloadStatus: deck.download,
                onDownloadStatus: function (next, order) { commit({ download: next }, order) },
                onClose: function () {
                  commit({ viewerOpen: false, viewerPage: 1 }, { lane: 'deck', ticket: nextTicket() })
                },
              })
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
       * The theme wall: one column per theme, its cover over its content
       * page, in the same thumbnail strip the deck card draws. Open shows the
       * contact sheet full size. No download: a wall has no deck behind it.
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
        var buttonStyle = {
          marginLeft: 'auto',
          font: 'inherit',
          fontSize: 12,
          padding: '3px 10px',
          borderRadius: 7,
          border: '1px solid ' + COLORS.line,
          background: 'transparent',
          color: COLORS.text,
          cursor: 'pointer',
        }

        if (!bundle || !Array.isArray(bundle.themes)) {
          if (wall.verdict === null || wall.verdict === 'alive') return null
          return h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 0 6px' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLORS.dim } },
              h('span', { style: { color: COLORS.text, fontWeight: 600 } }, 'themes'),
              isFinal(wall.verdict) ? h(VerdictBadge, { verdict: wall.verdict }) : null,
              isRetryable(wall.verdict)
                ? h(
                    'button',
                    {
                      onClick: function () {
                        update({ attempt: attempt + 1 })
                      },
                      style: buttonStyle,
                    },
                    'Retry',
                  )
                : null,
            ),
            h('div', { style: { fontSize: 12, color: COLORS.dim, paddingTop: 2 } }, wallHintFor(wall.verdict)),
          )
        }

        var slide = bundle.slide || { width: 1280, height: 720 }
        var stamp = wallId.slice(0, 8)
        function open() {
          update({ open: true })
        }

        return h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 0 6px' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLORS.dim } },
            h('span', { style: { color: COLORS.text, fontWeight: 600 } }, bundle.title || 'themes'),
            h('span', null, bundle.themes.length + ' themes'),
            h('button', { onClick: open, style: buttonStyle }, 'Open'),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 } },
            bundle.themes.map(function (theme, i) {
              var pages = Array.isArray(theme.pages) ? theme.pages.filter(hasMarkup) : []
              return h(
                'div',
                {
                  key: theme.id || i,
                  'data-theme': theme.id,
                  style: { flex: '0 0 auto', width: 132, display: 'flex', flexDirection: 'column', gap: 4 },
                },
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
                h(
                  'div',
                  {
                    title: theme.label,
                    style: {
                      fontSize: 11,
                      color: COLORS.dim,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  },
                  // The number the question panel's options start with
                  // ("1 brief"): the model is told this order in the result.
                  h(
                    'span',
                    {
                      'data-theme-number': i + 1,
                      style: {
                        display: 'inline-block',
                        minWidth: 16,
                        marginRight: 5,
                        padding: '0 4px',
                        borderRadius: 4,
                        background: COLORS.stage,
                        color: COLORS.text,
                        fontWeight: 700,
                        textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                      },
                    },
                    String(i + 1),
                  ),
                  h('span', { style: { color: COLORS.text, fontWeight: 600 } }, theme.id),
                  theme.label && theme.label !== theme.id ? ' ' + theme.label : null,
                ),
              )
            }),
          ),
          wall.open
            ? h(Modal, {
                src: previewHtmlUrl(wallId, 1),
                previewId: null,
                onClose: function () {
                  update({ open: false })
                },
              })
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

      var smallButton = {
        font: 'inherit',
        fontSize: 12,
        padding: '3px 10px',
        borderRadius: 7,
        border: '1px solid ' + COLORS.line,
        background: 'transparent',
        color: COLORS.text,
        cursor: 'pointer',
      }

      /** What a card says when the route cannot serve what it was asked for. */
      function Unavailable(props) {
        return h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLORS.dim, padding: '2px 0 6px' } },
          h('span', null, isFinal(props.verdict) ? t('card.unavailable') : UNREACHABLE_HINT),
          isRetryable(props.verdict) ? h('button', { onClick: props.onRetry, style: smallButton }, t('card.retry')) : null,
        )
      }

      /** The outline itself: one row per page, number, page type, heading, and what the page says. */
      function OutlineList(props) {
        var outline = props.outline
        var pages = Array.isArray(outline.pages) ? outline.pages : []
        return h(
          'div',
          { 'data-pptwise-outline': '', style: { display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0 6px' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: COLORS.dim } },
            h('span', { style: { color: COLORS.text, fontWeight: 600 } }, outline.title || t('outline.title')),
            h('span', null, t('outline.pages', { n: pages.length })),
            outline.theme ? h('span', null, t('outline.theme', { theme: outline.theme })) : null,
          ),
          h(
            'ol',
            {
              style: {
                listStyle: 'none',
                margin: 0,
                padding: 0,
                border: '1px solid ' + COLORS.line,
                borderRadius: 8,
                overflow: 'hidden',
              },
            },
            pages.map(function (page, i) {
              return h(
                'li',
                {
                  key: page.id || i,
                  'data-page': page.page,
                  style: {
                    display: 'grid',
                    gridTemplateColumns: '28px 52px minmax(0, 1fr)',
                    alignItems: 'baseline',
                    gap: 8,
                    padding: '7px 10px',
                    borderTop: i === 0 ? 'none' : '1px solid ' + COLORS.line,
                    fontSize: 13,
                    lineHeight: '20px',
                  },
                },
                h('span', { style: { color: COLORS.dim, fontVariantNumeric: 'tabular-nums', textAlign: 'right' } }, String(page.page || i + 1)),
                h(
                  'span',
                  { title: page.kind || undefined, style: { color: COLORS.dim, fontSize: 12 } },
                  t('type.' + (page.type || 'content')),
                ),
                h(
                  'span',
                  { style: { minWidth: 0 } },
                  h('span', { style: { color: COLORS.text, fontWeight: 500 } }, page.heading),
                  page.summary ? h('span', { style: { color: COLORS.dim, marginLeft: 8 } }, page.summary) : null,
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
          return h(Unavailable, { verdict: got.verdict, onRetry: got.retry })
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

      /** One page's markup from the route, for pages that did not travel with the bundle. */
      function pageUrl(id, index) {
        return previewBundleUrl(id) + '/page/' + (index + 1)
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
            role: props.onClick ? 'button' : undefined,
            tabIndex: props.onClick ? 0 : undefined,
            onClick: props.onClick,
            title: props.title,
            style: {
              position: 'relative',
              aspectRatio: (props.width || 1280) + ' / ' + (props.height || 720),
              background: COLORS.stage,
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid ' + COLORS.line,
              cursor: props.onClick ? 'zoom-in' : 'default',
              width: '100%',
            },
          },
          props.src
            ? h('img', { src: props.src, alt: '', loading: 'lazy', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' } })
            : null,
        )
      }

      /** Two versions of every changed page, side by side, full screen. */
      function CompareModal(props) {
        useEffect(
          function () {
            ensureModalStyles()
            function onKey(e) {
              if (e.key === 'Escape') props.onClose()
            }
            document.addEventListener('keydown', onKey)
            return function () {
              document.removeEventListener('keydown', onKey)
            }
          },
          [props.onClose],
        )
        var slide = props.slide
        var rows = props.diff.changed
          .map(function (row) {
            return { label: t('desk.page', { n: row.index + 1 }), mark: row.mark, before: row.priorIndex, after: row.index }
          })
          .concat(
            props.diff.removed.map(function (row) {
              return { label: t('compare.removed'), mark: 'removed', before: row.priorIndex, after: null }
            }),
          )
        function side(id, index, empty) {
          if (index === null) {
            return h(
              'div',
              {
                style: {
                  aspectRatio: slide.width + ' / ' + slide.height,
                  border: '1px dashed rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                },
              },
              empty,
            )
          }
          return h('img', {
            src: pageUrl(id, index),
            alt: '',
            style: { display: 'block', width: '100%', aspectRatio: slide.width + ' / ' + slide.height, borderRadius: 6, background: '#222' },
          })
        }
        return inBody(
          h(
            'div',
            {
              'data-pptwise-compare': '',
              style: { position: 'fixed', inset: 0, zIndex: 9999, background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', padding: 24, gap: 14 },
              onClick: function (e) {
                if (e.target === e.currentTarget) props.onClose()
              },
            },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' } },
              h('span', { style: { fontSize: 15, fontWeight: 600 } }, t('compare.title', { from: props.version - 1, to: props.version })),
              h('button', { onClick: props.onClose, className: 'pf-mbtn', style: { marginLeft: 'auto' } }, t('compare.close')),
            ),
            h(
              'div',
              { style: { flex: '1 1 auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 } },
              h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)' } },
                h('span', null, t('compare.before')),
                h('span', null, t('compare.after')),
              ),
              rows.map(function (row, i) {
                return h(
                  'div',
                  { key: i, 'data-compare-row': row.mark, style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  h(
                    'div',
                    { style: { fontSize: 13, fontWeight: 600 } },
                    row.label,
                    row.mark === 'added' ? ' · ' + t('desk.addedMark') : row.mark === 'changed' ? ' · ' + t('desk.changedMark') : '',
                  ),
                  h(
                    'div',
                    { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
                    side(props.priorId, row.before, t('compare.none')),
                    side(props.id, row.after, t('compare.removed')),
                  ),
                )
              }),
            ),
          ),
        )
      }

      var deskFrame = {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '10px 12px 12px',
        border: '0.5px solid var(--dsw-alias-border-l1, ' + COLORS.line + ')',
        borderRadius: 'var(--dsw-radius-xl, 12px)',
        color: COLORS.text,
      }

      var deskTag = {
        border: '1px solid ' + COLORS.line,
        borderRadius: 5,
        padding: '0 6px',
        fontSize: 11,
        color: COLORS.dim,
      }

      /**
       * The draft desk: this turn's deck, kept below the turn where the work
       * group cannot fold it away. The strip shows every page, marks the ones
       * that changed since the last version of the same deck, and lets the
       * user open it full screen, download it, compare it with the last
       * version, or start a message about one page.
       */
      function DraftDesk(props) {
        var entry = props.entry
        var got = useRouteBundle(entry.id)
        var prior = useRouteBundle(entry.priorId || null)
        var ui = useState({ viewer: 0, compare: false, download: 'idle' })
        function set(change) {
          ui[1](function (prev) {
            return Object.assign({}, prev, change)
          })
        }
        var bundle = got.bundle
        if (!bundle || !Array.isArray(bundle.pages)) {
          if (got.verdict === null || got.verdict === 'alive') return null
          return h('div', { 'data-pptwise-desk': '', style: deskFrame }, h(Unavailable, { verdict: got.verdict, onRetry: got.retry }))
        }
        var pages = viewablePages(bundle)
        var slide = bundle.slide || { width: 1280, height: 720 }
        var exportable = bundle.exportable !== false
        var written = pages.filter(function (page) {
          return page.placeholder !== true
        }).length
        var diff = entry.priorId ? diffPages(bundle, prior.bundle) : { comparable: false, marks: {}, changed: [], removed: [] }
        var differs = diff.changed.length > 0 || diff.removed.length > 0
        var button = {
          font: 'inherit',
          fontSize: 12,
          padding: '3px 10px',
          borderRadius: 7,
          border: '1px solid ' + COLORS.line,
          background: 'transparent',
          color: COLORS.text,
          cursor: 'pointer',
        }
        var stamp = entry.id.slice(0, 8)
        return h(
          'div',
          { 'data-pptwise-desk': entry.id, style: deskFrame },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12, color: COLORS.dim } },
            h('span', { style: { color: COLORS.text, fontWeight: 600, fontSize: 13 } }, bundle.title || 'deck'),
            h('span', { 'data-desk-version': entry.version, style: deskTag }, t('desk.version', { n: entry.version })),
            h('span', null, t('desk.pages', { n: pages.length })),
            bundle.draft ? h('span', { 'data-desk-written': '' }, t('desk.written', { x: written, n: pages.length })) : null,
            exportable ? null : h('span', { style: deskTag }, t('desk.needsRevision')),
            diff.comparable
              ? h(
                  'span',
                  { 'data-desk-diff': '' },
                  differs
                    ? [diff.changed.length > 0 ? t('desk.changed', { n: diff.changed.length }) : null, diff.removed.length > 0 ? t('desk.removed', { n: diff.removed.length }) : null]
                        .filter(Boolean)
                        .join(' · ')
                    : t('desk.unchanged'),
                )
              : null,
            h(
              'span',
              { style: { marginLeft: 'auto', display: 'flex', gap: 8 } },
              h('button', { onClick: function () { set({ viewer: 1 }) }, style: button }, t('desk.open')),
              exportable
                ? h(ExportButton, {
                    previewId: entry.id,
                    name: bundle.title,
                    draft: bundle.draft,
                    verdict: got.verdict,
                    status: ui[0].download,
                    onStatus: function (next) { set({ download: next }) },
                    label: t('desk.download'),
                    style: button,
                  })
                : null,
              diff.comparable && differs
                ? h('button', { onClick: function () { set({ compare: true }) }, style: button }, t('desk.compare'))
                : null,
            ),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 } },
            pages.map(function (page, i) {
              var n = pageNumberOf(page, i)
              var mark = diff.comparable ? diff.marks[pageKey(page)] : undefined
              return h(
                'div',
                { key: pageKey(page) || i, 'data-desk-page': n, 'data-desk-mark': mark || undefined, style: { flex: '0 0 auto', width: 168, display: 'flex', flexDirection: 'column', gap: 4 } },
                h(
                  'div',
                  { style: { position: 'relative', borderRadius: 7, outline: mark ? '2px solid var(--dsw-alias-state-business-primary, #3b82f6)' : 'none', outlineOffset: 1 } },
                  h(PageTile, {
                    page: page,
                    src: pageUrl(entry.id, i),
                    prefix: 'pwd' + stamp + '-' + i + '-',
                    width: slide.width,
                    height: slide.height,
                    title: t('desk.page', { n: n }),
                    onClick: function () { set({ viewer: n }) },
                  }),
                ),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLORS.dim, whiteSpace: 'nowrap' } },
                  h('span', null, t('desk.page', { n: n })),
                  mark
                    ? h('span', { style: { color: 'var(--dsw-alias-state-business-primary, #3b82f6)', fontWeight: 600 } }, t(mark === 'added' ? 'desk.addedMark' : 'desk.changedMark'))
                    : null,
                  props.editPage
                    ? h(
                        'button',
                        {
                          'data-desk-edit': n,
                          onClick: function () { props.editPage(n) },
                          style: { marginLeft: 'auto', font: 'inherit', fontSize: 11, padding: '1px 6px', border: '1px solid ' + COLORS.line, borderRadius: 5, background: 'transparent', color: COLORS.text, cursor: 'pointer' },
                        },
                        t('desk.edit'),
                      )
                    : null,
                ),
              )
            }),
          ),
          ui[0].viewer > 0
            ? h(Modal, {
                src: previewHtmlUrl(entry.id, ui[0].viewer),
                previewId: exportable ? entry.id : null,
                name: bundle.title,
                draft: bundle.draft,
                downloadStatus: ui[0].download,
                onDownloadStatus: function (next) { set({ download: next }) },
                onClose: function () { set({ viewer: 0 }) },
              })
            : null,
          ui[0].compare && diff.comparable
            ? h(CompareModal, {
                id: entry.id,
                priorId: entry.priorId,
                version: entry.version,
                slide: slide,
                diff: diff,
                onClose: function () { set({ compare: false }) },
              })
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
          { 'data-pptwise-tail': entry.kind, style: deskFrame },
          h(entry.kind === 'outline' ? PptwiseOutlineCard : PptwiseThemesCard, { key: entry.id, block: block }),
        )
      }

      return { deck: PptwisePreviewCard, themes: PptwiseThemesCard, outline: PptwiseOutlineCard, tail: DraftTail }
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
      var cards = PreviewCard(react, reactDom)
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
    }

    /**
     * Start a message about one page: the composer gets "Page N: " (in the
     * harness's language) and the keyboard. Whatever the user had already
     * typed stays, with the prefix on a new line after it.
     */
    function editPageIn(sessions, sessionId, n) {
      var binding = sessions.binding(sessionId)
      var conversation = binding && binding.ctx && typeof binding.ctx.get === 'function' ? binding.ctx.get('conversation') : undefined
      if (!conversation || !conversation.input || typeof conversation.input.for !== 'function') {
        console.warn('[pptwise] no composer to prefill for this session')
        return
      }
      var input = conversation.input.for(binding.ctx)
      var prefix = t('edit.prefix', { n: n })
      var current = ''
      try {
        var snapshot = input.state && typeof input.state.getSnapshot === 'function' ? input.state.getSnapshot() : undefined
        current = (snapshot && typeof snapshot.draft === 'string' && snapshot.draft) || ''
      } catch {
        current = ''
      }
      var kept = current.replace(/\s+$/, '')
      input.setDraft(kept === '' ? prefix : kept + '\n' + prefix)
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
      previewHtmlUrl: previewHtmlUrl,
      previewBundleUrl: previewBundleUrl,
      STRIP_PAGES: STRIP_PAGES,
      TOOL_NAME: TOOL_NAME,
      BUILD_TOOL_NAME: BUILD_TOOL_NAME,
      THEMES_TOOL_NAME: THEMES_TOOL_NAME,
      OUTLINE_TOOL_NAME: OUTLINE_TOOL_NAME,
    }
    return module.exports
  },
})
