import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# 方案（B2B 销售方案）: daylight proposal binder. White paper, petrol ink, one tangerine a page.
BG = "#FFFFFF"; SURF = "#F3F0EA"; PET = "#0E3B53"; PET2 = "#2F6A8A"; PETL = "#E4EDF2"
TANG = "#F26B3A"; TANGD = "#C2491B"; TANGL = "#FDEBE2"; INK = "#14212B"; MUTED = "#5D6A74"; LINE = "#E2DDD4"
SKY = "#8DBBD3"; SKYL = "#D6E6EF"; FLAT = "#9DBFD3"; PEAK = "#2F6A8A"; RED = "#B83A2E"; GREEN = "#2E7D5B"; FADE = "#8A949C"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["cover-roof", "chapter-dawn", "chapter-install", "grid-pv", "grid-ess", "grid-switch", "om-worker"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(19)]
TOTAL = 19
TABS = ["概要", "算账", "方案", "落地", "决定"]
LABEL = "屋顶光伏与储能方案"

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=PET, sw=2):
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


def font(size, lh, color=INK, weight=400, extra=""):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (size, lh, color, weight, extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def tw(s, cjk=12, lat=7.2):
    return sum(cjk if ord(ch) > 0x2e80 else lat for ch in s)


def chip(x, y, text, fg=PET, bg=None, border=None, size=12, h=24, weight=700):
    w = int(tw(text, size, size * 0.62) + 22)
    st = "border-radius: %dpx; box-sizing: border-box; text-align: center; white-space: nowrap; " % (h // 2)
    st += ("background: %s; " % bg) if bg else ""
    st += ("border: 1.5px solid %s; " % border) if border else ""
    return box(x, y, w, h, st + font(size, h - (3 if border else 0), fg, weight), text), w


def tabs(active, on_photo=False):
    """Binder index tabs on the right edge: the proposal's sections, the current one sticks out in petrol."""
    out = ""
    y = 118
    for i, name in enumerate(TABS):
        if i == active:
            out += box(1228, y, 52, 92, "background: %s; border-radius: 8px 0 0 8px; display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; letter-spacing: 6px; " % PET + font(15, 20, "#FFFFFF", 800), name)
        else:
            bg = "rgba(255,255,255,0.86)" if on_photo else SURF
            out += box(1244, y, 36, 92, "background: %s; border-radius: 6px 0 0 6px; display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; letter-spacing: 6px; " % bg + font(13, 18, MUTED, 600), name)
        y += 98
    return out


def pgnum(pg, color=MUTED):
    return box(1096, 678, 100, 20, font(13, 20, color, 600, "text-align: right; font-variant-numeric: tabular-nums"), "%02d" % pg)


def head(pg, active, title, size=32):
    out = tabs(active)
    out += box(64, 34, 700, 18, font(12, 18, MUTED, 600, "letter-spacing: 1px"), '<span style="color:%s">%s</span> · 呈 贵司管理层' % (PET, LABEL))
    out += box(64, 58, 1132, 92, "display: flex; flex-direction: column; justify-content: flex-end; " + font(size, 44, PET, 800), "<div>" + title + "</div>")
    out += pgnum(pg)
    return out


def source(t_, y=650):
    return box(64, y, 1100, 34, font(12, 17, MUTED), t_)


def photo(key, x, y, w, h, radius=0, extra=""):
    return box(x, y, w, h, "overflow: hidden; border-radius: %s; %s" % (radius if isinstance(radius, str) else "%dpx" % radius, extra), '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: %s; border-radius: 12px; box-sizing: border-box; " % SURF + extra, content)


pages = []

# 1 cover: white proposal sheet on the left, the roof on the right
c = photo("cover-roof", 720, 0, 560, 720)
c += box(64, 64, 500, 20, font(14, 20, MUTED, 600), "2026 年 10 月")
c += box(64, 228, 150, 34, "background: %s; border-radius: 17px; text-align: center; " % TANG + font(15, 34, INK, 800, "letter-spacing: 2px"), "呈 贵司管理层")
c += box(64, 282, 640, 70, font(50, 66, PET, 900, "white-space: nowrap"), "让屋顶替贵司付一部分电费")
c += box(64, 360, 620, 30, font(20, 30, MUTED, 500), "工商业分布式光伏与储能方案")
c += box(64, 440, 600, 1, "background: " + LINE)
facts = [("108 万 kWh", "每 MW 光伏一年发电<br>江苏官方参数"), ("6.1 至 7.7 年", "江苏自投静态回收<br>每 MW 算例"), ("0 元", "合同能源管理模式<br>贵司出资")]
for i, (v, l_) in enumerate(facts):
    x = 64 + i * 208
    c += box(x, 466, 200, 36, font(26, 36, PET, 800, "white-space: nowrap"), v)
    c += box(x, 508, 200, 40, font(13, 20, MUTED), l_)
c += box(64, 640, 600, 20, font(12, 20, MUTED), "图为 AI 生成的示意图")
pages.append(("1 封面", c))

# 2 what you get
c = head(2, 0, "电价时段改了，光伏仍能回本，储能先算清再上")
c += svg(icon("handshake", 64, 176, 22, PET))
c += box(96, 174, 600, 26, font(17, 26, PET, 800), "贵司会得到三样东西")
gets = [("sun", "屋顶每年自发<br>一部分白天用电", "108 万 kWh", "每 MW 光伏一年发电<br>江苏官方参数，1080 小时", PET),
        ("calculator", "一份按贵司电费单和<br>售电合同算清的回本账", "6.1 至 7.7 年", "江苏自投静态回收，每 MW 算例<br>未扣衰减、税费和融资", TANG),
        ("file-check", "一份把出资、运维和<br>安全责任写清楚的合同", "0 元", "合同能源管理模式下贵司出资<br>节省按电价折扣分享", PET)]
s = ""
for i, (ic, what, v, note, col) in enumerate(gets):
    x = 64 + i * 382
    c += card(x, 214, 368, 300)
    c += box(x + 28, 228, 40, 40, "", "")
    s += icon(ic, x + 28, 236, 26, PET)
    c += box(x + 28, 276, 312, 64, font(20, 31, INK, 800), what)
    c += box(x + 28, 360, 312, 1, "background: " + LINE)
    c += box(x + 28, 378, 312, 50, font(40, 50, col, 900, "white-space: nowrap"), v)
    c += box(x + 28, 436, 312, 44, font(13, 21, MUTED), note)
c += svg(s)
c += box(64, 536, 1132, 58, "background: %s; border-radius: 10px; box-sizing: border-box; padding-left: 58px; " % PETL + font(16, 58, INK, 600), "储能不默认配：用贵司的负荷曲线测算，扣完运维、衰减和分成之后过线才装。")
c += svg(icon("battery-charging", 86, 553, 24, PET))
c += source("来源：江苏增量竞价通知（2025-11-11），CPIA 光伏路线图（2024-2025 年），澎湃新闻（2026-08-18）")
pages.append(("2 贵司得到", c))


def chapter(pg, key, num, part, title, qs, active):
    c = photo(key, 0, 0, 1280, 720)
    c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(14,59,83,0.96) 0%, rgba(14,59,83,0.86) 46%, rgba(14,59,83,0.25) 82%, rgba(14,59,83,0.1) 100%)")
    c += tabs(active, on_photo=True)
    c += box(64, 132, 400, 124, font(120, 124, TANG, 900, "letter-spacing: -2px"), num)
    c += box(64, 270, 600, 24, font(16, 24, "rgba(255,255,255,0.72)", 600, "letter-spacing: 2px"), part)
    c += box(64, 302, 1000, 60, font(44, 60, "#FFFFFF", 900, "white-space: nowrap"), title)
    c += box(64, 400, 600, 22, font(14, 22, "rgba(255,255,255,0.66)", 600), "这一部分回答")
    s = ""
    for i, (ic, q) in enumerate(qs):
        y = 434 + i * 46
        s += icon(ic, 64, y + 4, 22, "#FFFFFF")
        c += box(100, y, 800, 32, font(19, 32, "#FFFFFF", 500), q)
    c += svg(s)
    c += pgnum(pg, "rgba(255,255,255,0.7)")
    return c


pages.append(("3 第一部分", chapter(3, "chapter-dawn", "01", "第一部分 · 算账", "先算账：电价变了，屋顶还值多少",
                                   [("clock", "电价时段改了以后，屋顶光伏每 MW 还能省多少"), ("sun", "白天自己用掉多少、按什么电价算，回本差多少"), ("battery-charging", "储能的毛收益上限是多少，为什么要打折看")], 1)))

# 4 24-hour tariff bands
c = head(4, 1, "江苏、浙江把中午改成了低谷，广东白天仍以高峰为主")
X0 = 300; HW = 28  # hour width -> 672px
COL = {"谷": SKYL, "平": FLAT, "峰": PEAK, "尖": PET}
rows = [("江苏 10 月", "苏发改价格发〔2025〕426 号", [(0, 2, "平"), (2, 6, "谷"), (6, 10, "平"), (10, 14, "谷"), (14, 15, "平"), (15, 22, "峰"), (22, 24, "平")], "峰谷差 0.5738", "谷 0.3828 · 平 0.6400 · 峰 0.9566"),
        ("浙江春秋季", "浙发改价格〔2026〕112 号", [(0, 7, "谷"), (7, 11, "平"), (11, 14, "谷"), (14, 16, "平"), (16, 23, "峰"), (23, 24, "平")], "峰谷差约 0.76（示意）", "谷 0.3653 · 平 0.6803 · 峰 1.1267"),
        ("广东汕头 9 月", "粤发改价格〔2021〕331 号", [(0, 8, "谷"), (8, 10, "平"), (10, 11, "峰"), (11, 12, "尖"), (12, 14, "平"), (14, 15, "峰"), (15, 17, "尖"), (17, 19, "峰"), (19, 24, "平")], "峰谷差 0.8192", "谷 0.2635 · 平 0.6483 · 峰 1.0827 · 尖 1.3465")]
s = ""
for i, (name, doc, segs, gap, prices) in enumerate(rows):
    y = 226 + i * 100
    c += box(64, y + 6, 220, 28, font(18, 28, INK, 800), name)
    c += box(64, y + 36, 230, 20, font(12, 20, MUTED), doc)
    for a, b, k in segs:
        s += rect(X0 + a * HW + 1, y, (b - a) * HW - 2, 64, COL[k], 'rx="4"')
        if b - a >= 2:
            s += '<text x="%.1f" y="%d" font-size="13" font-weight="700" fill="%s" text-anchor="middle" font-family="PingFang SC, sans-serif">%s</text>' % (X0 + (a + b) / 2 * HW, y + 37, PET if k in "谷平" else "#FFFFFF", k)
    c += box(996, y + 4, 200, 26, font(17, 26, PET, 800, "white-space: nowrap"), gap)
    c += box(996, y + 34, 200, 34, font(12, 17, MUTED), prices)
# midday window
s += rect(X0 + 10 * HW - 3, 200, 4 * HW + 6, 316, "none", 'stroke="%s" stroke-width="2.5" stroke-dasharray="7 5" rx="8"' % TANG)
s += icon("sun", X0 + 10 * HW + 18, 176, 18, TANGD)
c += box(X0 + 10 * HW + 42, 174, 200, 22, font(13, 22, TANGD, 800, "white-space: nowrap"), "午间 10-14 点")
for hh in range(0, 25):
    s += line(X0 + hh * HW, 524, X0 + hh * HW, 530 if hh % 6 else 534, "#B9B3A8", 1)
for hh in (0, 6, 12, 18, 24):
    s += '<text x="%d" y="552" font-size="13" fill="%s" text-anchor="middle" font-family="PingFang SC, sans-serif">%d 时</text>' % (X0 + hh * HW, MUTED, hh)
lx = 300
for k, lab in [("谷", "低谷"), ("平", "平段"), ("峰", "高峰"), ("尖", "尖峰")]:
    s += rect(lx, 584, 16, 16, COL[k], 'rx="3"')
    s += '<text x="%d" y="597" font-size="13" fill="%s" font-family="PingFang SC, sans-serif">%s</text>' % (lx + 24, INK, lab)
    lx += 86
c += svg(s)
c += box(650, 582, 546, 20, font(13, 20, MUTED, 400, "text-align: right"), "代理购电、两部制、1-10 千伏，元/kWh")
c += source("来源：三省分时电价文件，国网江苏 2026-10 和广东电网汕头价区 2026-09 电价表。浙江价格按 112 号规则和 2025-11 分项推算，仅为示意")
pages.append(("4 电价时段", c))

# 5 three provinces
c = head(5, 1, "峰谷差广东最大、江苏最小，10 千伏以上用户按自己的合同算")
prov = [("江苏", "苏发改价格发〔2025〕426 号", "低谷（春秋 10-14 点）", "0.5738", "", "午间发电多半只抵谷价", False),
        ("浙江", "浙发改价格〔2026〕112 号", "低谷（全年 11-14 点）", "约 0.76", "示意", "午间发电多半只抵谷价", False),
        ("广东", "粤发改价格〔2021〕331 号", "10-12 点高峰，12-14 点平段", "0.8192", "汕头价区", "白天发电多半抵峰价", True)]
for i, (pv, doc, mid, gap, gtag, verdict, hot) in enumerate(prov):
    x = 64 + i * 382
    c += card(x, 176, 368, 288)
    c += box(x + 28, 196, 300, 32, font(24, 32, PET, 900), pv)
    c += box(x + 28, 230, 320, 20, font(12, 20, MUTED), doc)
    c += box(x + 28, 266, 312, 1, "background: " + LINE)
    c += box(x + 28, 280, 300, 18, font(12, 18, MUTED, 600), "中午时段")
    c += box(x + 28, 300, 320, 24, font(16, 24, INK, 700), mid)
    c += box(x + 28, 340, 300, 18, font(12, 18, MUTED, 600), "峰谷差（元/kWh）")
    c += box(x + 28, 358, 200, 46, font(36, 46, PET, 900, "white-space: nowrap"), gap)
    if gtag:
        c += chip(x + 28 + int(tw(gap, 36, 21)) + 14, 370, gtag, MUTED, None, LINE)[0]
    if hot:
        c += chip(x + 28, 418, verdict, INK, TANG, None, 14, 30)[0]
    else:
        c += chip(x + 28, 418, verdict, PET, SKYL, None, 14, 30)[0]
c += box(64, 484, 1132, 120, "background: %s; border-radius: 12px; " % PET, "")
c += svg(icon("receipt", 92, 506, 24, "#FFFFFF"))
c += box(130, 502, 1040, 30, font(19, 30, "#FFFFFF", 800), "10 千伏以上的工厂，按售电合同算")
c += box(130, 538, 1040, 52, font(15, 25, "rgba(255,255,255,0.86)"), "1656 号第三十五条：直接参与市场交易的用户，2026-03-01 起不再执行行政分时电价。江苏零售套餐峰、谷相对平段浮动不低于 60%。")
c += source("来源：三省分时电价文件，三省电网代理购电价表，发改能源规〔2025〕1656 号，苏发改能源发〔2025〕1141 号")
pages.append(("5 三省", c))

# 6 the per-MW sum: inputs on the left, the working and the answer on the right
c = head(6, 1, "江苏每 MW 光伏：一年发电约 108 万 kWh，净省约 44 万元")
c += box(64, 176, 300, 18, font(12, 18, MUTED, 700, "letter-spacing: 1px"), "参数")
c += box(330, 176, 140, 18, font(12, 18, MUTED, 700, "text-align: right"), "取值")
c += box(500, 176, 200, 18, font(12, 18, MUTED, 700), "来源性质")
c += box(64, 200, 636, 2, "background: " + PET)
params = [("E", "年发电量", "1 MW × 1080 小时，江苏竞价通知", "108 万 kWh", "政策原文"),
          ("p", "替代电价", "江苏 2026 年 5 月 9-15 时均价", "0.45 元/kWh", "媒体报道"),
          ("O", "运维", "0.046 元/W·年，CPIA 2024", "4.6 万元/年", "行业协会"),
          ("I", "投资", "2.70 元/W，CPIA 2024", "270 万元", "行业协会")]
s = ""
for i, (letter, name, how, val, ev) in enumerate(params):
    y = 214 + i * 76
    s += '<circle cx="82" cy="%d" r="18" fill="%s"/>' % (y + 26, PET)
    s += '<text x="82" y="%d" font-size="17" font-weight="800" fill="#FFFFFF" text-anchor="middle" font-family="Georgia, serif" font-style="italic">%s</text>' % (y + 32, letter)
    c += box(116, y + 4, 220, 26, font(17, 26, INK, 800), name)
    c += box(116, y + 32, 360, 20, font(12, 20, MUTED), how)
    c += box(330, y + 10, 140, 30, font(20, 30, PET, 800, "text-align: right; white-space: nowrap"), val)
    c += chip(500, y + 14, ev, MUTED, None, "#CFC8BC")[0]
    if i < 3:
        s += line(64, y + 66, 700, y + 66, LINE)
c += svg(s)
c += card(740, 176, 456, 168)
c += box(768, 194, 300, 20, font(14, 20, MUTED, 700), "年净收益")
c += box(768, 220, 400, 26, font(18, 26, INK, 700, "font-family: Georgia, serif; font-style: italic"), "E × p − O")
c += box(768, 248, 400, 22, font(14, 22, MUTED), "108 × 0.45 − 4.6")
c += box(768, 278, 400, 50, font(40, 50, PET, 900), "44.0 万元")
c += box(740, 360, 456, 168, "background: %s; border-radius: 12px; " % TANG, "")
c += box(768, 378, 300, 20, font(14, 20, INK, 800), "静态回收")
c += box(768, 404, 400, 26, font(18, 26, INK, 700, "font-family: Georgia, serif; font-style: italic"), "I ÷ 年净收益")
c += box(768, 432, 400, 22, font(14, 22, INK), "270 ÷ 44.0")
c += box(768, 452, 400, 70, font(60, 70, INK, 900), "6.1 年")
c += box(64, 548, 1132, 52, "border-top: 1px solid %s; box-sizing: border-box; padding-left: 34px; " % LINE + font(15, 52, MUTED), "全部自用情景，未扣衰减、税费、融资和屋顶租金。贵司的账按电费单和售电合同重算。")
c += svg(icon("info", 64, 566, 20, MUTED))
c += source("来源：江苏增量竞价通知（2025-11-11），CPIA 光伏路线图（2024-2025 年），澎湃新闻（2026-08-18）")
pages.append(("6 每 MW 光伏的账", c))

# 7 sensitivity
c = head(7, 1, "回本快慢看两件事：白天自己用掉多少，按什么电价算")
BX = 330; YR = 40
bars = [("全部自用，按平段 0.64 元", 4.2, "64.5 万元", PET2), ("全部自用，按 0.45 元", 6.1, "44.0 万元", TANG), ("自用 58.46%，余电 0.391 元", 6.5, "41.4 万元", PET2),
        ("全部自用，按谷段 0.3828 元", 7.3, "36.7 万元", PET2), ("自用 58.46%，余电 0.25 元", 7.7, "35.0 万元", PET2)]
s = ""
c += box(64, 176, 260, 18, font(12, 18, MUTED, 700), "江苏每 MW，静态回收")
for i, (lab, yv, net, col) in enumerate(bars):
    y = 202 + i * 50
    c += box(64, y + 6, 256, 22, font(14, 22, INK, 600, "text-align: right; white-space: nowrap"), lab)
    s += rect(BX, y + 4, yv * YR, 26, col, 'rx="3"')
    c += box(BX + yv * YR + 10, y + 4, 240, 26, font(16, 26, INK, 800, "white-space: nowrap"), '%.1f 年 <span style="font-size:12px;font-weight:400;color:%s">年净收益 %s</span>' % (yv, MUTED, net))
y = 202 + 5 * 50 + 14
s += line(64, y - 8, 830, y - 8, LINE, 1, 'stroke-dasharray="4 4"')
c += box(64, y - 2, 260, 18, font(12, 18, MUTED, 700), "广东参照，企业口径")
y += 20
c += box(64, y + 6, 256, 22, font(14, 22, INK, 600, "text-align: right"), "1163 小时，按 0.803 元")
s += rect(BX, y + 4, 3.0 * YR, 26, SKY, 'rx="3"')
c += box(BX + 3.0 * YR + 10, y + 4, 240, 26, font(16, 26, INK, 800, "white-space: nowrap"), '3.0 年 <span style="font-size:12px;font-weight:400;color:%s">年净收益 88.8 万元</span>' % MUTED)
for v in (0, 5, 10):
    s += line(BX + v * YR, 198, BX + v * YR, y + 40, "#D9D3C8", 1, 'stroke-dasharray="2 4"')
    s += '<text x="%d" y="%d" font-size="12" fill="%s" text-anchor="middle" font-family="PingFang SC, sans-serif">%d 年</text>' % (BX + v * YR, y + 56, MUTED, v)
c += svg(s)
levers = [("sun", "白天自己用掉多少", "江苏近三年平均自用 58.46%，其余送上网。自用越多，回本越快。"),
          ("receipt", "按什么电价算", "自用的电抵 0.3828 到 0.64 元。余电机制电价竞价 0.25 到 0.391 元，不保证中标。")]
s = ""
for i, (ic, t_, d_) in enumerate(levers):
    y = 176 + i * 168
    c += card(870, y, 326, 152)
    s += icon(ic, 894, y + 22, 22, PET)
    c += box(926, y + 18, 260, 30, font(18, 30, PET, 800), t_)
    c += box(894, y + 58, 280, 84, font(14, 22, INK), d_)
c += svg(s)
c += box(870, 512, 326, 118, "border: 1.5px solid %s; border-radius: 12px; box-sizing: border-box; padding: 14px 18px; " % LINE + font(13, 21, MUTED), "<b style='color:%s'>这些回收期都还没扣</b>：衰减、税费、融资成本、屋顶租金和逆变器更换。造价按直流侧、发电按交流侧计时，约再长四分之一。" % INK)
c += source("来源：参数同上页，余电价为江苏竞价区间，自用 58.46% 为江苏近三年平均。广东按莱宝高科公告折算。回收 = 270 万元 ÷ 年净收益")
pages.append(("7 敏感性", c))

# 8 storage
c = head(8, 1, "储能每 MWh 一天最多毛赚：江苏约 712 元，广东约 1111 元")
c += box(64, 176, 1132, 52, "background: %s; border-radius: 10px; box-sizing: border-box; padding-left: 24px; " % PETL + font(18, 52, PET, 800, "font-family: Georgia, 'PingFang SC', serif"), "每次毛收益 = 1000 kWh × (放电价 − 充电价 ÷ 86.5%)")
c += chip(1010, 190, "效率 86.5%，CPIA", PET, "#FFFFFF", None, 12, 24)[0]
sto = [("江苏 10 月", [("谷 0.3828", "峰 0.9566", "514.1 元"), ("谷 0.3828", "平 0.6400", "197.5 元")], "711.5 元", "21.3 万至 23.5 万元", ""),
       ("广东汕头 9 月", [("谷 0.2635", "峰 1.0827", "778.1 元"), ("平 0.6483", "峰 1.0827", "333.2 元")], "1111.3 元", "33.3 万至 36.7 万元", "未计尖峰")]
s = ""
for i, (nm, cyc, day, yr, note) in enumerate(sto):
    x = 64 + i * 574
    c += card(x, 244, 558, 280)
    c += box(x + 28, 262, 300, 30, font(20, 30, PET, 900), nm)
    c += box(x + 330, 268, 200, 20, font(12, 20, MUTED, 400, "text-align: right"), "两部制 1-10 千伏，元/kWh")
    for j, (a, b, v) in enumerate(cyc):
        y = 306 + j * 44
        c += chip(x + 28, y + 4, "第 %d 次" % (j + 1), MUTED, "#FFFFFF", None, 12, 24)[0]
        c += box(x + 110, y, 120, 32, font(15, 32, INK, 600), a)
        s += icon("arrow-right", x + 210, y + 7, 18, MUTED)
        c += box(x + 240, y, 140, 32, font(15, 32, INK, 600), b)
        c += box(x + 400, y, 130, 32, font(18, 32, PET, 800, "text-align: right"), v)
    s += line(x + 28, 404, x + 530, 404, LINE)
    c += box(x + 28, 416, 200, 20, font(13, 20, MUTED, 700), "每天，两充两放" + (" · " + note if note else ""))
    c += box(x + 28, 438, 260, 56, font(44, 56, PET, 900, "white-space: nowrap"), day)
    c += box(x + 300, 416, 230, 20, font(13, 20, MUTED, 700, "text-align: right"), "一年运行 300 至 330 天")
    c += box(x + 300, 446, 230, 32, font(20, 32, INK, 800, "text-align: right; white-space: nowrap"), yr)
c += box(64, 540, 1132, 72, "border: 2px solid %s; border-radius: 12px; box-sizing: border-box; " % TANG, "")
s += icon("triangle-alert", 88, 562, 24, TANGD)
c += box(126, 552, 1040, 24, font(16, 24, INK, 800), "这是上限，不是收益")
c += box(126, 578, 1050, 24, font(14, 24, MUTED), "未扣运维、容量衰减、放电深度、业主分成和融资成本，运行天数是假设。回收期用贵司的负荷曲线逐项扣完再给。")
c += svg(s)
c += source("来源：国网江苏 2026-10、广东电网汕头价区 2026-09 电价表（两部制 1-10 千伏），CPIA 系统效率 86.5%", 656)
pages.append(("8 每 MWh 储能", c))

# 9 discount the storage case
c = head(9, 1, "储能的账要打折看：价差收窄，成本回升，回收期被拉长")
c += box(380, 178, 200, 18, font(12, 18, MUTED, 700), "此前")
c += box(720, 178, 200, 18, font(12, 18, MUTED, 700), "现在")
disc = [("arrow-down-up", "江苏峰谷价差", "CNESA 估算，426 号新政前后", "约 0.85", "约 0.65", "元/kWh", "降约 25%", PET),
        ("trending-up", "2 小时系统中标价", "CNESA，上半年均价，主要是大型储能", "约 553", "599.3", "元/kWh", "涨 8.3%", PET),
        ("clock", "浙江储能回收期", "NRDC 与 CNESA 估计，调价前后", "5.4", "9.1", "年", "研究机构估计", TANG)]
s = ""
for i, (ic, lab, sub, a, b, u, tag, col) in enumerate(disc):
    y = 204 + i * 108
    s += line(64, y, 1196, y, LINE if i else PET, 1 if i else 2)
    s += icon(ic, 64, y + 30, 22, PET)
    c += box(98, y + 24, 270, 28, font(18, 28, INK, 800), lab)
    c += box(98, y + 56, 270, 34, font(12, 17, MUTED), sub)
    c += box(380, y + 22, 300, 54, font(38, 54, FADE, 800, "white-space: nowrap"), a + ' <span style="font-size:14px;font-weight:500">%s</span>' % u)
    s += icon("arrow-right", 640, y + 37, 26, MUTED)
    c += box(720, y + 22, 300, 54, font(38, 54, col, 900, "white-space: nowrap"), b + ' <span style="font-size:14px;font-weight:500;color:%s">%s</span>' % (MUTED, u))
    c += chip(1196 - int(tw(tag, 13, 8) + 22), y + 38, tag, PET, PETL, None, 13, 26)[0]
s += line(64, 528, 1196, 528, LINE)
c += svg(s)
c += box(64, 546, 1132, 58, "background: %s; border-radius: 10px; box-sizing: border-box; padding-left: 58px; " % SURF + font(15, 58, INK), "2026 年一季度用户侧储能新增同比降约 50%。补贴不计入：只查到已到期的地方临时补贴。")
c += svg(icon("trending-down", 86, 563, 24, PET))
c += source("来源：CNESA（第一财经 2025-05-27，新华网 2026-06-01、08-28），NRDC 与 CNESA（界面 2025-12-17）。中标价为上半年均价，主要是大型储能")
pages.append(("9 储能打折", c))

pages.append(("10 第二部分", chapter(10, "chapter-install", "02", "第二部分 · 方案与落地", "再定方案：装什么，谁出钱，怎么落地",
                                    [("layers", "方案由哪几块组成，储能什么时候才装"), ("wallet", "自投、合同能源管理、融资租赁怎么选"), ("shield-check", "安全、风险、实施路线、报价和需要的资料")], 2)))

# 11 the four parts
c = head(11, 2, "方案由四块组成：光伏先上，储能测算过线再装")
parts = [("grid-pv", "solar-panel", "屋顶光伏", "按屋顶承重和白天负荷定容量，优先自己用掉", False),
         ("grid-ess", "battery-charging", "储能柜", "按负荷曲线测算，扣完运维、衰减和分成后过线才装", True),
         ("grid-switch", "plug-zap", "并网与配电", "按电网接入意见改造，取得并网意见后才开工", False),
         ("om-worker", "hard-hat", "运维与能源管理", "发电、自用、余电和节省逐月对账，报告给贵司", False)]
s = ""
for i, (img, ic, t_, d_, opt) in enumerate(parts):
    x = 64 + i * 286
    border = "border: 2px dashed #B9B3A8; " if opt else ""
    c += box(x, 176, 274, 400, "background: %s; border-radius: 12px; overflow: hidden; box-sizing: border-box; %s" % (SURF, border), "")
    c += photo(img, x + (2 if opt else 0), 176 + (2 if opt else 0), 274 - (4 if opt else 0), 240, "10px 10px 0 0")
    num_bg = TANG if i == 0 else PET
    num_fg = INK if i == 0 else "#FFFFFF"
    c += box(x + 16, 192, 34, 34, "background: %s; border-radius: 17px; text-align: center; " % num_bg + font(16, 34, num_fg, 900), str(i + 1))
    if opt:
        c += chip(x + 274 - 70, 196, "选配", PET, "#FFFFFF", None, 12, 26)[0]
    s += icon(ic, x + 22, 438, 22, PET)
    c += box(x + 54, 434, 210, 30, font(19, 30, PET, 800), t_)
    c += box(x + 22, 474, 232, 90, font(14, 23, INK), d_)
c += svg(s)
c += source("图为 AI 生成的示意图", 652)
pages.append(("11 方案构成", c))

# 12 funding models
c = head(12, 2, "自投每 MW 年省约 44 万元，EMC 不出钱年省约 13 万元")
models = [("贵司自投", "适合：资金充裕，想拿全部节省", "约 44.0 万元", "节省全部归贵司", [("谁出钱", "贵司，约 270 万元/MW"), ("发电和设备风险", "贵司承担"), ("期满以后", "资产一直归贵司")], False),
          ("合同能源管理（EMC）", "适合：不想占用资金", "约 12.9 万元", "按 7.35 折结算，余电归投资方", [("谁出钱", "投资方，贵司不出钱"), ("发电和设备风险", "投资方承担"), ("期满以后", "公开样本 20 年后移交")], True),
          ("融资租赁", "适合：想要资产，愿意分期", "44.0 万元减租金", "节省扣除租金后归贵司", [("谁出钱", "融资方先付，贵司分期付租金"), ("发电和设备风险", "贵司承担"), ("期满以后", "按租赁合同取得资产")], False)]
for i, (nm, fit, v, vn, rows_, zero) in enumerate(models):
    x = 64 + i * 382
    c += card(x, 176, 368, 360)
    c += box(x + 24, 192, 320, 30, font(21, 30, PET, 900, "white-space: nowrap"), nm)
    c += box(x + 24, 224, 320, 20, font(13, 20, MUTED), fit)
    if zero:
        c += chip(x + 24, 252, "贵司出资 0 元", INK, TANG, None, 13, 28)[0]
    c += box(x + 24, 292, 320, 18, font(12, 18, MUTED, 700), "江苏每 MW 一年省")
    c += box(x + 24, 312, 330, 46, font(34 if len(v) < 9 else 28, 46, PET, 900, "white-space: nowrap"), v)
    c += box(x + 24, 360, 320, 20, font(12, 20, MUTED), vn)
    for j, (k, val) in enumerate(rows_):
        y = 394 + j * 46
        c += box(x + 24, y, 320, 1, "background: " + LINE)
        c += box(x + 24, y + 6, 120, 18, font(12, 18, MUTED, 600), k)
        c += box(x + 24, y + 24, 330, 20, font(14, 20, INK, 600), val)
c += box(64, 552, 1132, 64, "background: %s; border-radius: 10px; box-sizing: border-box; padding: 10px 20px 0 58px; " % PETL + font(14, 22, INK), "7.35 折、20 年是一家上市公司公告里的单个样本，不是行业标准。媒体报道江苏 EMC 折扣已从六折收窄到八折，贵司的折扣按贵司电价和屋顶条件谈。")
c += svg(icon("handshake", 82, 572, 24, PET))
c += source("来源：莱宝高科 EMC 公告（2024-10-30，企业口径），界面新闻（2026-06-23）。EMC 栏：108 万 kWh × 0.45 × 26.5% ≈ 12.9 万元", 652)
pages.append(("12 出资方式", c))

# 13 public references
c = head(13, 2, "同类厂房已经在做：公开记录里的五个参照")
c += chip(64, 172, "均非我方项目", PET, None, PET, 12, 24)[0]
refs = [("factory", "深圳莱宝高科光明工厂", "光伏 2.541 MWp，EMC", "预计年省约 62.90 万元", "企业口径", False),
        ("factory", "常州钟楼金瑞达园区", "光伏约 1.6 MW", "146.7 万 kWh，年省约 36 万元", "区政府发布", False),
        ("battery-charging", "常州钟楼智谷工场", "光伏 0.9 MWp + 储能 1.33 MW", "年化收益超过 20 万元", "区政府发布", False),
        ("zap", "扬州高邮泰晶厂区", "光伏 4 万 kW + 储能 80.25 MWh", "年省约 2000 万元", "供电公司口径", False),
        ("file-check", "亿晶光电江苏四座电站", "0.81 至 3.49 MW", "991 至 1098 小时，自用率 77.7% 至 91.0%", "会计师审计", True)]
s = ""
for i, (ic, nm, sc, num, ev, hot) in enumerate(refs):
    y = 208 + i * 70
    c += box(64, y, 1132, 62, "background: %s; border-radius: 10px; %s" % (SURF, ("box-shadow: inset 4px 0 0 %s; " % TANG) if hot else ""), "")
    s += '<circle cx="104" cy="%d" r="18" fill="#FFFFFF"/>' % (y + 31)
    s += icon(ic, 94, y + 21, 20, PET)
    c += box(136, y + 8, 380, 24, font(16, 24, INK, 800), nm)
    c += box(136, y + 33, 380, 20, font(13, 20, MUTED), sc)
    c += box(540, y + 16, 440, 30, font(18, 30, PET, 800, "white-space: nowrap"), num)
    if hot:
        c += chip(1180 - int(tw(ev, 12, 7.4) + 22), y + 19, ev, INK, TANG, None, 12, 24)[0]
    else:
        c += chip(1180 - int(tw(ev, 12, 7.4) + 22), y + 19, ev, MUTED, "#FFFFFF", None, 12, 24)[0]
c += svg(s + icon("lightbulb", 64, 568, 20, MUTED))
c += box(94, 564, 1100, 28, font(15, 28, INK), "参照只说明同类厂房做得成。贵司能省多少，按贵司的电费单、负荷曲线和屋顶条件算。")
c += source("来源：莱宝高科公告（2024-10-30），常州市钟楼区政府（2025-04-11），扬子晚报（2026-07-01），亿晶光电（2025-04-29）")
pages.append(("13 公开参照", c))

# 14 storage safety
c = head(14, 3, "储能安全按强制国标和 65 号文做，事故教训写进设计")
c += box(64, 174, 300, 20, font(13, 20, MUTED, 700, "letter-spacing: 1px"), "按什么做")
c += box(416, 174, 300, 20, font(13, 20, MUTED, 700, "letter-spacing: 1px"), "公开事故的教训")
s = ""
stds = [("shield-check", "GB 44240-2024", "强制性国家标准", "2025-08-01 起实施。只选通过该标准检测的电池，检测报告交贵司存档。"),
        ("file-check", "国能综通安全〔2025〕65 号", "", "可研做安全论证，备案写明安全责任，竣工检查，投运后做安全后评价。")]
for i, (ic, t_, tag, d_) in enumerate(stds):
    y = 202 + i * 196
    c += card(64, y, 336, 184)
    s += icon(ic, 84, y + 20, 22, PET)
    c += box(116, y + 16, 270, 28, font(16, 28, INK, 800, "white-space: nowrap"), t_)
    if tag:
        c += chip(84, y + 54, tag, INK, TANG, None, 12, 24)[0]
    c += box(84, y + (88 if tag else 58), 300, 66, font(14, 22, INK), d_)
incs = [("flame", "广州黄埔「6·14」事故", "电池包测试时热失控后闪爆，1 人死亡。", "储能柜远离车间和通道，柜内可探测、排出可燃气体。"),
        ("zap", "深圳龙华储能柜起火", "初步认定为充电过载导致电池发热。", "设充放电上限，过温、过流自动停机并告警。")]
for i, (ic, t_, what, do) in enumerate(incs):
    y = 202 + i * 196
    c += card(416, y, 336, 184)
    s += icon(ic, 436, y + 20, 22, RED)
    c += box(468, y + 16, 270, 28, font(16, 28, INK, 800), t_)
    c += box(436, y + 50, 300, 22, font(14, 22, MUTED), what)
    c += box(436, y + 80, 300, 66, font(14, 22, INK), '<b style="color:%s">我们的做法：</b>' % PET + do)
c += box(768, 174, 428, 408, "background: %s; border-radius: 12px; " % PET, "")
s += icon("scale", 792, 196, 24, "#FFFFFF")
c += box(826, 192, 340, 32, font(20, 32, "#FFFFFF", 800), "出了事谁负责")
resp = [("贵司自投", "安全主体责任：贵司"), ("合同能源管理", "安全主体责任：投资方"), ("设计、施工和运维", "按合同由我们承担")]
for i, (k, v) in enumerate(resp):
    y = 252 + i * 92
    s += line(792, y, 1172, y, "rgba(255,255,255,0.22)", 1)
    c += box(792, y + 12, 360, 20, font(13, 20, "rgba(255,255,255,0.7)", 600), k)
    c += box(792, y + 34, 360, 28, font(18, 28, "#FFFFFF", 800), v)
c += box(792, 540, 380, 24, font(13, 18, "rgba(255,255,255,0.7)"), "备案时写明安全主体责任")
c += svg(s)
c += source("来源：GB 44240-2024，国能综通安全〔2025〕65 号，广州市黄埔区事故调查报告（2026-03-23 公开），南方都市报（2026-06-15）")
pages.append(("14 储能安全", c))

# 15 risk register
c = head(15, 3, "五个风险，每个都有公开依据和我们的应对")
c += box(64, 174, 240, 20, font(13, 20, MUTED, 700), "风险")
c += box(330, 174, 400, 20, font(13, 20, MUTED, 700), "公开依据")
c += box(786, 174, 400, 20, font(13, 20, MUTED, 700), "我们的应对")
risks = [("clock", "电价时段再调整", "苏浙已把午间改为低谷，1656 号让市场化用户按合同定价", "容量以自用定，每年按最新电价和合同重算"),
         ("trending-down", "余电上网价", "136 号文要求入市，江苏机制电价竞价 0.25-0.391 元/kWh，不保证中标", "少靠余电，余电按 0.25 元/kWh 做底线"),
         ("building-2", "屋顶承重和产权", "7 号文第十七至十九条。判例：厂房转让后新业主不受原 EMC 约束", "踏勘做结构复核，合同写明转让、拆迁和补偿"),
         ("solar-panel", "组件衰减", "衰减逐年减少发电，前面的测算还没扣", "合同写明衰减上限和质保，到货抽检"),
         ("plug-zap", "接入容量不足", "7 号文：容量不足按申请顺序排队", "踏勘前先查所在县的可开放容量")]
s = line(64, 200, 1196, 200, PET, 2)
for i, (ic, nm, ev, do) in enumerate(risks):
    y = 206 + i * 80
    if i == 0:
        c += box(64, y, 1132, 74, "background: %s; box-shadow: inset 4px 0 0 %s; border-radius: 6px; " % (TANGL, TANG), "")
    s += icon(ic, 82, y + 24, 22, PET)
    c += box(116, y + 22, 200, 28, font(16, 28, INK, 800), nm)
    c += box(330, y + 14, 420, 46, font(14, 23, INK), ev)
    s += icon("shield-check", 786, y + 18, 18, GREEN)
    c += box(814, y + 14, 370, 46, font(14, 23, INK, 600), do)
    if i < 4:
        s += line(64, y + 77, 1196, y + 77, LINE)
c += svg(s)
c += source("来源：发改价格〔2025〕136 号，国能发新能规〔2025〕7 号，江苏增量竞价通知，(2022)浙 06 民终 4075 号（中伦律所综述）")
pages.append(("15 风险", c))

# 16 six steps
c = head(16, 3, "从踏勘到运维六步走，每一步都有贵司确认的检查点")
steps = [("search", "踏勘", "查屋顶结构、配电房和接入点", "踏勘报告", ""),
         ("calculator", "方案与测算", "按贵司电费单和合同出账", "测算书", ""),
         ("file-check", "并网意见与备案", "取得并网意见后才开工", "并网意见和备案文件", "7 号文第十二、十七、二十六条"),
         ("hard-hat", "施工", "结构、消防、防水达标", "竣工资料", "7 号文第十九条"),
         ("plug-zap", "并网验收", "检验合格后投产", "并网检验报告", "7 号文第三十一条"),
         ("wrench", "运维", "发电和节省每月对账", "月度运维报告", "")]
s = ""
W = 178
for i, (ic, t_, d_, doc, src) in enumerate(steps):
    x = 64 + i * (W + 12)
    hot = i == 2
    fill = TANG if hot else PET
    tip = 14
    pts = "%d,%d %d,%d %d,%d %d,%d %d,%d" % (x, 180, x + W - tip, 180, x + W, 204, x + W - tip, 228, x, 228)
    if i:
        pts += " %d,%d" % (x + tip, 204)
    s += '<polygon points="%s" fill="%s"/>' % (pts, fill)
    s += '<text x="%d" y="210" font-size="14" font-weight="800" fill="%s" font-family="PingFang SC, sans-serif">第 %d 步</text>' % (x + (24 if i else 16), INK if hot else "#FFFFFF", i + 1)
    c += card(x, 242, W, 290)
    s += icon(ic, x + 16, 260, 22, PET)
    c += box(x + 16, 292, W - 28, 28, font(17, 28, INK, 800), t_)
    c += box(x + 16, 322, W - 28, 66, font(14, 22, INK), d_)
    s += line(x + 16, 400, x + W - 16, 400, LINE)
    c += box(x + 16, 410, W - 28, 18, font(12, 18, MUTED, 700), "交贵司确认")
    c += box(x + 16, 430, W - 28, 44, font(14, 22, PET, 800), doc)
    if src:
        c += box(x + 16, 480, W - 28, 40, font(12, 18, MUTED), src)
c += box(64, 548, 1132, 58, "background: %s; border-radius: 10px; box-sizing: border-box; padding-left: 58px; " % PETL + font(15, 58, INK), "<b>上储能的另加三道安全关：</b>可研安全论证 · 竣工安全检查 · 投运后安全后评价（65 号文）")
s += icon("clipboard-check", 86, 565, 24, PET)
c += svg(s)
c += source("来源：国能发新能规〔2025〕7 号第十二至三十五条，国能综通安全〔2025〕65 号。各步用时按踏勘后的排期定")
pages.append(("16 六步", c))

# 17 the quote sheet
c = head(17, 3, "报价按造价构成逐项列，屋顶加固和电网接入单独报")
c += box(64, 172, 1132, 420, "border: 1px solid %s; border-radius: 12px; overflow: hidden; " % LINE, "")
c += box(65, 173, 1130, 40, "background: %s; border-radius: 11px 11px 0 0; " % SURF, "")
cols = [(92, "报价项"), (400, "包含什么"), (790, "计价方式"), (1000, "金额（按踏勘结果出具）")]
for x, t_ in cols:
    c += box(x, 183, 200, 20, font(13, 20, MUTED, 700), t_)
groups = [("光伏主体 · 按瓦计价", [("solar-panel", "组件", "光伏组件", "元/W"), ("zap", "逆变器", "组串式逆变器", "元/W"), ("hard-hat", "支架、电缆和建安", "支架、直流交流电缆、安装施工", "元/W")]),
          ("按项单列 · 随现场条件", [("server", "一次和二次设备", "箱变、开关箱、预制舱、监控计量", "按项"), ("plug-zap", "电网接入", "按电网接入意见改造", "按项单列"), ("building-2", "屋顶加固", "按结构复核结果", "按项单列"), ("landmark", "屋顶租赁和管理费用", "租用他方屋顶的租金，设计和报批", "按年，按项")]),
          ("选配", [("battery-charging", "储能", "电池柜、变流器、消防和安全论证", "元/kWh，测算过线才报")])]
s = ""
y = 218
for g, items in groups:
    c += box(92, y + 4, 400, 22, font(12, 22, PET, 800, "letter-spacing: 1px"), g)
    y += 28
    for ic, nm, what, how in items:
        if nm == "屋顶加固":
            c += box(66, y, 1128, 34, "background: %s; " % TANGL, "")
            c += chip(600, y + 5, "不需要则为零", INK, TANG, None, 12, 24)[0]
        s += icon(ic, 92, y + 8, 18, PET)
        c += box(122, y + 6, 270, 22, font(15, 22, INK, 700), nm)
        c += box(400, y + 6, 380, 22, font(14, 22, INK), what)
        c += box(790, y + 6, 200, 22, font(14, 22, INK, 600), how)
        c += box(1000, y + 6, 170, 22, font(14, 22, "#B9B3A8", 600, "letter-spacing: 4px"), "— — —")
        s += line(66, y + 34, 1194, y + 34, LINE)
        y += 34
c += svg(s)
c += source("报价项按 CPIA 光伏路线图（2024-2025 年）的工商业分布式造价构成列出，运维按元/W·年另报")
pages.append(("17 报价结构", c))

# 18 documents checklist
c = head(18, 4, "请贵司提供六份资料，测算就换成贵司自己的账")
docs = [("receipt", "近 12 个月电费单", "分时电量、需量电费和实际电价", "财务部门"),
        ("handshake", "售电合同或代理购电确认", "10 千伏以上用户的真实峰谷价", "售电公司"),
        ("activity", "15 分钟负荷曲线", "白天自用比例和储能充放时段", "电网或厂内计量"),
        ("ruler", "屋顶结构图和产权证明", "复核承重，确认产权，签屋顶协议", "基建和法务"),
        ("plug-zap", "变压器容量和配电系统图", "选接入点，核需量", "动力部门"),
        ("calendar", "生产班次和停产检修计划", "算周末自用比例，排施工窗口", "生产部门")]
s = ""
for i, (ic, t_, use, who) in enumerate(docs):
    x = 64 + (i % 2) * 574
    y = 178 + (i // 2) * 124
    c += card(x, y, 558, 110)
    s += rect(x + 24, y + 24, 24, 24, "#FFFFFF", 'rx="5" stroke="%s" stroke-width="2"' % PET)
    s += icon(ic, x + 70, y + 24, 22, PET)
    c += box(x + 104, y + 20, 300, 30, font(18, 30, INK, 800), t_)
    c += box(x + 104, y + 56, 420, 22, font(14, 22, MUTED), "用来：" + use)
    cw = int(tw(who, 12, 7.4) + 22)
    c += chip(x + 558 - 24 - cw, y + 24, who, PET, PETL, None, 12, 24)[0]
c += svg(s)
c += box(64, 556, 1132, 50, "border-top: 2px solid %s; box-sizing: border-box; " % PET + font(16, 48, INK, 700), '资料齐了，我们按贵司自己的电价出测算和踏勘报告。<span style="font-weight:400;color:%s">勾掉一份，测算里就少一个假设。</span>' % MUTED)
pages.append(("18 资料清单", c))

# 19 ending: the three decisions as ballot cards
c = tabs(4)
c += box(64, 34, 700, 18, font(12, 18, MUTED, 600, "letter-spacing: 1px"), '<span style="color:%s">%s</span> · 呈 贵司管理层' % (PET, LABEL))
c += box(64, 96, 1132, 60, font(44, 60, PET, 900, "white-space: nowrap"), "请贵司定三件事，我们就开始踏勘")
dec = [("授权踏勘屋顶和配电房", "做结构复核和接入点检查，出踏勘报告", ["同意", "再议"]),
       ("先给电费单和售电合同", "测算换成贵司自己的电价和合同", ["同意", "再议"]),
       ("选一种出资方式", "自投、合同能源管理或融资租赁", ["自投", "EMC", "融资租赁"])]
s = ""
for i, (t_, d_, opts) in enumerate(dec):
    x = 64 + i * 382
    c += card(x, 206, 368, 268)
    c += box(x + 28, 226, 100, 22, font(15, 22, TANGD, 900, "letter-spacing: 1px"), "%02d" % (i + 1))
    c += box(x + 28, 256, 320, 64, font(21, 32, INK, 800), t_)
    c += box(x + 28, 326, 320, 44, font(14, 22, MUTED), d_)
    s += line(x + 28, 396, x + 340, 396, LINE)
    ox = x + 28
    for o in opts:
        s += rect(ox, 418, 22, 22, "#FFFFFF", 'rx="4" stroke="%s" stroke-width="2"' % PET)
        s += '<text x="%d" y="435" font-size="15" font-weight="700" fill="%s" font-family="PingFang SC, sans-serif">%s</text>' % (ox + 30, INK, o)
        ox += 30 + int(tw(o, 15, 9)) + 26
c += svg(s)
c += box(64, 512, 220, 56, "background: %s; border-radius: 28px; text-align: center; " % TANG + font(19, 56, INK, 900), "约踏勘时间")
c += box(306, 512, 800, 56, font(16, 56, MUTED), "收到资料后，按贵司自己的电价出测算和踏勘报告")
c += pgnum(19)
pages.append(("19 请贵司定的事", c))

assert len(pages) == TOTAL, len(pages)
boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="brief 主题当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 现在（brief）"}; order_.append(cur)
    loc = inner
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "新主题「方案」设计稿：厂房屋顶光伏与储能提案",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
