import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#F6F1E7"; SURF = "#FBF8F1"; INK = "#221E18"; RED = "#A63A2B"; MUTED = "#675E51"; LINE = "#E4DFD2"; SLATE = "#4A5864"; BROWN = "#7A6248"
GREEN = "#3F5E48"; TINT = "#F1E1DA"; WARMGREY = "#B9AE9C"
SONG = "'Songti SC', 'STSong', 'SimSun', serif"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
MONO = "'Courier New', Courier, monospace"
IMG = {k: "__%s__" % k for k in ["friday-office", "service-desk", "planner", "headset", "weekend", "standup"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(16)]
TOTAL = 16

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=RED, sw=2):
    s = size / 24
    return '<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (x, y, s, color, sw, _icon_svg(name))


def page(title, inner, w=1280, h=720):
    return """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>""" + title + """</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + INK + "; font-family: " + SANS + """">
""" + inner + """
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":""" + str(w) + ""","height":""" + str(h) + """}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
"""


def box(x, y, w, h, style="", content=""):
    s = "position: absolute; left: %dpx; top: %dpx; width: %dpx; " % (x, y, w)
    if h is not None:
        s += "height: %dpx; " % h
    return '<div style="' + s + style + '">' + content + '</div>\n'


def font(size, lh, color=INK, weight=400, extra="", fam=None):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s%s" % (size, lh, color, weight, ("font-family: " + fam + "; ") if fam else "", extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400, fam=SANS):
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam.replace("'", ""), s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def runhead(pg):
    out = box(64, 26, 400, 18, font(12, 18, RED, 700, "letter-spacing: 6px", MONO), "MEMORANDUM")
    out += box(816, 26, 400, 18, font(12, 18, MUTED, 400, "text-align: right", MONO), "四天工作制试点 · 决定")
    out += box(64, 48, 1152, 2, "background: " + RED) + box(64, 53, 1152, 1, "background: " + RED)
    out += box(64, 686, 600, 18, font(12, 18, MUTED, 400, "", MONO), "管理层 · 人力资源部")
    out += box(816, 686, 400, 18, font(12, 18, MUTED, 400, "text-align: right", MONO), "第 %d 页 共 %d 页" % (pg, TOTAL))
    return out


def head(pg, label, title):
    out = runhead(pg)
    out += box(64, 84, 150, 30, font(22, 30, RED, 700, "", SONG), label)
    out += box(64, 118, 24, 2, "background: " + RED)
    out += box(240, 74, 976, 84, "display: flex; flex-direction: column; justify-content: flex-end; " + font(31, 42, INK, 700, "", SONG), "<div>" + title + "</div>")
    out += box(240, 170, 976, 1, "background: " + INK)
    return out


def source(t_, x=240, y=650, w=976):
    return box(x, y, w, 32, font(12, 16, MUTED), t_)


def exhibit(key, x, y, w, h, cap, rot=0):
    st = "background: #FFFFFF; padding: 8px 8px 30px 8px; box-sizing: border-box; box-shadow: 0 2px 8px rgba(34,30,24,0.18); transform: rotate(%.1fdeg)" % rot
    inner = '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w - 16, h - 38)
    inner += '<div style="' + font(12, 22, MUTED, 400, "", MONO) + '">' + cap + '</div>'
    return box(x, y, w, h, st, inner)


def stamp(x, y, rot=-8, label="已决定", sub="2026 · 10"):
    st = "border: 3px solid " + RED + "; padding: 6px 14px; box-sizing: border-box; transform: rotate(%ddeg); text-align: center; opacity: 0.88" % rot
    inner = '<div style="' + font(30, 36, RED, 700, "letter-spacing: 6px", SONG) + '">' + label + '</div><div style="' + font(12, 16, RED, 700, "letter-spacing: 2px", MONO) + '">' + sub + '</div>'
    return box(x, y, 150, 74, st, inner)


pages = []

# 1 cover
c = box(64, 64, 400, 22, font(14, 22, RED, 700, "letter-spacing: 8px", MONO), "MEMORANDUM")
c += box(64, 92, 1152, 2, "background: " + RED) + box(64, 97, 1152, 1, "background: " + RED)
fields = [("致", "全体员工、各部门负责人"), ("发", "管理层 · 人力资源部"), ("日期", "2026 年 10 月"), ("事由", "试行每周 32 小时、薪酬不变的四天工作制")]
y = 124
for k, v in fields:
    c += box(64, y, 90, 26, font(15, 26, MUTED, 400, "", MONO), k + "：")
    c += box(150, y, 560, 26, font(17, 26, INK), v)
    y += 34
c += box(64, 270, 680, 1, "background: " + LINE)
c += box(64, 300, 720, 190, "display: flex; flex-direction: column; justify-content: flex-end; " + font(60, 80, INK, 700, "", SONG), "<div>2027 年上半年，<br>每周工作四天</div>")
c += box(64, 510, 64, 3, "background: " + RED)
c += box(64, 530, 680, 60, font(20, 30, MUTED), "1 月 4 日起，为期六个月")
c += exhibit("friday-office", 800, 150, 400, 330, "附图 1 · 周五早晨的办公室（示意）", 2)
c += stamp(830, 520)
pages.append(("1 封面", c))

# 2 decision clauses
c = head(2, "决定", "每周 32 小时，薪酬不变")
cl = [("工时与薪酬", "全体全职员工每周 32 小时，工资、奖金基数、年假和福利都不变"), ("时间", "11 月至 12 月准备，2027 年 1 月 4 日至 6 月 30 日试行"),
      ("模式", "各部门在三种模式里选一种，客服和连续在岗的岗位必须错峰"), ("去留", "7 月按事先定好的指标公布去留，触发停止条件的部门随时恢复五天")]
y = 196
for i, (a, b) in enumerate(cl):
    em = i == 3
    if em:
        c += box(240, y, 976, 100, "background: " + TINT)
    c += box(240, y + 100, 976, 1, "background: " + LINE)
    c += box(260, y + 22, 90, 50, font(36, 50, RED, 700, "", SONG), "一二三四"[i] + "、")
    c += box(360, y + 22, 240, 32, font(22, 32, RED if em else INK, 700, "", SONG), a)
    c += box(600, y + 24, 596, 56, font(18, 28, INK), b)
    y += 106
pages.append(("2 决定条款", c))

# 3 reasons with icons + exhibit
c = head(3, "理由", "降低倦怠、留住人、招到人，不是指望营收上涨")
rs = [("heart-pulse", "降低倦怠", "82%", "英国试点一年后回访 28 家组织，提到员工福祉改善"), ("user-check", "留住人", "50%", "同一回访提到离职减少。15% 的员工说加多少薪都不回五天"),
      ("user-plus", "招到人", "32%", "同一回访提到招聘改善。南剑桥郡议会改四天后，求职申请增加超过 120%")]
s = ""
for i, (ic, a, big, b) in enumerate(rs):
    y = 196 + i * 146
    if i:
        c += box(240, y - 10, 600, 1, "background: " + LINE)
    s += icon(ic, 244, y + 6, 28, RED)
    c += box(290, y + 2, 200, 34, font(22, 34, INK, 700, "", SONG), a)
    c += box(290, y + 40, 160, 60, font(48, 60, RED, 700, "", SONG), big)
    c += box(460, y + 44, 380, 84, font(16, 26, INK), b)
c += svg(s)
c += exhibit("weekend", 880, 196, 336, 300, "附图 2 · 工作日早晨（示意）", -2)
c += box(880, 530, 336, 90, "border-left: 0; border-top: 2px solid " + RED + "; padding-top: 12px; box-sizing: border-box; " + font(17, 26, RED, 700, "", SONG), "营收的准确说法是「大体持平」")
c += source("来源：Autonomy 等，英国试点报告（2023 年 2 月、2024 年 2 月），单位和员工自报。索尔福德大学（2025 年 7 月）。配图为 AI 生成")
pages.append(("3 理由", c))

# 4 evidence slope chart
c = head(4, "证据", "最硬的证据在身心：试点组倦怠下降，对照组没变")
s = ""
mets = [("倦怠（越低越好，1 到 5）", 2.83, 2.38, 2.90, 2.94), ("心理健康（1 到 5）", 2.93, 3.32, 2.90, 2.93), ("身体健康（1 到 5）", 3.01, 3.29, 3.06, 3.09)]
for i, (nm, a, b, ca, cb) in enumerate(mets):
    x0 = 240 + i * 228; xa, xb = x0 + 52, x0 + 162; y0, y1 = 250, 540; lo, hi = 2.2, 3.5
    def yv(v): return y1 - (v - lo) / (hi - lo) * (y1 - y0)
    s += t(x0, 214, nm, 14, INK, "start", 700)
    s += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (xa, y0 - 10, xa, y1 + 10, LINE) + '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (xb, y0 - 10, xb, y1 + 10, LINE)
    s += t(xa, y1 + 34, "试行前", 13, MUTED, "middle") + t(xb, y1 + 34, "试行后", 13, MUTED, "middle")
    s += '<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="%s" stroke-width="2" stroke-dasharray="4 4"/>' % (xa, yv(ca), xb, yv(cb), WARMGREY)
    s += '<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="%s" stroke-width="3"/>' % (xa, yv(a), xb, yv(b), RED)
    for (xx, v, col) in [(xa, ca, WARMGREY), (xb, cb, WARMGREY), (xa, a, RED), (xb, b, RED)]:
        s += '<circle cx="%d" cy="%.1f" r="5" fill="%s"/>' % (xx, yv(v), col)
    s += t(xb + 12, yv(b) + 5, "%.2f" % b, 15, RED, "start", 700, MONO) + t(xa - 12, yv(a) + 5, "%.2f" % a, 13, RED, "end", 400, MONO)
    s += t(xb + 12, yv(cb) + 5, "%.2f" % cb, 13, MUTED, "start", 400, MONO)
s += '<line x1="260" y1="604" x2="292" y2="604" stroke="%s" stroke-width="3"/>' % RED + t(300, 609, "试点组 141 家，2,896 人", 14, RED, "start", 700)
s += '<line x1="520" y1="604" x2="552" y2="604" stroke="%s" stroke-width="2" stroke-dasharray="4 4"/>' % WARMGREY + t(560, 609, "对照组 12 家，285 人", 14, MUTED)
c += svg(s)
c += box(950, 196, 266, 400, "background: " + SURF + "; border: 1px solid " + LINE + "; padding: 22px; box-sizing: border-box")
c += svg(icon("triangle-alert", 970, 216, 20, RED))
c += box(998, 215, 200, 22, font(13, 22, RED, 700, "", MONO), "作者自注")
c += box(970, 252, 226, 90, font(17, 26, INK, 400, "font-style: italic", "Georgia, serif"), "“our findings probably overestimate the true effect”")
c += box(970, 352, 226, 1, "background: " + LINE)
c += box(970, 366, 226, 120, font(15, 24, MUTED), "非随机，公司自愿参加，结果是员工自报。可信的是方向，不是幅度。")
c += source("来源：Fan 等，Nature Human Behaviour（2025 年 7 月）。2025-07-21 在线发表")
pages.append(("4 身心证据", c))

# 5 diverging bars
c = head(5, "代价", "代价也真实：71% 的人倦怠下降，62% 的人说节奏变快")
rows = [("倦怠", 71, 7, 22), ("工作压力", 39, 48, 13), ("睡眠困难", 40, 45, 15), ("工作量", 2, 78, 20), ("工作节奏", 2, 36, 62)]
s = t(560, 206, "← 变好", 14, GREEN, "end", 700) + t(760, 206, "变差 →", 14, RED, "start", 700) + t(660, 206, "不变", 13, MUTED, "middle")
cx = 660; k = 3.4
for i, (nm, good, same, bad) in enumerate(rows):
    y = 226 + i * 76; em = nm == "工作节奏"
    s += t(250, y + 34, nm, 18, RED if em else INK, "start", 700)
    s += rect(cx - same / 2 * k - good * k, y + 12, good * k, 34, GREEN) + rect(cx - same / 2 * k, y + 12, same * k, 34, LINE) + rect(cx + same / 2 * k, y + 12, bad * k, 34, RED)
    s += t(cx - same / 2 * k - good * k - 10, y + 35, "%d%%" % good, 16, GREEN, "end", 700, MONO) + t(cx + same / 2 * k + bad * k + 10, y + 35, "%d%%" % bad, 18 if em else 16, RED, "start", 700, MONO)
c += svg(s)
c += box(1040, 226, 176, 300, "border-left: 1px solid " + LINE + "; padding-left: 20px; box-sizing: border-box")
c += box(1060, 226, 156, 22, font(13, 22, MUTED, 400, "", MONO), "每周实际工时")
c += box(1060, 254, 156, 52, font(40, 52, INK, 700, "white-space: nowrap", SONG), "38→34")
c += box(1060, 310, 156, 80, font(15, 24, MUTED), "只少了 4 小时，不是 8 小时")
c += source("来源：Autonomy 等，英国试点报告（2023 年 2 月），员工自报。「变好」含节奏变慢、工作量减少")
pages.append(("5 代价", c))

# 6 revenue quote
c = head(6, "营收", "营收的准确说法是「大体持平」，不是「大涨」")
c += box(232, 186, 80, 100, font(120, 120, RED, 700, "opacity: 0.25", "Georgia, serif"), "“")
c += box(240, 256, 640, 130, font(24, 36, INK, 400, "", MONO), "Companies' revenue, for instance, stayed broadly the same over the trial period, rising by 1.4% on average.")
c += box(240, 406, 640, 22, font(14, 22, MUTED, 400, "", MONO), "Autonomy 等，英国试点报告，2023 年 2 月")
c += box(240, 452, 640, 1, "background: " + LINE)
c += box(240, 476, 60, 26, font(14, 26, RED, 700, "", MONO), "意为")
c += box(300, 470, 580, 80, font(26, 38, INK, 700, "", SONG), "试点期间营收大体持平，按规模加权平均增长 1.4%")
c += box(920, 200, 296, 400, "background: " + SURF + "; border: 1px solid " + LINE + "; padding: 22px; box-sizing: border-box")
c += box(942, 218, 252, 22, font(13, 22, RED, 700, "", MONO), "同一份报告，两种算法")
two = [("+1.4%", "23 家，试验起点到终点", True), ("+34.5%", "另一批 24 家，对比上年同期", False)]
for i, (v, d, em) in enumerate(two):
    y = 256 + i * 150
    if i:
        c += box(942, y - 16, 252, 1, "background: " + LINE)
    c += box(942, y, 252, 56, font(46, 56, RED if em else INK, 700, "", SONG), v)
    c += box(942, y + 62, 252, 50, font(15, 24, MUTED), d)
c += box(942, 560, 252, 30, font(13, 20, MUTED), "不能混用，引用时两种都写清")
pages.append(("6 营收原话", c))

# 7 retention table with source-type tags
c = head(7, "持续性", "九成坚持出自倡导组织的统计，独立跟踪的数字低得多")
cols = [("试点", 240, 200), ("时点", 440, 160), ("仍在实行", 600, 200), ("样本", 800, 100), ("来源性质", 920, 296)]
for lab, x, w in cols:
    c += box(x + 8, 188, w, 22, font(13, 22, MUTED, 400, "", MONO), lab)
c += box(240, 214, 976, 2, "background: " + INK)
rt = [("英国", "试点结束时", "92%", "61 家", "学者撰写，倡导组织参与", "adv"), ("英国", "一年后", "至少 89%", "61 家", "同上", "adv"), ("倡导组织全球样本", "12 至 24 个月", "90%", "197 家", "工作论文，未经同行评审", "adv"),
      ("德国", "试点结束时", "73%", "41 家", "大学报告，倡导组织参与", "uni"), ("德国", "约两年后", "70%", "40 家", "大学跟踪报告", "uni"), ("葡萄牙", "试点结束时", "17 家，5 家缩小", "21 家", "政府发起，大学报告", "uni"),
      ("巴西", "约一年后", "10%（2 家）", "20 家", "媒体报道", "med")]
y = 216
for i, (a, b, d, n, ty, kind) in enumerate(rt):
    em = a == "巴西"
    if em:
        c += box(240, y, 976, 56, "background: " + TINT)
    c += box(240, y + 56, 976, 1, "background: " + LINE)
    c += box(248, y + 15, 190, 26, font(17, 26, RED if em else INK, 700 if em else 400), a)
    c += box(448, y + 15, 150, 26, font(15, 26, MUTED), b)
    c += box(608, y + 12, 190, 32, font(22, 32, RED if em else INK, 700, "white-space: nowrap", SONG), d)
    c += box(808, y + 15, 100, 26, font(15, 26, MUTED, 400, "", MONO), n)
    tc = {"adv": BROWN, "uni": SLATE, "med": RED}[kind]
    tl = {"adv": "倡导", "uni": "独立", "med": "媒体"}[kind]
    c += box(928, y + 16, 44, 24, "border: 1px solid " + tc + "; box-sizing: border-box; text-align: center; " + font(12, 22, tc, 700), tl)
    c += box(984, y + 15, 230, 26, font(14, 26, MUTED, 400, "white-space: nowrap; overflow: hidden; text-overflow: ellipsis"), ty)
    y += 57
c += source("来源：Autonomy 等（2023、2024 年），Schor 等（2025 年），明斯特大学（2024、2026 年），Gomes 等（2024 年），InfoMoney（2025 年）")
pages.append(("7 保留率表", c))

# 8 pros cons
c = head(8, "权衡", "证据支持有边界、能叫停的试点，不支持「少一天营收会涨」")
pros = [("倦怠下降，身心健康改善", "141 家组织，有对照组，但非随机、员工自报"), ("多数公司试完愿意继续", "英国 61 家，一年后至少 89% 仍在实行"), ("先改流程的公司更稳", "葡萄牙改造两项以上的公司只有 8% 退回")]
cons = [("营收没有因此上涨", "英国 +1.4%，德国无显著差异，巴西 27.3% 的公司下降"), ("节奏变快，压力转移", "英国 62% 说节奏变快，巴西 33.3% 的公司专门加人"),
        ("客服和连续在岗岗位最难", "Krystal 客服错峰后支持变慢、员工更累，退回五天"), ("时间一长有人退出", "德国两年后 30% 不再缩时，巴西 20 家只剩 2 家")]
s = ""
c += box(240, 186, 470, 24, font(15, 24, GREEN, 700, "", MONO), "站得住的") + box(746, 186, 470, 24, font(15, 24, RED, 700, "", MONO), "要当心的")
for col, (items, x, ic, colr) in enumerate([(pros, 240, "check", GREEN), (cons, 746, "x", RED)]):
    y = 220
    for a, b in items:
        c += box(x, y, 470, 1, "background: " + LINE)
        s += icon(ic, x + 2, y + 16, 22, colr, 2.5)
        c += box(x + 36, y + 12, 430, 28, font(18, 28, INK, 700), a)
        c += box(x + 36, y + 42, 430, 40, font(14, 22, MUTED), b)
        y += 86
c += svg(s)
c += box(240, 576, 976, 60, "background: " + INK + "; box-sizing: border-box; padding: 0 24px; display: flex; align-items: center; " + font(19, 28, "#FBF8F1", 700, "", SONG), "所以我们试，但先定好边界、指标和停止条件，再开始")
c += source("来源：Fan 等 2025，Autonomy 等 2023、2024，Gomes 等 2024，明斯特大学 2026，巴西试点报告 2024，InfoMoney 2025，Krystal 2023", y=648)
pages.append(("8 正反权衡", c))

# 9 three models with exhibits
c = head(9, "做法", "三种模式按部门选，客服和连续在岗的岗位一律错峰")
md = [("friday-office", "全员周五", "整个部门周五休息", "协作密集、对外联系少的团队", "英国试点 32% 的公司", False),
      ("service-desk", "错峰轮休", "组员分别休周一到周五中的一天", "客服、运维等需要五天覆盖的岗位", "英国试点 25% 的公司", True),
      ("planner", "两周九天", "两周休一天，其余九天每天约 7.1 小时", "整天离开有困难的交付团队", "葡萄牙试点六成以上员工", False)]
for i, (k, nm, how, who, freq, em) in enumerate(md):
    x = 240 + i * 330
    c += exhibit(k, x, 186, 310, 196, "附图 %d · %s（示意）" % (i + 3, nm), [-1.5, 1, -1][i])
    c += box(x, 398, 310, 32, font(22, 32, RED if em else INK, 700, "", SONG), nm + ("　<span style=\"" + font(12, 20, "#FFF", 700) + "background:" + RED + ";padding:2px 8px\">客服用这个</span>" if em else ""))
    for j, (lab, val) in enumerate([("怎么休", how), ("适合谁", who), ("别处多常见", freq)]):
        y = 438 + j * 58
        c += box(x, y, 310, 1, "background: " + LINE)
        c += box(x, y + 6, 310, 18, font(12, 18, MUTED, 400, "", MONO), lab)
        c += box(x, y + 24, 310, 30, font(15, 22, INK), val)
c += source("来源：Autonomy 等，英国试点报告（2023 年 2 月）。Gomes 等（2024 年 7 月）。同一部门只用一种模式，这是 Magyar Telekom 叫停的原因之一。配图为 AI 生成")
pages.append(("9 三种模式", c))

# 10 coverage week grid
c = head(10, "底线", "错峰的底线：每个工作日都有八成人在岗")
s = ""
days = ["周一", "周二", "周三", "周四", "周五"]
gx, gy, cw, rh = 330, 214, 84, 30
s += t(240, gy - 14, "示例：十人客服组的错峰排班", 14, MUTED)
for j, d in enumerate(days):
    s += t(gx + j * cw + cw / 2, gy + 16, d, 14, INK, "middle", 700)
for r in range(10):
    y = gy + 26 + r * rh
    s += icon("user", 244, y + 6, 16, MUTED, 2) + t(266, y + 19, "组员 " + "ABCDEFGHIJ"[r], 13, MUTED, "start", 400, MONO)
    off = r // 2
    for j in range(5):
        x = gx + j * cw
        if j == off:
            s += rect(x + 3, y + 3, cw - 6, rh - 6, "none", 'stroke="%s" stroke-width="1.5" stroke-dasharray="3 3"' % RED) + t(x + cw / 2, y + 20, "休", 13, RED, "middle", 700)
        else:
            s += rect(x + 3, y + 3, cw - 6, rh - 6, INK, 'opacity="0.82"')
yb = gy + 26 + 10 * rh + 8
s += '<line x1="240" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="2"/>' % (yb, gx + 5 * cw, yb, INK)
s += t(244, yb + 26, "在岗", 14, INK, "start", 700)
for j in range(5):
    s += t(gx + j * cw + cw / 2, yb + 27, "8 / 10", 15, RED, "middle", 700, MONO)
c += svg(s)
c += exhibit("headset", 820, 186, 396, 232, "附图 7 · 错峰后的客服席位（示意）", 1)
ev = [("headset", "50%", "最忙那天在岗", "Krystal"), ("clock", "94% → 92%", "三日内首次回复率", "苏格兰 SOSE"), ("building-2", "21 / 24", "服务指标改善或持平", "南剑桥郡议会")]
s = ""
for i, (ic, v, lab, who) in enumerate(ev):
    y = 440 + i * 68
    c += box(820, y + 60, 396, 1, "background: " + LINE)
    s += icon(ic, 820, y + 18, 20, RED)
    c += box(850, y + 6, 180, 22, font(14, 22, INK, 700), lab)
    c += box(850, y + 30, 180, 20, font(12, 20, MUTED, 400, "", MONO), who)
    c += box(1030, y + 8, 186, 44, font(30, 44, INK, 700, "white-space: nowrap; text-align: right", SONG), v)
c += svg(s)
c += source("来源：Krystal 官网（2023 年 9 月），Civil Service World（2025 年 8 月），索尔福德大学（2025 年 7 月）")
pages.append(("10 每日底线", c))

# 11 arithmetic worked on paper
c = head(11, "算术", "总产出不变，每小时产出要提高 25%")
c += box(240, 200, 640, 420, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box; background-image: repeating-linear-gradient(transparent 0 47px, " + LINE + " 47px 48px)")
lines_ = [("每周工时", "40 小时 → 32 小时"), ("总产出", "不变"), ("每小时产出", "40 ÷ 32 = 1.25")]
y = 248
for a, b in lines_:
    c += box(270, y, 200, 48, font(18, 48, MUTED, 400, "", MONO), a)
    c += box(470, y, 380, 48, font(24, 48, INK, 400, "", MONO), b)
    y += 48
c += box(270, y - 2, 560, 2, "background: " + INK)
c += box(270, y, 200, 48, font(18, 48, MUTED, 400, "", MONO), "要提高")
c += box(470, y - 4, 380, 130, font(110, 130, RED, 700, "", SONG), "25%")
c += box(920, 200, 296, 420, "border-left: 2px solid " + RED + "; padding-left: 24px; box-sizing: border-box")
c += box(944, 204, 272, 22, font(13, 22, RED, 700, "", MONO), "前车之鉴")
c += box(944, 236, 272, 130, font(19, 30, INK, 400, "", SONG), "Krystal 退回五天的原因之一：多出的休息没能把产出提高 20%。")
c += box(944, 380, 60, 1, "background: " + RED)
c += box(944, 396, 272, 80, font(15, 24, MUTED), "所以不能指望大家「更拼一点」，要先砍掉会议和流程。")
c += source("来源：Krystal 官网（2023 年 9 月），企业自述")
pages.append(("11 算术题", c))

# 12 process fixes
c = head(12, "流程", "所以先砍会议和流程：改造两项以上的公司只有 8% 退回")
fx = [("例会默认 30 分钟", "每周三上午不排会，超过 1 小时的会要部门负责人批准"), ("汇报改书面", "每周一份书面进展，取代口头汇报会"), ("审批压到两级", "常规审批不超过两个签字人"), ("每个部门交一份停做清单", "列出试行期间不再做的报表和流程")]
y = 192
for i, (a, b) in enumerate(fx):
    em = i == 3
    if em:
        c += box(240, y, 560, 92, "background: " + TINT)
    c += box(240, y + 92, 560, 1, "background: " + LINE)
    c += box(256, y + 18, 56, 44, font(30, 44, RED, 700, "", SONG), "一二三四"[i])
    c += box(312, y + 14, 470, 30, font(20, 30, RED if em else INK, 700, "", SONG), a)
    c += box(312, y + 48, 470, 40, font(15, 22, MUTED), b)
    y += 98
c += exhibit("standup", 840, 186, 376, 230, "附图 6 · 白板前的站会（示意）", 1.5)
c += box(840, 440, 376, 180, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
c += box(862, 456, 330, 22, font(13, 22, MUTED, 400, "", MONO), "葡萄牙 21 家公司，退回五天的占比")
c += box(862, 490, 160, 60, font(52, 60, RED, 700, "", SONG), "8%") + box(862, 554, 160, 44, font(14, 22, INK), "流程改造两项以上")
c += box(1040, 490, 160, 60, font(52, 60, WARMGREY, 700, "", SONG), "38%") + box(1040, 554, 160, 44, font(14, 22, MUTED), "改造不足两项")
c += source("来源：Gomes 等，葡萄牙试点最终报告（2024 年 7 月），21 家公司。配图为 AI 生成")
pages.append(("12 先改流程", c))

# 13 dated schedule
c = head(13, "时间", "11 月准备，1 月 4 日开始，7 月公布去留")
s = ""
x0, x1 = 240, 1216
months = ["10 月", "11 月", "12 月", "1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月"]
mw = (x1 - x0) / 10
for i, m in enumerate(months):
    s += t(x0 + i * mw + mw / 2, 206, m, 13, MUTED, "middle", 400, MONO)
    s += '<line x1="%.1f" y1="214" x2="%.1f" y2="286" stroke="%s"/>' % (x0 + i * mw, x0 + i * mw, LINE)
s += rect(x0 + mw, 226, 2 * mw - 4, 26, BROWN) + t(x0 + mw + 10, 244, "准备 2 个月", 13, "#FFF", "start", 700)
s += rect(x0 + 3 * mw, 226, 6 * mw - 4, 26, RED) + t(x0 + 3 * mw + 10, 244, "试行 6 个月 · 每周 32 小时", 13, "#FFF", "start", 700)
s += rect(x0 + 9 * mw, 226, mw - 4, 26, INK) + t(x0 + 9 * mw + 10, 244, "定去留", 13, "#FFF", "start", 700)
s += t(x0, 278, "2026", 12, MUTED, "start", 400, MONO) + t(x0 + 3 * mw, 278, "2027", 12, MUTED, "start", 400, MONO)
c += svg(s)
sch = [("2026 年 10 月", "发布本备忘录", "各部门选模式", False), ("11 月 30 日", "各部门交方案", "排班、停做清单、值班表", False), ("2027 年 1 月 4 日", "试行开始", "每周 32 小时，薪酬不变", True),
       ("3 月 31 日", "中期复盘", "第二次问卷，排班可调", False), ("6 月 30 日", "试行结束", "第三次问卷", False), ("7 月 31 日前", "公布去留", "逐个部门对照基线决定", False)]
y = 306
for i, (d, a, b, em) in enumerate(sch):
    if em:
        c += box(240, y, 976, 50, "background: " + TINT)
    c += box(240, y + 50, 976, 1, "background: " + LINE)
    c += box(256, y + 12, 220, 26, font(17, 26, RED if em else MUTED, 700, "", SONG), d)
    c += box(480, y + 12, 260, 26, font(18, 26, RED if em else INK, 700, "", SONG), a)
    c += box(760, y + 13, 440, 26, font(15, 26, MUTED), b)
    y += 51
c += source("来源：Autonomy 等，英国试点报告（2023 年 2 月）。先准备约两个月、再试行六个月，参照该试点。基线取 11 月和 12 月的数据")
pages.append(("13 时间表", c))

# 14 stop conditions checklist
c = head(14, "停止", "四类指标任何一条越线，该部门恢复五天")
sc = [("headset", "客户", "首次响应时间", "连续 4 周比基线慢 10% 以上"), ("trending-down", "产出", "部门核心指标", "连续 2 个月比基线低 5% 以上"),
      ("wallet", "成本", "加班和外包费用", "为顶班新增的部分超过部门工资总额的 3%"), ("gauge", "员工", "倦怠和工作压力", "中期问卷的得分高于基线")]
s = ""
for i, (ic, cat, what, thr) in enumerate(sc):
    y = 192 + i * 86
    c += box(240, y, 976, 74, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
    s += rect(258, y + 24, 24, 24, "none", 'stroke="%s" stroke-width="2"' % INK)
    s += icon(ic, 304, y + 24, 24, RED)
    c += box(344, y + 22, 90, 30, font(20, 30, RED, 700, "", SONG), cat)
    c += box(430, y + 24, 230, 28, font(17, 28, INK, 700), what)
    c += box(670, y + 24, 530, 28, font(17, 28, INK, 400, "", None), "<span style=\"font-family: " + MONO.replace('"', '') + "; color: " + RED + "\">IF</span>　" + thr)
c += svg(s)
c += box(240, 548, 976, 84, "background: " + RED + "; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center")
c += svg(icon("circle-stop", 262, 574, 30, "#FFFFFF"))
c += box(306, 566, 890, 48, font(19, 24, "#FFFFFF", 700, "display: flex; flex-direction: column; justify-content: center; height: 48px", SONG), "触发后：两周内恢复五天。人力资源部提请管理层决定，薪酬照常，其他部门继续试行")
c += source("来源：Autonomy 等，英国试点报告（2023 年 2 月）。参照其中「有条件的四天制」。阈值是本公司政策，不是研究数据", y=646)
pages.append(("14 停止条件", c))

# 15 roles table
c = head(15, "职责", "11 月 30 日前，各部门交排班方案和停做清单")
cols = [("谁", 240, 220), ("准备期（11 月至 12 月）", 470, 370), ("试行期（1 月至 6 月）", 850, 366)]
for lab, x, w in cols:
    c += box(x + 8, 188, w, 22, font(13, 22, MUTED, 400, "", MONO), lab)
c += box(240, 214, 976, 2, "background: " + INK)
rl = [("users", "管理层", "批准各部门方案，确认停止条件", "每月看指标，触发即拍板"), ("clipboard-check", "人力资源部", "基线问卷，考勤和排班规则，答疑", "中期和结束问卷，汇总评估"),
      ("user-check", "部门负责人", "选模式、排班，11 月 30 日前交停做清单", "每周看客户和产出指标，每月报告"), ("headset", "客服和连续在岗团队", "按错峰排班，给每人配好顶班搭档", "每天在岗不少于八成"),
      ("coffee", "全体员工", "参加基线问卷，提出可以砍掉的会和流程", "休息日不安排工作，急事按值班表处理")]
y = 216; s = ""
for i, (ic, who, a, b) in enumerate(rl):
    em = who == "部门负责人"
    if em:
        c += box(240, y, 976, 80, "background: " + TINT)
    c += box(240, y + 80, 976, 1, "background: " + LINE)
    s += icon(ic, 250, y + 28, 22, RED if em else MUTED)
    c += box(282, y + 24, 180, 30, font(18, 30, RED if em else INK, 700, "", SONG), who)
    c += box(478, y + 26, 352, 50, font(16, 26, INK), a)
    c += box(858, y + 26, 352, 50, font(16, 26, INK), b)
    y += 81
c += svg(s)
c += source("来源：Autonomy 等，英国试点报告（2023 年 2 月）。错峰团队的「搭档」顶班做法参照该试点")
pages.append(("15 职责", c))

# 16 ending decision + signature
c = runhead(16)
c += box(64, 84, 150, 30, font(22, 30, RED, 700, "", SONG), "决定") + box(64, 118, 24, 2, "background: " + RED)
c += box(240, 80, 976, 120, "display: flex; flex-direction: column; justify-content: flex-end; " + font(40, 56, INK, 700, "", SONG), "<div>试行每周四天、32 小时，薪酬不变，<br>触发停止条件即叫停</div>")
c += box(240, 216, 976, 1, "background: " + INK)
for i, txt in enumerate(["2027 年 1 月 4 日起试行每周 32 小时，薪酬不变", "触发停止条件即叫停，7 月公布去留"]):
    y = 244 + i * 70
    c += box(240, y, 90, 50, font(34, 50, RED, 700, "", SONG), "一二"[i] + "、")
    c += box(330, y + 6, 880, 40, font(26, 40, INK, 400, "", SONG), txt)
sig = [("签发", "管理层", "2026 年 10 月"), ("拟稿", "人力资源部", ""), ("抄送", "全体员工、各部门负责人", "")]
y = 430
c += box(240, y - 14, 560, 1, "background: " + LINE)
for k, v, d in sig:
    c += box(240, y, 90, 30, font(16, 30, MUTED, 400, "", MONO), k + "：")
    c += box(330, y, 330, 30, font(19, 30, INK, 400, "", SONG), v)
    c += box(660, y, 160, 30, font(15, 30, MUTED, 400, "", MONO), d)
    y += 44
c += stamp(900, 440, -6)
pages.append(("16 签发", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    loc = inner
    for k in IMG:
        loc = loc.replace(IMG[k], "../up/" + k + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "memo 四天工作制样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
