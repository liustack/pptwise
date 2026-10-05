import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#241B14"; SURF = "#2C221A"; ORANGE = "#E56A2C"; CREAM = "#F2E9DF"; MUTED = "#C4AE97"; LINE = "#6B5648"
AMBER = "#E8A13C"; PLUM = "#C48AA8"; SAND = "#A89888"; INKD = "#0A0E14"; DIM = "#4A3B30"; SURF2 = "#33281F"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["cover-dusk", "chapter-night", "chapter-rooftop", "photo-medkit"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(16)]
TOTAL = 16
ACTS = ["机会", "时机", "竞争", "切入", "证明", "风险", "计划", "请求"]

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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + CREAM + "; font-family: " + SANS + """">
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


def font(size, lh, color=CREAM, weight=400, extra=""):
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


def chip(x, y, text, color=MUTED, fill="transparent", fc=None, size=13, h=26):
    w = int(tw(text, size, size * 0.6) + 26)
    return box(x, y, w, h, "border: 1px solid %s; border-radius: %dpx; box-sizing: border-box; text-align: center; white-space: nowrap; background: %s; " % (color, h // 2, fill) + font(size, h - 2, fc or color, 700), text)


def rail(act):
    out = ""
    x = 1216
    ws = [int(tw(a, 12) + 10) for a in ACTS]
    total = sum(ws) + 14 * (len(ACTS) - 1)
    x = 1216 - total
    for a, w in zip(ACTS, ws):
        on = a == act
        out += box(x, 28, w, 20, font(12, 20, CREAM if on else "#8C7A68", 700 if on else 400, "text-align: center"), a)
        if on:
            out += box(x, 50, w, 2, "background: " + CREAM)
        x += w + 14
    return out


def runhead(pg, act):
    out = rail(act)
    out += box(64, 28, 400, 20, font(12, 20, MUTED, 700, "letter-spacing: 3px"), "种子轮路演")
    out += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right; font-variant-numeric: tabular-nums"), "%02d" % pg)
    return out


def head(pg, act, title, size=34):
    out = runhead(pg, act)
    out += box(64, 64, 1152, 96, "display: flex; flex-direction: column; justify-content: flex-end; " + font(size, 46, CREAM, 700), "<div>" + title + "</div>")
    return out


def source(t_, y=650):
    return box(64, y, 1000, 30, font(12, 16, MUTED), t_)


def photo(key, x, y, w, h, extra=""):
    return box(x, y, w, h, "overflow: hidden; " + extra, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: " + SURF + "; border-radius: 4px; box-sizing: border-box; " + extra, content)


def wedge(size=72):
    return svg('<polygon points="0,0 %d,0 0,%d" fill="%s"/>' % (size, size, ORANGE))


def chapter(pg, key, num, title, items):
    c = photo(key, 0, 0, 1280, 720)
    c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(36,27,20,0.96) 0%, rgba(36,27,20,0.85) 46%, rgba(36,27,20,0.15) 100%)")
    c += box(64, 120, 400, 200, font(200, 200, "transparent", 800, "-webkit-text-stroke: 2px %s; letter-spacing: -6px" % ORANGE), num)
    c += box(64, 340, 700, 120, "display: flex; flex-direction: column; justify-content: flex-end; " + font(46, 60, CREAM, 700), "<div>" + title + "</div>")
    for i, (ic, it) in enumerate(items):
        y = 494 + i * 44
        c += svg(icon(ic, 64, y + 4, 20, MUTED))
        c += box(98, y, 620, 28, font(17, 28, CREAM), it)
    c += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right"), "%02d" % pg)
    return c


pages = []

# 1 cover
c = photo("cover-dusk", 0, 0, 1280, 720)
c += box(0, 0, 1280, 720, "background: linear-gradient(0deg, rgba(36,27,20,0.96) 0%, rgba(36,27,20,0.7) 42%, rgba(36,27,20,0.05) 75%)")
c += wedge(88)
c += box(64, 64, 600, 22, font(14, 22, CREAM, 700, "letter-spacing: 4px; margin-left: 40px"), "种子轮路演 · 2026 年 10 月")
c += box(64, 400, 1100, 140, "display: flex; flex-direction: column; justify-content: flex-end; " + font(64, 76, CREAM, 800), "<div>低空即时配送：先飞医疗和社区</div>")
c += box(64, 556, 900, 32, font(21, 32, MUTED), "一家还没开飞的公司，用 18 个月证明三件事")
x = 64
for txt in ["医疗 + 社区", "园区和城郊先行", "18 个月三道验证"]:
    c += chip(x, 612, txt, LINE, "rgba(44,34,26,0.8)", CREAM, 14, 30)
    x += int(tw(txt, 14, 8.4) + 26) + 10
pages.append(("1 封面", c))

# 2 chapter 1
pages.append(("2 第一幕", chapter(2, "chapter-night", "01", "订单池很大，天上几乎还是空的",
                                    [("package", "一年 600 亿单，无人机多年才过百万"), ("trending-up", "为什么是现在：三年三道政策"), ("map-pin", "深圳规划里的医疗起降点"), ("users", "六家先行者证明了什么")])))

# 3 scale contrast
c = head(3, "机会", "一年 600 亿单即时配送，无人机多年累计才过百万单")
c += box(64, 196, 640, 400, "border: 1.5px solid %s; box-sizing: border-box" % LINE)
s = ""
for gx in range(1, 16):
    s += line(64 + gx * 40, 197, 64 + gx * 40, 595, DIM, 0.6)
for gy in range(1, 10):
    s += line(65, 196 + gy * 40, 703, 196 + gy * 40, DIM, 0.6)
s += '<circle cx="80" cy="580" r="3" fill="%s"/>' % ORANGE + line(83, 577, 150, 520, ORANGE, 1.2) + '<circle cx="80" cy="580" r="12" fill="none" stroke="%s" stroke-width="1.2"/>' % ORANGE
c += svg(s)
c += box(96, 220, 560, 120, font(96, 110, CREAM, 800, "white-space: nowrap"), "600 亿")
c += box(100, 338, 560, 30, font(18, 30, MUTED), "2025 年全国即时配送订单，一年")
c += box(156, 488, 400, 30, font(30, 34, ORANGE, 800, "white-space: nowrap"), "100 万+")
c += box(156, 524, 400, 22, font(14, 22, MUTED), "美团无人机多年累计商业订单")
c += box(760, 196, 456, 120, font(64, 76, CREAM, 800, "white-space: nowrap"), "约十万分之二")
c += box(760, 290, 456, 60, font(16, 26, MUTED), "多年累计比一年单量，只说明数量级")
c += box(760, 380, 456, 1, "background: " + LINE)
c += box(760, 404, 456, 120, font(20, 32, CREAM), "订单都在地上跑，天上的份额几乎为零。这不是证明需求，是证明空间还没被占。")
c += source("来源：中物联《2026 中国即时物流行业发展报告》（第一财经 2026-03-26），美团（2026-09-11，企业口径），IT 之家（2026-07-22）。示意图：方格面积不按比例")
pages.append(("3 体量对比", c))

# 4 why now
c = head(4, "时机", "为什么是现在：规则、顺序、定位三年接连落地")
yrs = [("2024", "file-check", "规则落地", "条例和 CCAR-92 于 1 月 1 日同日生效", "运营合格证、执照、保险有了统一门槛"),
       ("2025", "route", "顺序定了", "发改委：先载货、先隔离、先远郊", "载货配送排在放行顺序最前面"),
       ("2026", "trending-up", "定位升了", "第三年写进政府工作报告", "列为「新兴支柱产业」")]
s = ""; bx = ""
for i, (yr, ic, ti, a, b) in enumerate(yrs):
    x = 64 + i * 392
    y0 = 384 - i * 56
    s += rect(x, y0, 368, 600 - y0, SURF, 'rx="4"')
    if i < 2:
        s += line(x + 368, y0, x + 392, y0 - 56, LINE, 1.5, 'stroke-dasharray="4 3"')
    s += icon(ic, x + 24, y0 + 24, 24, ORANGE if i == 2 else MUTED)
    bx += box(x + 24, y0 - 80, 340, 76, font(64, 76, ORANGE if i == 2 else CREAM, 800), yr)
    bx += box(x + 60, y0 + 22, 290, 30, font(20, 30, CREAM, 700), ti)
    bx += box(x + 24, y0 + 64, 320, 52, font(15, 24, CREAM), a)
    bx += box(x + 24, y0 + 118, 320, 48, font(14, 22, MUTED), b)
c += svg(s) + bx
c += box(64, 612, 1152, 30, font(15, 24, MUTED), "底盘也在放大：2025 年全国无人机飞行 4530 万小时（同比 +69.89%），持证运营单位 38872 家")
c += source("来源：《无人驾驶航空器飞行管理暂行条例》，CCAR-92，国家发改委发布会（2025-12-31），2024 至 2026 年政府工作报告，民航局 2025 年统计公报", y=652)
pages.append(("4 为什么是现在", c))

# 5 funnel
c = head(5, "机会", "深圳规划的起降点里，148 个专给医疗")
fn = [("1200 个", "起降点总目标（2026 年）", 1200, SAND), ("413 个", "其中社区配送", 413, DIM), ("148 个", "其中医疗", 148, ORANGE)]
s = ""
cx = 420; top = 200
for i, (v, lab, n, col) in enumerate(fn):
    w1 = 700 * (n / 1200) ** 0.55; w0 = 700 * ((fn[i - 1][2] if i else 1200) / 1200) ** 0.55
    y = top + i * 130
    s += '<polygon points="%.1f,%d %.1f,%d %.1f,%d %.1f,%d" fill="%s"/>' % (cx - w0 / 2, y, cx + w0 / 2, y, cx + w1 / 2, y + 118, cx - w1 / 2, y + 118, col if i != 1 else "#5A4638")
    s += t(cx, y + 62, v, 30, INKD if i != 1 else CREAM, "middle", 800) + t(cx, y + 90, lab, 14, INKD if i != 1 else MUTED, "middle", 700)
c += svg(s)
c += card(840, 196, 376, 190)
c += box(864, 216, 320, 22, font(13, 22, MUTED, 700, "letter-spacing: 2px"), "实绩已经跟上")
c += box(864, 246, 320, 70, font(56, 70, CREAM, 800), "1284 个")
c += box(864, 320, 330, 48, font(15, 24, MUTED), "2025 年底深圳实有起降点，提前超过 1200 个的目标")
c += card(840, 404, 376, 200)
c += box(864, 424, 320, 22, font(13, 22, MUTED, 700, "letter-spacing: 2px"), "对我们意味着")
c += box(864, 454, 330, 130, font(17, 28, CREAM), "医疗和社区的点位是规划里写死的，不用自己说服城市修。")
c += source("来源：《深圳市低空基础设施高质量建设方案（2024—2026年）》（深圳发改委），深圳政府在线（2026-02-27）。均为规划目标，1284 为实有数")
pages.append(("5 起降点漏斗", c))

# 6 landscape
c = head(6, "竞争", "先行者证明了能飞、能拿证，还没证明能赚钱")
cols = [("先行者", 64, 160), ("主场景", 230, 180), ("公开规模", 420, 300), ("网络", 730, 250), ("单均成本绝对额", 1000, 216)]
for lab, x, w in cols:
    c += box(x + 8, 192, w, 20, font(12, 20, ORANGE if lab.startswith("单均") else MUTED, 700), lab)
c += box(1000, 186, 216, 386, "background: rgba(229,106,44,0.08); border: 1px solid %s; box-sizing: border-box" % ORANGE)
c += box(64, 216, 936, 1, "background: " + LINE)
rows = [("utensils", "美团", "城市餐饮、医疗", "累计超过 100 万单", "70 条航线，6 城"), ("package", "顺丰丰翼", "快递、跨海、城际", "深圳日飞六七百架次", "深圳 383 条航线"), ("truck", "京东物流", "城乡末端、山区", "资中覆盖 78 个村", "资中首批 78 条"),
        ("hospital", "迅蚁", "医疗为主", "累计飞行 260 万千米", "55 城"), ("plane", "Zipline", "医疗加零售", "累计超过 250 万次", "约 70% 航班在美国"), ("store", "Wing", "零售", "超过 100 万次", "2027 年沃尔玛 270 多个点")]
s = ""
for i, (ic, nm, sc, sz, net) in enumerate(rows):
    y = 220 + i * 58
    c += box(64, y + 57, 936, 1, "background: " + DIM)
    s += icon(ic, 72, y + 18, 20, MUTED)
    c += box(102, y + 16, 130, 26, font(16, 26, CREAM, 700), nm)
    c += box(238, y + 16, 180, 26, font(14, 26, MUTED), sc)
    c += box(428, y + 16, 300, 26, font(15, 26, CREAM), sz)
    c += box(738, y + 16, 260, 26, font(14, 26, MUTED), net)
    s += icon("circle-help", 1020, y + 18, 20, ORANGE)
    c += box(1050, y + 16, 150, 26, font(15, 26, ORANGE, 700), "未公布")
c += svg(s)
c += box(64, 584, 1152, 50, font(16, 26, CREAM), "六家都没有公布单均成本的绝对额，美团只说每年降 40% 至 50%。谁先算清这笔账，谁就有话语权。")
c += source("来源：美团、顺丰、京东、迅蚁、Zipline、Wing 公告及媒体报道（2025-07 至 2026-07），均为企业口径", y=650)
pages.append(("6 竞争格局", c))

# 7 chapter 2
pages.append(("7 第二幕", chapter(7, "chapter-rooftop", "02", "从哪里切进去，18 个月证明什么",
                                    [("target", "楔子：医疗加社区，先园区和城郊"), ("flask-conical", "三个待验证的假设"), ("shield-check", "五道合规关口和六条风险"), ("flag", "18 个月里程碑和本轮请求")])))

# 8 wedge
c = head(8, "切入", "切入点从规则和规划推出来：先医疗和社区，先园区和城郊")
eq = [("route", "放行顺序", "载货先行", "先隔离、先远郊（发改委）"), ("map-pin", "城市规划", "413 个", "深圳社区起降点，其中医疗 148 个"), ("hospital", "已验证需求", "460 万管", "迅蚁累计医疗标本（企业口径）")]
s = ""
for i, (ic, lab, big, sub) in enumerate(eq):
    x = 64 + i * 300
    c += card(x, 200, 256, 220)
    s += icon(ic, x + 22, 222, 22, MUTED)
    c += box(x + 54, 220, 190, 24, font(14, 24, MUTED, 700), lab)
    c += box(x + 22, 262, 230, 60, font(42, 60, CREAM, 800, "white-space: nowrap"), big)
    c += box(x + 22, 336, 216, 60, font(14, 22, MUTED), sub)
    s += t(x + 278, 320, "+" if i < 2 else "=", 34, MUTED, "middle", 700)
c += svg(s)
c += box(964, 200, 252, 220, "background: %s; border-radius: 4px; box-sizing: border-box; padding: 22px" % ORANGE)
c += box(986, 220, 210, 24, font(14, 24, INKD, 700), "我们的楔子")
c += box(986, 252, 210, 100, font(34, 46, INKD, 800), "医疗 + 社区")
c += box(986, 352, 210, 52, font(14, 22, INKD), "先做有起降点的园区和城郊")
c += box(64, 452, 1152, 120, "border: 1px dashed %s; border-radius: 4px; box-sizing: border-box; padding: 20px 24px 20px 72px" % LINE)
c += svg(icon("ban", 88, 482, 26, MUTED))
c += box(136, 470, 300, 24, font(14, 24, MUTED, 700, "letter-spacing: 2px"), "先不做")
c += box(136, 498, 1050, 60, font(22, 34, CREAM, 700, "text-decoration: line-through; text-decoration-color: " + MUTED), "核心城区的餐饮高峰单")
c += box(520, 470, 680, 24, font(14, 24, MUTED), "它排在放行顺序最后，也是美团的主场")
c += source("来源：国家发改委发布会（2025-12-31），《深圳市低空基础设施高质量建设方案》（深圳发改委），中华网（2025-11-26，企业口径）")
pages.append(("8 楔子", c))

# 9 medkit photo
c = photo("photo-medkit", 0, 0, 560, 720)
c += box(0, 690, 560, 24, font(11, 24, CREAM, 400, "padding-left: 16px; background: rgba(36,27,20,0.6)"), "示意图，AI 生成")
c += rail("切入")
c += box(624, 80, 592, 140, "display: flex; flex-direction: column; justify-content: flex-end; " + font(34, 46, CREAM, 700), "<div>医疗单够轻、够急，先行者已经送过 460 万管标本</div>")
c += box(624, 256, 592, 1, "background: " + LINE)
c += box(624, 280, 592, 130, font(120, 130, ORANGE, 800, "white-space: nowrap"), "460 万")
c += box(624, 410, 592, 26, font(16, 26, MUTED), "迅蚁累计运送医疗标本（管），截至 2025-11，企业口径")
c += box(624, 470, 280, 70, font(52, 66, CREAM, 800), "81 万")
c += box(624, 540, 280, 44, font(14, 22, MUTED), "美团累计配送检验样本和药品（份），截至 2026-06")
c += box(936, 470, 280, 70, font(52, 66, CREAM, 800), "2.5 kg")
c += box(936, 540, 280, 44, font(14, 22, MUTED), "美团第四代机最大载重，标本箱够用")
c += box(624, 650, 592, 30, font(12, 16, MUTED), "来源：中华网（2025-11-26），IT 之家（2026-07-22、2023-07-05），均为企业口径")
c += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right"), "09")
pages.append(("9 医疗单", c))

# 10 hypotheses
c = head(10, "证明", "要证明三个假设：成本、密度、安全")
hy = [("coins", "单均成本低于骑手", "参照：美团 2022 年每笔配送相关成本约 4.54 元（计算）", (16, 18)),
      ("trending-up", "单个起降点日单量能爬坡", "参照：美团单站日单量从约 10 单升到最高 400 单（企业口径）", (10, 15)),
      ("shield-check", "取证后能安全、稳定地复飞", "参照：深圳 2025 年无人机载货运输超过百万架次", (7, 9))]
s = ""
gx0, gx1 = 760, 1192
for i, (ic, ti, ref, (m0, m1)) in enumerate(hy):
    y = 196 + i * 140
    c += card(64, y, 1152, 124, "border-left: 4px solid %s" % (ORANGE if i == 0 else LINE))
    c += box(88, y + 18, 60, 60, font(48, 60, ORANGE if i == 0 else "#6B5648", 800), "%d" % (i + 1))
    s += icon(ic, 148, y + 24, 24, MUTED)
    c += box(184, y + 20, 540, 32, font(22, 32, CREAM, 700), ti)
    c += box(150, y + 64, 580, 44, font(14, 22, MUTED), ref)
    s += rect(gx0, y + 56, gx1 - gx0, 10, DIM, 'rx="5"')
    s += rect(gx0 + (m0 - 1) / 18 * (gx1 - gx0), y + 56, (m1 - m0 + 1) / 18 * (gx1 - gx0), 10, ORANGE if i == 0 else SAND, 'rx="5"')
    s += t(gx0, y + 44, "第 1 个月", 11, MUTED) + t(gx1, y + 44, "第 18 个月", 11, MUTED, "end")
    s += t(gx0 + m1 / 18 * (gx1 - gx0), y + 90, "第 %d 至 %d 个月验证" % (m0, m1), 13, CREAM, "end", 700)
c += svg(s)
c += source("来源：美团 2022 年业绩公告（计算），第一财经环球（2026-05-22，企业口径），深圳政府在线（2026-02-27）")
pages.append(("10 三个假设", c))

# 11 cost columns
c = head(11, "证明", "成本口径不同不可比：骑手有数，无人机只有降幅")
c += box(64, 196, 540, 22, font(14, 22, MUTED, 700, "letter-spacing: 2px"), "骑手侧 · 有绝对额")
c += box(676, 196, 540, 22, font(14, 22, MUTED, 700, "letter-spacing: 2px"), "无人机侧 · 只有降幅和海外估算")
c += svg(line(640, 232, 640, 502, LINE, 1, 'stroke-dasharray="6 5"'))
c += box(600, 196, 80, 22, font(13, 22, MUTED, 700, "text-align: center"), "不可比")
cc = [(64, "4.54", "元/笔", "美团 2022 年配送相关成本 ÷ 即时配送笔数（计算）"), (340, "6.9", "元/单", "安信国际估算，只算 1P 外卖单，分母更小"),
      (676, "40–50%", "/年", "美团无人机单均运营成本年降幅，没有绝对额"), (952, "5–7", "美元/单", "巴克莱：欧美高人工地区的自动配送")]
for x, v, u, n in cc:
    c += card(x, 232, 264, 270)
    c += box(x + 22, 260, 230, 66, "white-space: nowrap; " + font(46, 66, CREAM, 800), v + '<span style="font-size: 16px; color: %s; font-weight: 400"> %s</span>' % (MUTED, u))
    c += box(x + 22, 346, 220, 110, font(14, 22, MUTED), n)
c += box(64, 540, 1152, 76, "background: %s; border-radius: 4px; box-sizing: border-box; padding: 0 28px 0 70px; display: flex; align-items: center; " % ORANGE + font(22, 32, INKD, 800), "要证明：同一口径下，医疗航线的单均成本低于 4.54 元")
c += svg(icon("target", 90, 564, 28, INKD))
c += source("来源：美团 2022 年业绩公告（计算），安信国际（2023-10-13），第一财经环球（2026-05-22），巴克莱（2026-04）", y=640)
pages.append(("11 成本分栏", c))

# 12 compliance gates
c = head(12, "证明", "合规是门槛：开飞前要过五道关，评估规则还在换版")
gates = [("fingerprint-pattern", "实名登记", "两项强制国标 2026-05-01 实施"), ("id-card", "操控员执照", "小型机操控员必须持照"), ("umbrella", "责任保险", "经营性飞行必须投保"), ("file-check", "特定类评估", "SORA 2.5 版指南仍在征求意见"), ("badge-check", "运营合格证", "CCAR-92，有效期 24 个月")]
s = ""; bx = ""
for i, (ic, ti, d) in enumerate(gates):
    x = 64 + i * 232; last = i == 4
    s += rect(x, 200, 212, 220, ORANGE if last else SURF, 'rx="4"')
    s += rect(x, 200, 212, 8, ORANGE if last else LINE)
    s += t(x + 20, 244, "第 %d 关" % (i + 1), 13, INKD if last else MUTED, "start", 700)
    s += icon(ic, x + 168, 226, 24, INKD if last else MUTED)
    bx += box(x + 20, 262, 180, 34, font(22, 34, INKD if last else CREAM, 800), ti)
    bx += box(x + 20, 308, 176, 80, font(14, 22, INKD if last else MUTED), d)
    if i < 4:
        s += icon("lock", x + 214, 302, 14, MUTED)
c += svg(s) + bx
c += card(64, 448, 560, 150)
c += box(88, 468, 520, 22, font(13, 22, MUTED, 700, "letter-spacing: 2px"), "没过关的代价")
c += box(88, 496, 520, 60, font(46, 60, CREAM, 800, "white-space: nowrap"), "5 万至 50 万元")
c += box(88, 558, 520, 24, font(14, 24, MUTED), "无运营合格证飞行的罚款（条例第四十九条）")
c += card(656, 448, 560, 150)
c += box(680, 468, 520, 22, font(13, 22, MUTED, 700, "letter-spacing: 2px"), "120 米以下也不等于随便飞")
c += box(680, 496, 520, 60, font(46, 60, CREAM, 800), "120 米")
c += box(680, 558, 520, 24, font(14, 24, MUTED), "机场、重要设施上空另划为管制空域（条例第十九条）")
c += source("来源：《无人驾驶航空器飞行管理暂行条例》，CCAR-92，民航局征求意见通知（2026-04-15），新华网（2025-12-10）")
pages.append(("12 合规五关", c))

# 13 risk register
c = head(13, "风险", "每条风险都有真实先例，我们先写应对再上天")
cols = [("风险", 64, 220), ("已发生的先例", 300, 470), ("我们的应对", 790, 340), ("何时", 1140, 76)]
for lab, x, w in cols:
    c += box(x + 8, 192, w, 20, font(12, 20, MUTED, 700), lab)
c += box(64, 216, 1152, 2, "background: " + CREAM)
rk = [("construction", "撞上障碍物", "Amazon 两架 MK30 撞吊车起火（2025-10，NTSB）", "航线逐段勘测，施工吊车每日更新", "1–6 月", True),
      ("triangle-alert", "迫降", "丰翼方舟 80 在深圳开伞迫降（2026-02）", "航线避开人群上空，机上带伞", "1–6 月", False),
      ("zap", "电力设施", "Wing 落上电线，约 2000 户停电（2022-09）", "起降点和航线避开架空线", "7–9 月", False),
      ("volume-2", "噪音与社区", "Wing 堪培拉试点引发噪音审查（2019）", "先园区和城郊，进社区前先公示", "10–15 月", False),
      ("umbrella", "保险", "强制投保最低保额 2027 年前后才出台", "开飞前足额投保第三者责任险", "1–6 月", False),
      ("coins", "后续融资", "低空大额融资里运营服务只占 2.2%（2026 上半年，全球口径）", "按里程碑分段用钱，每段单独验收", "全程", False)]
s = ""
for i, (ic, r, prec, resp, when, em) in enumerate(rk):
    y = 218 + i * 66
    if em:
        c += box(64, y, 1152, 66, "background: rgba(229,106,44,0.10)")
    c += box(64, y + 65, 1152, 1, "background: " + DIM)
    s += icon(ic, 76, y + 22, 20, ORANGE if em else MUTED)
    c += box(106, y + 20, 190, 26, font(16, 26, CREAM, 700), r)
    c += box(308, y + 10, 460, 48, font(14, 22, CREAM), prec)
    c += box(798, y + 10, 330, 48, font(14, 22, MUTED), resp)
    c += box(1148, y + 20, 70, 26, font(13, 26, CREAM, 700), when)
c += svg(s)
c += source("来源：NTSB（2025-10），DoNews（2026-02-12），ABC（2022-09-30），Region（2019-06-19），国家发改委（2026-02），IT 桔子（2026-07）", y=630)
pages.append(("13 风险登记", c))

# 14 milestones
c = head(14, "计划", "18 个月：先拿证，再开医疗航线，最后对表成本")
x0, x1 = 64, 1216
def mx(m): return x0 + m / 18 * (x1 - x0)
ph = [(0, 6, "取得运营合格证", "file-check", ["运营合格证、操控员执照", "第三者责任险足额投保", "完成特定类风险评估"]),
      (6, 9, "首条医疗航线", "hospital", ["园区或城郊医疗点对点", "验证假设 3：安全稳定复飞"]),
      (9, 15, "接入社区起降点", "map-pin", ["从医疗点扩到社区起降点", "验证假设 2：单站日单量爬坡"]),
      (15, 18, "成本对表", "coins", ["同口径对比 4.54 元", "带三组数据开下一轮"])]
s = ""
for m in range(0, 19, 3):
    s += line(mx(m), 214, mx(m), 228, MUTED, 1) + t(mx(m), 206, "第 %d 月" % m if m else "起点", 12, MUTED, "middle")
s += rect(x0, 228, x1 - x0, 6, DIM, 'rx="3"')
for i, (a, b, ti, ic, items) in enumerate(ph):
    s += rect(mx(a) + 2, 228, mx(b) - mx(a) - 4, 6, SAND if i else CREAM, 'rx="3"')
s += '<polygon points="%.1f,218 %.1f,231 %.1f,244 %.1f,231" fill="%s"/>' % (mx(6), mx(6) + 13, mx(6), mx(6) - 13, ORANGE)
c += svg(s)
c += box(int(mx(6)) - 120, 252, 240, 24, font(13, 24, ORANGE, 800, "text-align: center"), "闸门：第 6 个月")
s = ""
for i, (a, b, ti, ic, items) in enumerate(ph):
    x = 64 + i * 292
    c += card(x, 296, 272, 250, "border-top: 3px solid %s" % (CREAM if i == 0 else LINE))
    s += icon(ic, x + 20, 316, 22, MUTED)
    c += box(x + 52, 314, 210, 24, font(13, 24, MUTED, 700), "第 %d 至 %d 个月" % (a + 1, b))
    c += box(x + 20, 350, 236, 32, font(20, 32, CREAM, 800), ti)
    for j, it in enumerate(items):
        c += box(x + 20, 396 + j * 44, 236, 40, font(14, 20, CREAM), "· " + it)
c += svg(s)
c += box(64, 566, 1152, 60, "border: 1.5px solid %s; border-radius: 4px; box-sizing: border-box; padding: 0 24px 0 64px; display: flex; align-items: center; " % ORANGE + font(18, 28, CREAM, 700), "闸门：第 6 个月拿不到运营合格证，就暂停航线投入，先补取证")
c += svg(icon("flag", 86, 584, 22, ORANGE))
c += source("以上为计划，时间从本轮资金到位起算", y=648)
pages.append(("14 里程碑", c))

# 15 ask
c = head(15, "请求", "本轮请求：支撑 18 个月里程碑，六成用在取证和航线")
c += box(64, 196, 520, 22, font(14, 22, MUTED, 700, "letter-spacing: 2px"), "本轮请求")
c += box(64, 228, 520, 150, font(64, 76, CREAM, 800), "支撑 18 个月<br>三道验证")
c += box(64, 396, 500, 60, font(16, 26, MUTED), "从取证到第一组同口径成本数据。金额按里程碑和尽调确定。")
uses = [("取证与安全体系", 30, ORANGE), ("航线与起降点", 30, CREAM), ("机队与运维", 25, SAND), ("团队与运营", 15, DIM)]
s = ""
x = 640.0; W = 576
for nm, v, col in uses:
    w = W * v / 100
    s += rect(x, 220, w - 4, 70, col)
    s += t(x + 12, 262, "%d%%" % v, 24, INKD if col in (ORANGE, CREAM, SAND) else CREAM, "start", 800)
    x += w
c += svg(s)
for i, (nm, v, col) in enumerate(uses):
    y = 314 + i * 40
    c += box(640, y + 6, 14, 14, "background: %s; border-radius: 2px" % col)
    c += box(664, y, 380, 26, font(16, 26, CREAM, 700 if i == 0 else 400), nm)
    c += box(1100, y, 116, 26, font(16, 26, CREAM, 700, "text-align: right"), "%d%%" % v)
c += box(640, 486, 576, 1, "background: " + LINE)
c += box(640, 498, 576, 22, font(13, 22, MUTED), "图中比例为拟定用途占比")
c += card(64, 540, 1152, 76)
c += svg(icon("hand-coins", 88, 566, 24, MUTED))
c += box(126, 556, 1060, 44, font(16, 22, CREAM, 400, "display: flex; align-items: center; height: 44px"), "参照：城市物流运营公司的公开单笔融资在数千万元量级（迅蚁 C+ 轮，2025-11）")
c += source("来源：中华网（2025-11-26）。用途占比为本公司拟定，不是测算", y=640)
pages.append(("15 请求", c))

# 16 ending
c = wedge(88)
c += box(64, 200, 1100, 160, "display: flex; flex-direction: column; justify-content: flex-end; " + font(64, 80, CREAM, 800), "<div>一起把第一条医疗航线飞起来</div>")
c += box(64, 392, 900, 32, font(20, 32, MUTED), "18 个月，三道验证：先拿证，再开医疗航线，最后对表成本")
recap = [("file-check", "第 6 个月", "运营合格证"), ("hospital", "第 9 个月", "首条医疗航线"), ("coins", "第 18 个月", "同口径成本数据")]
s = ""
for i, (ic, m, d) in enumerate(recap):
    x = 64 + i * 260
    s += icon(ic, x, 470, 22, MUTED)
    c += box(x + 34, 466, 220, 24, font(14, 24, MUTED, 700), m)
    c += box(x + 34, 494, 220, 30, font(19, 30, CREAM, 700), d)
c += svg(s)
c += box(64, 580, 220, 56, "background: %s; border-radius: 4px; text-align: center; " % ORANGE + font(20, 56, INKD, 800), "约个时间聊")
c += box(1116, 686, 100, 18, font(12, 18, MUTED, 400, "text-align: right"), "16")
pages.append(("16 结尾", c))

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
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, CREAM, SANS, loc))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "ember 低空配送路演样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
