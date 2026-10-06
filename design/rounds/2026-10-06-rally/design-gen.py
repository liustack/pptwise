import json, os, re, datetime, random
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#2A1E3F"; SURF = "#35284E"; DEEP = "#23173A"; MAG = "#E84F8A"; TXT = "#F6F2F9"; MUTED = "#B3A6C7"; LINE = "#4A3A66"
GOLD = "#F0B429"; CYAN = "#4FC1E9"; LIME = "#9BE36D"; CORAL = "#F07764"; DIMV = "#5B4B7A"; INK = "#1A1030"
CONF = [MAG, GOLD, CYAN, LIME]
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["crowd", "train", "kioskwide", "wristband", "exit", "riverside", "confetti"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=MUTED, sw=2):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + TXT + "; font-family: " + SANS + """">
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


def font(size, lh, color=TXT, weight=400, extra=""):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (size, lh, color, weight, extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="PingFang SC, Microsoft YaHei, sans-serif">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def tw(s, cjk=12, lat=7.2):
    return sum(cjk if ord(ch) > 0x2e80 else lat for ch in s)


def confetti(seed, region=(1100, 14, 160, 44), n=7):
    rnd = random.Random(seed)
    x0, y0, w, h = region
    s = ""
    for i in range(n):
        x = x0 + rnd.random() * w; y = y0 + rnd.random() * h
        col = CONF[i % 4]; rot = rnd.randint(-60, 60); ww = rnd.choice([10, 14, 6]); hh = rnd.choice([4, 5, 10])
        s += '<rect x="%.1f" y="%.1f" width="%d" height="%d" rx="1.5" fill="%s" transform="rotate(%d %.1f %.1f)" opacity="0.9"/>' % (x, y, ww, hh, col, rot, x, y)
    return s


def ticket(x, y, act, label, w=None, on=MAG):
    act_w = int(tw(act, 12, 7.6) + 22)
    lab_w = int(tw(label, 14, 8.4) + 26)
    w = w or act_w + lab_w
    out = box(x, y, act_w, 30, "background: %s; border-radius: 6px 0 0 6px; text-align: center; " % on + font(12, 30, INK, 800, "letter-spacing: 1px"), act)
    out += box(x + act_w, y, lab_w, 30, "background: %s; border-radius: 0 6px 6px 0; border-left: 2px dashed %s; box-sizing: border-box; padding-left: 12px; " % (SURF, BG) + font(14, 30, TXT, 700), label)
    out += box(x + act_w - 6, y - 6, 12, 12, "background: %s; border-radius: 6px" % BG)
    out += box(x + act_w - 6, y + 24, 12, 12, "background: %s; border-radius: 6px" % BG)
    return out


def head(pg, act, label, title, size=34, seed=None):
    out = svg(confetti(seed if seed is not None else pg))
    out += ticket(64, 30, act, label)
    out += box(64, 76, 1152, 96, "display: flex; flex-direction: column; justify-content: flex-end; " + font(size, 46, TXT, 800), "<div>" + title + "</div>")
    out += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right; font-variant-numeric: tabular-nums"), "%02d / %d" % (pg, TOTAL))
    return out


def source(t_, y=650):
    return box(64, y, 1000, 30, font(12, 16, MUTED), t_)


def photo(key, x, y, w, h, radius=10, extra=""):
    return box(x, y, w, h, "overflow: hidden; border-radius: %dpx; %s" % (radius, extra), '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: " + SURF + "; border-radius: 12px; box-sizing: border-box; " + extra, content)


def chip(x, y, text, color=MUTED, size=12):
    w = int(tw(text, size, size * 0.6) + 20)
    return box(x, y, w, 22, "border: 1px solid %s; border-radius: 11px; box-sizing: border-box; text-align: center; white-space: nowrap; " % color + font(size, 20, color, 700), text)


pages = []

# 1 cover
c = photo("crowd", 0, 0, 1280, 720, 0)
c += box(0, 0, 1280, 720, "background: linear-gradient(0deg, rgba(42,30,63,0.97) 0%, rgba(42,30,63,0.75) 40%, rgba(42,30,63,0.1) 72%)")
c += svg(confetti(1, (900, 380, 340, 200), 12))
c += ticket(64, 64, "提案", "市场部 · 2026 年 10 月")
c += box(64, 404, 1100, 90, font(72, 86, TXT, 900, "white-space: nowrap"), "2027 夏季演唱会季")
c += box(64, 498, 1100, 40, font(26, 40, MAG, 800), "开场前，散场后：在跨城歌迷的演唱会周末里接住他们")
x = 64
for txt_, ic in [("6 至 9 月", "calendar-days"), ("场外 · 场后 · 城市", "map-pin"), ("每个触点带一个码", "qr-code")]:
    w = int(tw(txt_, 15, 9) + 60)
    c += box(x, 576, w, 40, "border: 1.5px solid %s; border-radius: 20px; box-sizing: border-box; padding-left: 42px; " % LINE + font(15, 37, TXT, 700), txt_)
    c += svg(icon(ic, x + 14, 586, 18, MAG))
    x += w + 12
pages.append(("1 封面", c))

# 2 one-liner
c = svg(confetti(2, (60, 40, 1160, 120), 14) + confetti(22, (60, 560, 1160, 120), 10))
c += ticket(64, 30, "01", "一句话方案")
c += box(64, 196, 1152, 80, font(28, 40, MUTED, 700), "2027 年夏天，我们不进场馆抢冠名，")
c += box(64, 248, 1152, 110, font(72, 100, TXT, 900), "去<span style=\"color:%s\">开场前</span>和<span style=\"color:%s\">散场后</span>" % (MAG, MAG))
c += box(64, 360, 1152, 100, font(72, 100, TXT, 900), "接住跨城歌迷")
c += box(64, 500, 1152, 1, "background: " + LINE)
items = [("cup-soda", "场外饮品站", "现制杯装，杯上带码"), ("package", "联名包装", "包装码，看动销"), ("ticket", "票根换饮", "门店券，看到店")]
s = ""
for i, (ic, a, b) in enumerate(items):
    x = 64 + i * 392
    s += icon(ic, x, 532, 26, MAG)
    c += box(x + 40, 528, 320, 30, font(20, 30, TXT, 800), a)
    c += box(x + 40, 562, 320, 24, font(15, 24, MUTED), b)
c += svg(s)
c += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right"), "02 / %d" % TOTAL)
pages.append(("2 一句话方案", c))

# 3 big number + bars
c = head(3, "02", "大盘", "大型演出一年 4338.58 万人次，票房占全国一半以上")
c += box(64, 200, 640, 150, font(130, 150, MAG, 900, "white-space: nowrap; letter-spacing: -3px"), "4338.58")
c += box(64, 350, 640, 40, font(26, 40, TXT, 800), "万人次 · 2025 年 · 同比 +18.81%")
c += box(64, 400, 600, 60, font(16, 26, MUTED), "5000 人以上大型营业性演出观众。2026 年上半年再涨 20.37%。")
bars = [("2019", 39.64), ("2023", 177.96), ("2024", 296.36), ("2025", 324.48)]
s = ""
bx0, by1 = 760, 560
for i, (yr, v) in enumerate(bars):
    x = bx0 + i * 112; h = v * 1.0
    col = MAG if yr == "2025" else DIMV
    s += rect(x, by1 - h, 80, h, col, 'rx="6"') + t(x + 40, by1 - h - 10, "%g" % v, 16, TXT if yr == "2025" else MUTED, "middle", 800) + t(x + 40, by1 + 24, yr, 14, MUTED, "middle", 700)
s += line(744, by1, 1216, by1, LINE, 1.5) + t(760, 214, "大型演出票房（亿元）", 13, MUTED, "start", 700)
c += svg(s)
c += box(64, 500, 600, 110, "background: %s; border-radius: 12px; box-sizing: border-box; padding: 20px 24px" % SURF)
c += box(88, 516, 560, 30, font(17, 28, TXT, 800), "票房占全国演出一半以上")
c += box(88, 548, 560, 50, font(14, 22, MUTED), "2023 年 35.4%，2024 年 51.1%，2025 年约 52.6%（324.48 ÷ 616.55）")
c += source("来源：中演协 2025 年度简报（2026-01），2026 年上半年数据（2026-07），中演协与灯塔专业版报告（2025-04）")
pages.append(("3 大盘", c))

# 4 divergence
c = head(4, "03", "分岔", "演唱会和音乐节在分岔：2025 年演唱会观众涨 30.8%，音乐节跌 6.1%")
s = ""
s += '<path d="M 140 470 C 360 470, 480 300, 700 240" fill="none" stroke="%s" stroke-width="10" stroke-linecap="round"/>' % MAG
s += '<path d="M 140 470 C 360 470, 480 520, 700 560" fill="none" stroke="%s" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 16"/>' % MUTED
s += '<circle cx="140" cy="470" r="14" fill="%s"/>' % TXT + t(140, 506, "2024", 14, MUTED, "middle", 700)
s += icon("mic-vocal", 716, 220, 30, MAG) + icon("tent", 716, 540, 30, MUTED)
c += svg(s)
c += box(760, 196, 456, 30, font(16, 30, MAG, 800), "演唱会 · 2027 押这边")
c += box(760, 230, 456, 80, font(64, 80, TXT, 900, "white-space: nowrap"), "+30.8%")
c += box(760, 312, 456, 52, font(15, 24, MUTED), "近 3800 万人次 · 2496 场 · 票房 295.58 亿元（+13.7%）")
c += box(760, 470, 456, 30, font(16, 30, MUTED, 800), "音乐节")
c += box(760, 504, 456, 70, font(56, 70, MUTED, 900, "white-space: nowrap"), "−6.1%")
c += box(760, 576, 456, 48, font(15, 24, MUTED), "545.6 万人次 · 547 场 · 2026 年 3 至 5 月约 40 场，上年同期 90 多场")
c += chip(980, 470, "媒体报道", MUTED)
c += source("来源：中演协与灯塔专业版（2026-04），界面新闻（2026-04）。2026 年春季场次为业内人士说法")
pages.append(("4 分岔", c))

# 5 calendar heat
c = head(5, "04", "档期", "演唱会场次 8 至 9 月见顶，音乐节高峰在五一和十一")
months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
conc = {5: 2, 8: 3, 9: 3, 11: 2}; fest = {5: 3, 7: 1, 8: 1, 9: 1, 10: 3}
s = ""
gx0 = 220; cw = 80
s += rect(gx0 + 5 * cw - 4, 206, 4 * cw + 8, 270, "none", 'stroke="%s" stroke-width="2" stroke-dasharray="6 5" rx="10"' % MAG)
for i, m in enumerate(months):
    x = gx0 + i * cw
    s += t(x + cw / 2, 232, m + " 月", 13, MUTED, "middle", 700)
    for r, (dic, col) in enumerate([(conc, MAG), (fest, CYAN)]):
        y = 252 + r * 104
        lv = dic.get(i + 1, 0)
        op = [0.12, 0.45, 0.7, 1][lv]
        s += rect(x + 4, y, cw - 8, 88, col if lv else DIMV, 'rx="8" opacity="%.2f"' % (op if lv else 0.35))
        if lv == 3:
            s += icon("flame", x + cw / 2 - 11, y + 32, 22, INK, 2.2)
s += t(80, 304, "演唱会", 18, TXT, "start", 800) + t(80, 408, "音乐节", 18, TXT, "start", 800)
c += svg(s)
c += box(gx0 + 5 * cw, 486, 4 * cw, 30, font(16, 30, MAG, 800, "text-align: center"), "2027 演唱会季 · 6 至 9 月")
legend = [("演唱会：8、9 月场次见顶，5、11 月票房高点", MAG), ("音乐节：五一超过 60 场、十一超过 40 场，7 至 9 月次高", CYAN)]
for i, (txt_, col) in enumerate(legend):
    c += box(64 + i * 576, 548, 14, 14, "background: %s; border-radius: 3px; margin-top: 4px" % col)
    c += box(88 + i * 576, 544, 540, 24, font(15, 24, TXT), txt_)
c += box(64, 590, 1152, 24, font(13, 24, MUTED), "色块深浅只表示高峰位置，2024 年月度柱图没有标数值")
c += source("来源：中演协与灯塔专业版《2024 大型营业性演出市场趋势及特点分析》（2025-04）")
pages.append(("5 档期", c))

# 6 audience: 100% stacked age bars
c = head(6, "05", "人群", "七成以上观众是 18 至 34 岁，女性约占三分之二")
ages = ["青少年", "18-24", "25-29", "30-34", "35-39", "40-44", "45+"]
rows = [("演唱会", [3.6, 25.8, 31.1, 18.0, 10.3, 5.4, 5.9], "74.9%"), ("音乐节", [5.0, 36.2, 33.3, 15.4, 6.0, 2.2, 1.9], "84.9%")]
cols = [DIMV, MAG, "#F07BA8", "#F4A6C4", "#7E6AA0", "#6B5A8C", "#5B4B7A"]
s = ""
for r, (nm, vals, core) in enumerate(rows):
    y = 228 + r * 120
    s += t(64, y + 36, nm, 20, TXT, "start", 800)
    x = 180.0; W = 760
    for j, v in enumerate(vals):
        w = W * v / 100
        s += rect(x, y + 6, w - 2, 52, cols[j])
        if v >= 10:
            s += t(x + w / 2, y + 38, "%g" % v, 14, INK if j in (1, 2, 3) else TXT, "middle", 800)
        x += w
    x18 = 180 + W * vals[0] / 100
    x34 = 180 + W * sum(vals[:4]) / 100
    s += line(x18, y + 66, x34, y + 66, TXT, 2) + t((x18 + x34) / 2, y + 86, "18 至 34 岁 " + core, 14, TXT, "middle", 800)
for j, a in enumerate(ages):
    x = 180 + j * 108
    s += rect(x, 470, 12, 12, cols[j], 'rx="2"') + t(x + 18, 481, a, 12, MUTED)
c += svg(s)
c += card(980, 196, 236, 290)
c += svg(icon("venus", 1000, 216, 28, MAG))
c += box(1000, 256, 200, 70, font(56, 70, MAG, 900), "66.1%")
c += box(1000, 326, 200, 44, font(14, 22, TXT, 700), "演唱会观众中的女性")
c += box(1000, 372, 200, 44, font(13, 22, MUTED), "音乐节 67.1%（2024 年）")
c += box(1000, 426, 200, 44, font(13, 22, MUTED), "00 后占现场音乐观众 32.5%（2025 年）")
c += box(64, 520, 1152, 70, "border: 1.5px dashed %s; border-radius: 12px; box-sizing: border-box; padding: 0 24px 0 64px; display: flex; align-items: center; " % LINE + font(16, 26, TXT), "大盘不等于单场：刀郎巡演 50 岁以上观众占 44.5%。选场次要看艺人的单场画像。")
c += svg(icon("user-round-search", 84, 544, 24, GOLD))
c += source("来源：中演协与灯塔专业版（2025-04，灯塔平台数据），中演协现场音乐报告（DoNews 2026-04）")
pages.append(("6 人群", c))

# 7 cross-city
c = head(7, "06", "跨城", "64.2% 的演唱会观众跨城而来，城市越小，外地观众越多")
tiers = [("一线", 46.5, 10.2, 43.3), ("二线", 35.1, 20.7, 44.2), ("三线", 28.3, 37.0, 34.7), ("四线", 18.6, 48.5, 33.0)]
s = ""
for i, (nm, a, b, cc) in enumerate(tiers):
    y = 208 + i * 70
    s += t(64, y + 32, nm, 17, TXT, "start", 800)
    x = 130.0; W = 560
    for v, col in [(a, DIMV), (b, GOLD), (cc, MAG)]:
        w = W * v / 100
        s += rect(x, y + 8, w - 2, 40, col, 'rx="4"' if False else "")
        s += t(x + w / 2, y + 34, "%g" % v, 13, TXT if col == DIMV else INK, "middle", 800)
        x += w
for j, (lab, col) in enumerate([("本城", DIMV), ("省内跨城", GOLD), ("跨省", MAG)]):
    s += rect(130 + j * 110, 498, 12, 12, col, 'rx="2"') + t(148 + j * 110, 509, lab, 13, MUTED)
s += t(130, 540, "按演出举办城市分线，2024 年", 13, MUTED)
c += svg(s)
c += photo("train", 740, 196, 476, 230)
c += box(740, 432, 476, 18, font(12, 18, MUTED), "示意图（AI 生成）")
c += box(740, 470, 476, 80, font(72, 80, MAG, 900), "64.2%")
c += box(740, 552, 476, 48, font(15, 24, TXT, 700), "2024 年大型演唱会观众跨城观演（音乐节 62.2%）")
c += source("来源：中演协与灯塔专业版（2025-04，灯塔平台数据）")
pages.append(("7 跨城", c))

# 8 weekend journey
c = head(8, "07", "周末", "跨城歌迷的演唱会周末：78.5% 待两天以上，98.4% 在当地吃饭")
stops = [("train-front", "出发", "高铁赶场"), ("cup-soda", "开场前", "场外排队等候"), ("music", "演出中", "场内归主办方"), ("moon-star", "散场后", "找地方吃饭"), ("map-pin", "第二天", "逛街、景区")]
s = '<path d="M 100 270 L 1180 270" stroke="%s" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>' % LINE
for i, (ic, a, b) in enumerate(stops):
    x = 120 + i * 260; mid = i == 2
    col = DIMV if mid else MAG
    s += '<circle cx="%d" cy="270" r="30" fill="%s"/>' % (x, col) + icon(ic, x - 13, 257, 26, INK if not mid else TXT)
    s += t(x, 330, a, 18, TXT if not mid else MUTED, "middle", 800) + t(x, 354, b, 13, MUTED, "middle")
c += svg(s)
c += box(498, 210, 160, 22, font(12, 22, MUTED, 700, "text-align: center"), "我们不进场卖货")
c += card(64, 392, 300, 220)
c += box(88, 410, 260, 22, font(13, 22, MUTED, 700), "停留 2 天及以上")
c += box(88, 436, 260, 76, font(64, 76, MAG, 900), "78.5%")
c += box(88, 516, 260, 70, font(14, 22, MUTED), "2 天 41.5%，3 天 24.2%，4 至 5 天 11.7%")
c += card(384, 392, 832, 220)
c += box(408, 410, 600, 22, font(13, 22, MUTED, 700), "在演出地有这项支出的人占多少（不是金额结构）")
sp = [("餐饮", 98.4, True), ("演出购票", 96.4, False), ("市内交通", 68.1, False), ("购物（含周边）", 64.7, False), ("景区门票", 30.2, False)]
s = ""
for i, (nm, v, em) in enumerate(sp):
    y = 448 + i * 30
    s += t(530, y + 16, nm, 14, TXT if em else MUTED, "end", 700 if em else 400) + rect(546, y + 3, v * 5.6, 18, MAG if em else DIMV, 'rx="4"') + t(546 + v * 5.6 + 10, y + 17, "%g%%" % v, 14, MAG if em else TXT, "start", 800)
c += svg(s)
c += source("来源：中演协委托调查（2024 年最后一次跨城观演，N=830，2025-04）", y=640)
pages.append(("8 周末", c))

# 9 touchpoint map
c = head(9, "08", "触点", "触点地图：场外、场内、场后、城市，每处只做一件事")
tp = [("kioskwide", "cup-soda", "场外", "饮品站，现制杯装，杯上带码", True), ("wristband", "sparkles", "场内", "只做主办方允许的合作", False),
      ("exit", "moon-star", "场后", "接驳点补给，发门店券", False), ("riverside", "map-pin", "城市", "票根换饮，城市商户联动", False)]
for i, (img, ic, nm, job, em) in enumerate(tp):
    x = 64 + (i % 2) * 584; y = 192 + (i // 2) * 214
    c += photo(img, x, y, 260, 196)
    c += card(x + 272, y, 296, 196, "border: 2px solid %s" % (MAG if em else SURF))
    c += svg(icon(ic, x + 292, y + 20, 26, MAG if em else MUTED))
    c += box(x + 330, y + 18, 220, 32, font(24, 32, TXT, 900), nm)
    c += box(x + 292, y + 66, 260, 60, font(16, 26, TXT), job)
    c += box(x + 292, y + 150, 260, 22, font(12, 22, MUTED), "示意图（AI 生成）")
c += box(64, 622, 1152, 24, font(14, 24, GOLD, 700), "北京警方曾提示大型活动禁带瓶装饮料（北京特定时段，非全国规定）：我们不发瓶装让观众带进场")
pages.append(("9 触点地图", c))

# 10 cases
c = head(10, "09", "同行", "同行做过饮品站、联名和买赠门票，但没有一例公开可归因的销量")
cs = [("cup-soda", "沪上阿姨", "茶饮 · 2024", "巡演联名双杯套餐，12 城 700 多家门店", "10 分钟销量破 1 万份", "企业口径"),
      ("zap", "战马", "能量饮料 · 2025", "新疆超级草莓音乐节全场饮品站冠名", "现场近 8 万乐迷（全场人数）", "品牌软文"),
      ("milk", "畅轻", "乳品 · 2025", "草莓音乐节联名包装，买酸奶抽门票", "未披露", "营销媒体"),
      ("ice-cream-cone", "伊利须尽欢", "乳品 · 2024", "冠名 3 场演唱会，现场设销售点", "微博曝光超过 11 亿", "企业口径"),
      ("wine", "洋河梦之蓝 M6+", "白酒 · 2024", "巡演 8 城冠名，扫码开瓶得票", "视频播放突破 50 亿", "企业口径"),
      ("megaphone", "百事可乐", "饮料 · 2023", "TFBOYS 十年之约西安站主冠名", "未披露品牌效果", "媒体报道")]
s = ""
for i, (ic, nm, cat, how, eff, src) in enumerate(cs):
    x = 64 + (i % 3) * 300; y = 192 + (i // 3) * 210
    c += card(x, y, 284, 194)
    s += icon(ic, x + 18, y + 18, 22, MUTED)
    c += box(x + 50, y + 16, 220, 26, font(17, 26, TXT, 800), nm)
    c += box(x + 18, y + 48, 250, 20, font(12, 20, MUTED), cat)
    c += box(x + 18, y + 74, 250, 48, font(14, 22, TXT), how)
    c += box(x + 18, y + 128, 250, 1, "border-top: 1.5px dashed %s" % LINE)
    c += box(x + 18, y + 138, 250, 24, font(14, 24, MUTED), eff)
    c += chip(x + 18, y + 164, src, GOLD if "企业" in src or "软文" in src else MUTED)
c += svg(s)
c += box(980, 192, 236, 404, "background: %s; border-radius: 12px; box-sizing: border-box; padding: 24px" % MAG)
c += box(1004, 216, 190, 24, font(15, 24, INK, 800), "公开可归因的销量")
c += box(1004, 250, 190, 150, font(140, 150, INK, 900), "0")
c += box(1004, 410, 190, 22, font(15, 22, INK, 800), "例")
c += box(1004, 450, 190, 120, font(15, 24, INK), "效果数字都是曝光、热搜、售罄，查不到一个能算回销量的数")
c += source("来源：数英（2024-03、2024-06、2025-06），21 世纪经济报道，中华网，界面新闻，锌财经。效果数字均为自报")
pages.append(("10 同行案例", c))

# 11 attribution loop
c = head(11, "10", "归因", "每个触点都带一个码，从领杯到复购都能算回场次")
st = [("qr-code", "发码", "杯码、包装码、票根券，带城市和场次"), ("smartphone", "扫码领券", "进小程序领门店券"), ("store", "门店核销", "核销记录算回到触点"), ("repeat", "复购回访", "看 30 天内是否再买"), ("scale", "对照复盘", "和没有演出的同类城市比")]
s = ""
for i, (ic, a, b) in enumerate(st):
    x = 64 + i * 232; last = i == 4
    s += rect(x, 196, 212, 160, MAG if i == 0 else SURF, 'rx="12"')
    s += t(x + 20, 230, "%02d" % (i + 1), 14, INK if i == 0 else MUTED, "start", 800) + icon(ic, x + 168, 212, 26, INK if i == 0 else MAG)
    if i < 4:
        s += '<polygon points="%d,270 %d,276 %d,282" fill="%s"/>' % (x + 216, x + 228, x + 216, MAG)
s += '<path d="M 1170 362 C 1170 400, 1170 400, 1130 400 L 170 400 C 130 400, 130 400, 130 362" fill="none" stroke="%s" stroke-width="2" stroke-dasharray="5 5"/>' % MUTED + '<polygon points="124,368 130,356 136,368" fill="%s"/>' % MUTED
s += t(650, 394, "复盘结果回到下一站的发码", 13, MUTED, "middle", 700)
c += svg(s)
for i, (ic, a, b) in enumerate(st):
    x = 64 + i * 232
    c += box(x + 20, 244, 180, 32, font(22, 32, INK if i == 0 else TXT, 900), a)
    c += box(x + 20, 284, 176, 60, font(14, 22, INK if i == 0 else MUTED), b)
cols_ = [("触点", 64, 220), ("码", 290, 120), ("能算清", 420, 380), ("首站要验证", 810, 406)]
for lab, x, w in cols_:
    c += box(x + 8, 424, w, 20, font(12, 20, MUTED, 700), lab)
c += box(64, 448, 1152, 2, "background: " + TXT)
rw = [("cup-soda", "场外饮品站", "杯码", "领取人数，按城市和场次", "现场试饮能否变成门店购买"), ("package", "联名包装", "包装码", "扫码率和联名款动销", "买的是不是新客"), ("ticket", "票根换饮", "门店券", "跨城观众到店人数", "回家后是否还买")]
s = ""
for i, (ic, a, b, cc, d) in enumerate(rw):
    y = 450 + i * 54
    c += box(64, y + 53, 1152, 1, "background: " + LINE)
    s += icon(ic, 72, y + 16, 20, MAG)
    c += box(102, y + 14, 180, 26, font(16, 26, TXT, 800), a)
    c += box(298, y + 14, 110, 26, font(15, 26, MAG, 800), b)
    c += box(428, y + 14, 370, 26, font(15, 26, TXT), cc)
    c += box(818, y + 14, 398, 26, font(15, 26, MUTED), d)
c += svg(s)
pages.append(("11 归因", c))

# 12 city stubs
c = head(12, "11", "城市", "城市已在用票根接住歌迷，我们做票根商户，凭票根换一杯")
stubs = [("landmark", "国家", "跟着演出去旅行", "2025 年 1 月国办文件写进全国措施"), ("map-pin", "南京", "乐享 1+3", "453 家商户，观演前后一周凭票享优惠"),
         ("ticket", "上海浦东", "票根兑优惠", "财政补贴 30%，商家让利 20%，实名核验"), ("bus-front", "青岛", "票根经济 3.0", "超过 800 家商户，开散场接驳专线")]
for i, (ic, city, nm, d) in enumerate(stubs):
    x = 64 + (i % 2) * 432; y = 196 + (i // 2) * 200
    c += box(x, y, 410, 180, "background: %s; border-radius: 12px; box-sizing: border-box" % SURF)
    c += box(x + 300, y, 2, 180, "border-left: 2px dashed %s" % BG)
    c += box(x + 294, y - 8, 14, 14, "background: %s; border-radius: 7px" % BG) + box(x + 294, y + 174, 14, 14, "background: %s; border-radius: 7px" % BG)
    c += svg(icon(ic, x + 22, y + 22, 24, MAG))
    c += box(x + 56, y + 20, 230, 28, font(14, 28, MUTED, 700), city)
    c += box(x + 22, y + 60, 270, 34, font(24, 34, TXT, 900), nm)
    c += box(x + 22, y + 104, 268, 60, font(14, 22, MUTED), d)
    c += box(x + 312, y + 60, 86, 60, font(13, 20, MAG, 800, "text-align: center"), "凭票根")
c += card(944, 196, 272, 380)
c += svg(icon("building-2", 964, 216, 24, MUTED))
c += box(964, 252, 230, 70, font(56, 70, TXT, 900), "1:6.85")
c += box(964, 326, 230, 52, font(14, 22, TXT, 700), "协会测算：1 元票房带动的其他消费")
c += box(964, 386, 228, 1, "background: " + LINE)
c += box(964, 400, 230, 160, font(14, 22, GOLD), "方法未公开。只说明城市为什么欢迎演出，不算品牌回报。")
c += source("来源：国务院办公厅（2025-01），扬子晚报（2025-10），浦东新区政府（2025-06），中新网（2026-06），中演协（2026-01）")
pages.append(("12 城市票根", c))

# 13 plan B
c = head(13, "12", "预案", "六类风险最近两年都发生过，每一类先写好预案")
rk = [("cloud-lightning", "天气", "2026-07 台风「巴威」，邓紫棋杭州站 3 场取消", "站点物料可转场，门店券随改期顺延", False),
      ("siren", "执行事故", "2025-05 元气森林北京音乐节演出被压缩，现场喊退票", "不自办音乐节，舞台归主办方，我们只管场外站点", False),
      ("user-x", "艺人", "2021-08 张哲瀚事件，4 小时 21 分内 26 个品牌解约", "只签场次合作不签代言，含道德条款，4 小时内下线物料", False),
      ("ticket-x", "黄牛", "镇江团伙两年抢票 6 万多张，获利 1600 多万元", "激励门票只走实名，中奖人即观演人", False),
      ("rotate-ccw", "退票", "2025 年上半年演唱会投诉翻番，退票诉求超过九成", "激励票的退改规则在活动页写清，按平台规则执行", False),
      ("ban", "禁带瓶装", "北京警方 2026 年端午大型活动提示禁带瓶装饮料", "场外现制杯装当场喝完，不发瓶装让观众带进场", True)]
c += box(64, 190, 500, 20, font(12, 20, MUTED, 700), "风险 · 公开事件")
c += box(760, 190, 456, 20, font(12, 20, MAG, 800), "预案（Plan B）")
s = ""
for i, (ic, r, ev, pb, em) in enumerate(rk):
    y = 216 + i * 70
    c += box(64, y, 1152, 62, "background: %s; border-radius: 10px" % ("rgba(232,79,138,0.18)" if em else SURF))
    s += icon(ic, 84, y + 19, 24, MAG if em else MUTED)
    c += box(120, y + 18, 120, 26, font(17, 26, TXT, 800), r)
    c += box(244, y + 10, 480, 44, font(14, 22, MUTED), ev)
    s += '<polygon points="%d,%d %d,%d %d,%d" fill="%s"/>' % (730, y + 25, 742, y + 31, 730, y + 37, MAG)
    c += box(760, y + 10, 440, 44, font(14, 22, TXT, 700 if em else 400), pb)
c += svg(s)
c += source("来源：观察者网，中国音乐财经，界面新闻，央视新闻，法治日报（转述中消协），北京市公安局", y=652)
pages.append(("13 预案", c))

# 14 schedule gantt
c = head(14, "13", "排期", "10 月拍板，明年 6 月首站开场，9 月底收官复盘")
mlab = ["2026.10", "11", "12", "2027.1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
gx0, gx1 = 300, 1200
mw = (gx1 - gx0) / 12
s = ""
for i, m in enumerate(mlab):
    x = gx0 + i * mw
    s += line(x, 200, x, 600, LINE, 1) + t(x + 4, 196, m, 12, MUTED, "start", 700)
s += rect(gx0 + 8 * mw, 204, 4 * mw, 396, "rgba(232,79,138,0.10)") + t(gx0 + 10 * mw, 616, "演唱会季 6 至 9 月", 13, MAG, "middle", 800)
gt = [("拍板立项", "", 0, 1, False), ("选城市，谈场次", "主办方和场馆", 1, 4, False), ("包装、看板、票根", "5 月前就绪", 2, 8, False), ("首站试点", "复盘过关才拨第二批", 8, 9, True), ("演唱会季执行", "覆盖 8、9 月高峰", 9, 12, False), ("收官复盘", "", 11, 12, False)]
for i, (a, b, s0, s1, em) in enumerate(gt):
    y = 216 + i * 62
    s += rect(gx0 + s0 * mw + 2, y + 10, (s1 - s0) * mw - 4, 30, MAG if em else DIMV, 'rx="15"')
    if em:
        s += icon("star", gx0 + s0 * mw + mw / 2 - 9, y + 16, 18, INK, 2.2)
c += svg(s)
for i, (a, b, s0, s1, em) in enumerate(gt):
    y = 216 + i * 62
    c += box(64, y + 4, 220, 24, font(16, 24, MAG if em else TXT, 800), a)
    if b:
        c += box(64, y + 28, 220, 20, font(12, 20, MUTED), b)
pages.append(("14 排期", c))

# 15 KPI scoreboard
c = head(15, "14", "看板", "KPI 看板只放能核销的数，目标值在首站复盘后再定")
kp = [("qr-code", "杯码核销", "饮品站领取并扫码的杯数，按城市和场次拆"), ("store", "门店券核销率", "散场后 7 天内核销张数 ÷ 发放张数"), ("package", "联名款增量", "演出城市与对照城市联名款周销量之差"),
      ("repeat", "30 天复购", "扫码会员 30 天内再次购买的比例"), ("ticket", "票根换饮", "凭票根换饮的核销次数，按城市和商户拆"), ("message-circle-warning", "舆情", "负面提及占比，触发即启动 4 小时处置")]
s = ""
for i, (ic, nm, d) in enumerate(kp):
    x = 64 + (i % 3) * 392; y = 192 + (i // 3) * 214
    c += box(x, y, 368, 198, "background: %s; border-radius: 12px; border: 1px solid %s; box-sizing: border-box" % (DEEP, LINE))
    s += icon(ic, x + 20, y + 20, 22, MAG if i == 0 else MUTED)
    c += box(x + 54, y + 18, 290, 26, font(17, 26, TXT, 800), nm)
    c += box(x + 20, y + 58, 328, 60, font(48, 60, DIMV, 900, "letter-spacing: 6px; font-family: 'SF Mono', Menlo, monospace"), "— — —")
    c += box(x + 20, y + 120, 328, 18, font(12, 18, GOLD, 700), "目标：首站复盘后定")
    c += box(x + 20, y + 144, 328, 44, font(13, 20, MUTED), d)
c += svg(s)
c += box(64, 624, 1152, 24, font(14, 24, TXT, 700), "看板每周报管理层。没有核销码的项目不立项。")
pages.append(("15 KPI 看板", c))

# 16 budget
c = head(16, "15", "预算", "预算按六类拟定比例，归因和风险准备金单列、不挪用")
bd = [("场外饮品站与物料", 30, MAG), ("联名包装与门店活动", 25, GOLD), ("票根合作与门票激励", 15, CYAN), ("内容与线上投放", 15, LIME), ("归因系统与数据", 8, "#F4A6C4"), ("风险准备金", 7, "#C9B8E8")]
s = ""
x = 64.0; W = 1152
for nm, v, col in bd:
    w = W * v / 100
    s += rect(x, 220, w - 4, 96, col, 'rx="6"')
    s += t(x + 14, 262, "%d%%" % v, 26 if v >= 15 else 20, INK, "start", 900)
    x += w
x8 = 64 + W * 0.85
s += line(x8, 330, 1212, 330, TXT, 2) + line(x8, 324, x8, 336, TXT, 2) + line(1212, 324, 1212, 336, TXT, 2) + t((x8 + 1212) / 2, 356, "单列 15%，不挪用", 14, TXT, "middle", 800)
c += svg(s)
for i, (nm, v, col) in enumerate(bd):
    x = 64 + (i % 3) * 392; y = 392 + (i // 3) * 40
    c += box(x, y + 6, 14, 14, "background: %s; border-radius: 3px" % col)
    c += box(x + 24, y, 300, 26, font(15, 26, TXT, 700 if i >= 4 else 400), "%s · %d%%" % (nm, v))
c += card(64, 494, 560, 110)
c += svg(icon("hand-coins", 88, 516, 24, MAG))
c += box(124, 512, 480, 30, font(20, 30, TXT, 800), "分两批拨付")
c += box(124, 548, 480, 44, font(14, 22, MUTED), "首站复盘过关再拨第二批")
c += card(656, 494, 560, 110)
c += svg(icon("file-check", 680, 516, 24, MUTED))
c += box(716, 512, 480, 30, font(20, 30, TXT, 800), "金额另行报批")
c += box(716, 548, 480, 44, font(14, 22, MUTED), "比例为市场部拟定，不是测算")
pages.append(("16 预算", c))

# 17 asks
c = head(17, "16", "请示", "请管理层定四件事：方向、预算、归因口径、风险授权")
ak = [("target", "方向", "押大型演唱会的场外和城市", "不冠名、不自办音乐节，2027 年 6 至 9 月执行", "第 3 至 9 页", True),
      ("wallet", "预算", "按六类比例编制，分两批拨付", "首站复盘过关再拨第二批，金额另行报批", "第 16 页", False),
      ("qr-code", "归因", "没有核销码的项目不立项", "看板每周报管理层，首站后定目标值", "第 10、11、15 页", False),
      ("shield-alert", "授权", "艺人风险由市场部负责人处置", "只签场次合作并含道德条款，出事 4 小时内下线物料", "第 13 页", False)]
for i, (ic, k, ti, d, ref, em) in enumerate(ak):
    x = 64 + (i % 2) * 584; y = 196 + (i // 2) * 214
    c += box(x, y, 568, 198, "background: %s; border-radius: 12px; box-sizing: border-box" % (MAG if em else SURF))
    c += box(x + 440, y, 2, 198, "border-left: 2px dashed %s" % BG)
    c += box(x + 434, y - 8, 14, 14, "background: %s; border-radius: 7px" % BG) + box(x + 434, y + 192, 14, 14, "background: %s; border-radius: 7px" % BG)
    c += svg(icon(ic, x + 24, y + 24, 26, INK if em else MAG))
    c += box(x + 62, y + 22, 200, 30, font(15, 30, INK if em else MUTED, 800, "letter-spacing: 2px"), k)
    c += box(x + 24, y + 66, 400, 64, font(22, 32, INK if em else TXT, 900), ti)
    c += box(x + 24, y + 136, 400, 44, font(14, 22, INK if em else MUTED), d)
    for j, opt in enumerate(["批准", "再议"]):
        yy = y + 50 + j * 56
        c += box(x + 462, yy, 22, 22, "border: 2px solid %s; border-radius: 4px; box-sizing: border-box" % (INK if em else MUTED))
        c += box(x + 494, yy - 2, 60, 26, font(15, 26, INK if em else TXT, 700), opt)
    c += box(x + 452, y + 160, 112, 22, font(11, 22, INK if em else MUTED, 400, "white-space: nowrap"), ref.replace("第 ", "见 "))
pages.append(("17 请示", c))

# 18 ending
c = photo("confetti", 0, 0, 1280, 720, 0)
c += box(0, 0, 1280, 720, "background: linear-gradient(0deg, rgba(42,30,63,0.95) 0%, rgba(42,30,63,0.6) 50%, rgba(42,30,63,0.3) 100%)")
c += ticket(64, 64, "下一步", "开场前，散场后 · 2027 夏季演唱会季")
c += box(64, 300, 1150, 100, font(72, 92, TXT, 900), "10 月拍板，11 月开谈第一站")
nx = [("11 月", "拿出首批城市和场次清单"), ("12 月", "联名包装立项"), ("2027 年 6 月", "首站开场")]
s = ""
for i, (m, d) in enumerate(nx):
    x = 64 + i * 340
    s += '<circle cx="%d" cy="470" r="8" fill="%s"/>' % (x + 8, CONF[i])
    c += box(x + 28, 456, 300, 28, font(18, 28, TXT, 800), m)
    c += box(x + 28, 488, 300, 26, font(15, 26, MUTED), d)
s += line(72, 470, 64 + 2 * 340 + 8, 470, LINE, 2, 'stroke-dasharray="3 6"')
c += svg(s)
c += box(64, 580, 260, 56, "background: %s; border-radius: 28px; text-align: center; " % MAG + font(20, 56, INK, 900), "拍板，开场")
c += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right"), "18 / %d" % TOTAL)
pages.append(("18 结尾", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    loc = inner
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, TXT, SANS, loc))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "rally 演唱会季营销方案样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
