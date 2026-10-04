import json, os, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

RED = "#B02318"; GOLD = "#C79A3B"; BG = "#F6EFE3"; SURF = "#FCF8EF"; INK = "#33231C"; MUTED = "#6E5B4B"; LINE = "#E0D2B8"
WARM = "#A89480"; WARM2 = "#CDBBA5"; TINT = "#F3E0D8"; GREEN = "#4C6B3C"; TRACK = "#EADFCB"
FONT = "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif"
PHOTO = "/_blob/a83e6a99780416c85795e7706bd50077"
CUR = ["/_blob/" + i for i in ['f0431c50e8a3d3ebaf2712b212bc8dd7', 'bd5f83f46f4b823e817e7b70396c9150', 'f17d06bc89e061300c2a70c3d25e49fe', '860607d2855cc372fee76aa1763c94c0', '1e959928af4ed55242461f6c4a25d5a5', 'd69f723543ae03baf155e934c5fd1fb6', 'f01c126142b7027dadd14e39328379a3', 'c328c7762e2428dd8e592a98db3b3d6c', '79a9f54a5ffb79ab117af003c3a8ec7e', 'cbdba3da66b74e10afea52f34abea900', '1ef8c0752cc3f1bc865eb1c9664aa7af', '9da03d092c9e0ab437981ed9a1ba2fdd', '09748ccb79ee5186efafba7ae5f4ca66', 'a804cfebe051cc8dd2476861215e4679', 'b498c6169578609bfbea44dbf05d4897']]
NUM = "一二三四五六七八九十"


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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + INK + "; font-family: " + FONT + """">
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


def goldlines(y=26):
    return box(64, y, 1152, 2, "background: " + GOLD) + box(64, y + 6, 1152, 1, "background: " + GOLD)


def head(title):
    out = goldlines()
    out += box(80, 50, 1120, 90, "display: flex; flex-direction: column; justify-content: flex-end; text-align: center; " + font(34, 44, RED, 700), "<div style=\"text-wrap: balance\">" + title + "</div>")
    out += box(608, 154, 64, 2, "background: " + GOLD)
    return out


def source(t, y=660):
    return box(80, y, 1120, 36, font(14, 20, MUTED), t)


def svg(body, defs=""):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="' + FONT.replace("'", "") + '"><defs>' + defs + '</defs>' + body + '</svg>\n'


def t(x, y, s, size=15, fill=MUTED, anchor="start", weight=400):
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def numeral(x, y, n, fill=RED, ink="#FFFFFF", size=40):
    return box(x, y, size, size, "background: " + fill + "; display: flex; align-items: center; justify-content: center; " + font(int(size * 0.5), size, ink, 700), NUM[n])


def pill(x, y, text, color, filled=False, w=None):
    w = w or (len(text) * 15 + 24)
    st = ("background: " + color + "; color: #FFFFFF; " if filled else "border: 1px solid " + color + "; color: " + color + "; ") + "box-sizing: border-box; text-align: center; border-radius: 13px; " + font(14, 24, color if not filled else "#FFFFFF", 700)
    return box(x, y, w, 26, st, text)


def rail(x, y0, items, w=340, step=150):
    out = box(x - 32, y0, 1, step * len(items) - 30, "background: " + LINE)
    for i, (lab, val, sub, em) in enumerate(items):
        y = y0 + i * step
        if i:
            out += box(x, y - 18, w, 1, "background: " + LINE)
        out += box(x, y, w, 22, font(15, 22, MUTED), lab)
        out += box(x, y + 26, w, 54, font(44, 54, RED if em else INK, 700, "white-space: nowrap"), val)
        if sub:
            out += box(x, y + 84, w, 44, font(15, 22, INK), sub)
    return out


pages = []

# 1 cover: letterhead
c = box(80, 92, 1120, 64, "text-align: center; " + font(52, 64, RED, 700, "letter-spacing: 12px"), "战略部")
c += box(80, 184, 1120, 4, "background: " + RED) + box(80, 194, 1120, 1, "background: " + RED)
c += box(80, 250, 1120, 150, "display: flex; flex-direction: column; justify-content: flex-end; text-align: center; " + font(56, 72, INK, 700), "<div style=\"text-wrap: balance\">2026 年政府工作报告和「十五五」规划纲要要点</div>")
c += box(80, 428, 1120, 30, "text-align: center; " + font(22, 30, MUTED), "学习汇报：要点解读和对我们的启示")
c += box(80, 590, 1120, 26, "text-align: center; " + font(18, 26, MUTED), "2026 年 10 月")
c += goldlines(668)
pages.append(("1 封面", c))

# 2 summary rows
c = head("要点：增长目标改成区间，钱往内需走，约束从能耗转向碳")
rows = [("目标：去年基本完成，今年改成区间", "2025 年只有 CPI 没达标。2026 年增长目标「4.5%—5%」，扩内需排十项任务第一。"),
        ("「十五五」：不设速度目标，约束转向碳", "不设五年 GDP 数值目标，碳强度五年累计降 17%，新增护理型床位等民生指标。"),
        ("今年以来：增长在区间内，投资偏弱", "上半年 GDP 增长 4.7%，1–8 月固定资产投资 −7.2%，PPI 由负转正到 +2.0%。"),
        ("对我们：跟着政策的钱和约束走", "盯服务消费和设备更新政策，提前算碳账，稳住出口。")]
y = 184
for i, (ti, tx) in enumerate(rows):
    em = i == 3
    if em:
        c += box(80, y + 6, 1120, 98, "background: " + RED)
    elif i:
        c += box(80, y, 1120, 1, "background: " + LINE)
    c += numeral(104, y + 30, i, "#FFFFFF" if em else RED, RED if em else "#FFFFFF", 44)
    c += box(172, y + 22, 440, 32, font(22, 32, "#FFFFFF" if em else INK, 700), ti)
    c += box(172, y + 58, 1000, 28, font(18, 28, "#FBEDE6" if em else MUTED), tx)
    y += 112
pages.append(("2 要点", c))

# 3 scorecard
c = head("2025 年主要目标都完成了，只有物价明显低于目标")
cols = [("指标", 80, 240, "left"), ("2025 年目标", 320, 220, "left"), ("2025 年实际", 540, 220, "left"), ("差距", 760, 240, "left"), ("判断", 1060, 140, "right")]
for lab, x, w, al in cols:
    c += box(x + (20 if lab == "指标" else 0), 186, w - 20, 24, font(15, 24, MUTED, 400, "text-align: " + al), lab)
c += box(80, 214, 1120, 2, "background: " + RED)
sc = [("经济增长", "5% 左右", "5.0%", "持平", True), ("城镇新增就业", "1200 万人以上", "1267 万人", "+67 万人", True), ("城镇调查失业率", "5.5% 左右", "平均 5.2%", "低 0.3 个百分点", True),
      ("居民消费价格", "涨幅 2% 左右", "与上年持平", "低约 2 个百分点", False), ("单位 GDP 能耗", "降低 3% 左右", "降低 5.1%", "超 2.1 个百分点", True)]
y = 216
for a, b, d, e, ok in sc:
    if not ok:
        c += box(80, y, 1120, 64, "background: " + TINT)
    c += box(80, y + 64, 1120, 1, "background: " + LINE)
    c += box(100, y + 18, 220, 28, font(19, 28, RED if not ok else INK, 700), a)
    c += box(320, y + 18, 220, 28, font(18, 28, MUTED), b)
    c += box(540, y + 14, 220, 34, font(24, 34, RED if not ok else INK, 700, "white-space: nowrap"), d)
    c += box(760, y + 18, 280, 28, font(18, 28, RED if not ok else MUTED), e)
    c += pill(1200 - 80, y + 19, "完成" if ok else "未完成", GREEN if ok else RED, not ok, 80)
    y += 65
c += box(80, 560, 1120, 28, font(17, 28, MUTED), "粮食产量 1.43 万亿斤、居民收入实际增长 5.0%，也都完成")
c += source("来源：2025 年、2026 年政府工作报告，国家统计局 2025 年统计公报（2026 年 2 月 28 日）")
pages.append(("3 目标打分表", c))

# 4 comparison 2025 vs 2026
c = head("2026 年增长目标改成区间，绿色指标由能耗换成碳")
c += box(80, 186, 200, 24, font(15, 24, MUTED), "") + box(300, 186, 340, 24, font(15, 24, MUTED), "2025 年目标") + box(660, 186, 400, 24, font(15, 24, RED, 700), "2026 年目标") + box(1080, 186, 120, 24, font(15, 24, MUTED, 400, "text-align: right"), "变化")
c += box(80, 214, 1120, 2, "background: " + RED)
cp = [("经济增长", "5% 左右", "「4.5%—5%，在实际工作中努力争取更好结果」", "改为区间", RED, True), ("就业", "新增 1200 万人以上，失业率 5.5% 左右", "不变", "不变", MUTED, False),
      ("居民消费价格", "涨幅 2% 左右", "不变，「推动价格总水平由负转正」", "不变", MUTED, False), ("粮食产量", "1.4 万亿斤左右", "不变", "不变", MUTED, False),
      ("绿色指标", "单位 GDP 能耗降低 3% 左右", "单位 GDP 二氧化碳排放降低 3.8% 左右", "换指标", GOLD, False)]
y = 216
for a, b, d, tag, tc, em in cp:
    hh = 76
    if em:
        c += box(80, y, 1120, hh, "background: " + TINT)
    c += box(80, y + hh, 1120, 1, "background: " + LINE)
    c += box(100, y + 24, 200, 28, font(19, 28, INK, 700), a)
    c += box(300, y + 14, 340, 50, font(17, 25, MUTED, 400, "display: flex; align-items: center; height: 50px"), b)
    c += box(660, y + 14, 400, 50, font(18, 25, RED if em else INK, 700 if em else 400, "display: flex; align-items: center; height: 50px"), d)
    c += pill(1200 - (len(tag) * 15 + 24), y + 25, tag, tc, em)
    y += hh + 1
c += source("来源：2025 年政府工作报告（2025 年 3 月），2026 年政府工作报告（2026 年 3 月）。两年的绿色指标口径不同，不能直接比较")
pages.append(("4 目标对比", c))

# 5 fiscal bars + rail
c = head("财政力度略增：赤字多 2300 亿元，注资国债少 2000 亿元")
base, H, vmax = 598, 330, 6.5
s = rect(80, 192, 14, 14, WARM) + t(100, 204, "2025 年", 15, MUTED) + rect(176, 192, 14, 14, RED) + t(196, 204, "2026 年", 15, RED, "start", 700) + t(780, 204, "万亿元", 15, MUTED, "end")
s += '<line x1="80" y1="%d" x2="780" y2="%d" stroke="%s"/>' % (base, base, WARM)
fg = [("赤字", 5.66, 5.89), ("地方专项债", 4.4, 4.4), ("超长期特别国债", 1.3, 1.3), ("银行注资特别国债", 0.5, 0.3)]
slot = 700 / 4; bw = 66
for i, (lab, a, b) in enumerate(fg):
    cx = 80 + slot * (i + 0.5)
    for j, (v, col) in enumerate([(a, WARM), (b, RED)]):
        x = cx - bw - 3 + j * (bw + 6); h = v / vmax * H
        s += rect(x, base - h, bw, h, col) + t(x + bw / 2, base - h - 10, "%g" % v, 18, RED if j else MUTED, "middle", 700 if j else 400)
    s += t(cx, base + 28, lab, 16, INK, "middle")
c += svg(s)
c += rail(860, 190, [("赤字比上年增加", "2300 亿元", "赤字 5.89 万亿元，赤字率 4% 左右", True), ("一般公共预算支出", "30 万亿元", "首次达到", False),
                     ("新增政府债务合计", "11.89 万亿元", "上年 11.86 万亿元", False)], step=148)
c += source("来源：2025 年、2026 年政府工作报告，财政部 2026 年预算报告（2026 年 3 月）")
pages.append(("5 财政工具", c))

# 6 ten tasks
c = head("十项任务以「着力建设强大国内市场」开头，新动能和科技紧随其后")
tasks = ["着力建设强大国内市场", "加紧培育壮大新动能", "加快高水平科技自立自强", "持续深化重点领域改革", "进一步扩大高水平对外开放",
         "扎实推进乡村全面振兴", "推动新型城镇化和区域协调发展", "更大力度保障和改善民生", "加快推动全面绿色转型", "加强重点领域风险防范化解和安全能力建设"]
for i, tk in enumerate(tasks):
    col, row = i // 5, i % 5
    x = 80 + col * 572; y = 186 + row * 70
    em = i == 0
    if em:
        c += box(x, y, 548, 60, "background: " + RED)
    else:
        c += box(x, y, 548, 60, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
    c += numeral(x + 12, y + 10, i, "#FFFFFF" if em else RED, RED if em else "#FFFFFF", 40)
    c += box(x + 66, y + 15, 470, 30, font(19, 30, "#FFFFFF" if em else INK, 700 if em or i < 3 else 400, "white-space: nowrap"), tk)
c += box(80, 548, 1120, 64, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
c += box(104, 566, 1080, 28, font(18, 28, INK), "顺序变化：民生由 2025 年的第十位移到第八位，风险防范由第六位移到第十位")
c += source("来源：2026 年政府工作报告（2026 年 3 月 5 日），2025 年政府工作报告")
pages.append(("6 十项任务", c))

# 7 plan: GDP statement + from-to table
c = head("「十五五」不设 GDP 数值目标，2030 年目标看结构、绿色和民生")
c += box(80, 186, 340, 420, "background: " + RED)
c += box(108, 214, 290, 22, font(15, 22, "#F3D9CF"), "经济增长")
c += box(108, 246, 290, 120, font(34, 46, "#FFFFFF", 700), "不设五年<br>数值目标")
c += box(108, 380, 290, 100, font(18, 28, "#FBEDE6"), "「保持在合理区间、各年度视情提出」")
c += box(108, 520, 290, 60, font(15, 22, "#F3D9CF"), "20 项主要指标中，12 项预期性，8 项约束性")
c += box(460, 186, 360, 24, font(15, 24, MUTED), "指标") + box(820, 186, 110, 24, font(15, 24, MUTED, 400, "text-align: right"), "2025 年") + box(960, 186, 110, 24, font(15, 24, RED, 700, "text-align: right"), "2030 年") + box(1090, 186, 110, 24, font(15, 24, MUTED, 400, "text-align: right"), "")
c += box(460, 214, 740, 2, "background: " + RED)
ft = [("常住人口城镇化率", "67.9%", "71%", "", False), ("数字经济核心产业占 GDP 比重", "10.5%", "12.5%", "", False), ("非化石能源占能源消费比重", "21.7%", "25%", "新入表", True),
      ("养老机构护理型床位占比", "68%", "73%", "新增", False), ("每万人口高价值发明专利", "16 件", "＞22 件", "", False), ("人均预期寿命", "79.25 岁", "80 岁", "", False)]
y = 216
for a, b, d, tag, em in ft:
    if em:
        c += box(460, y, 740, 64, "background: " + TINT)
    c += box(460, y + 64, 740, 1, "background: " + LINE)
    c += box(476, y + 18, 340, 28, font(18, 28, RED if em else INK, 700 if em else 400), a)
    c += box(820, y + 18, 110, 28, font(19, 28, MUTED, 400, "text-align: right"), b)
    c += box(930, y + 16, 30, 28, font(18, 28, GOLD, 700, "text-align: center"), "→")
    c += box(960, y + 14, 110, 34, font(24, 34, RED if em else INK, 700, "text-align: right; white-space: nowrap"), d)
    if tag:
        c += pill(1200 - (len(tag) * 15 + 24), y + 19, tag, GOLD if not em else RED, em)
    y += 65
c += source("来源：「十五五」规划纲要专栏 1（2026 年 3 月）。数字经济占比的基数为 2024 年数据")
pages.append(("7 十五五指标", c))

# 8 carbon fact
c = head("绿色约束的主角从能耗换成碳：五年碳强度累计降 17%")
c += box(80, 196, 640, 24, font(17, 24, MUTED), "「十五五」单位 GDP 二氧化碳排放，五年累计降低")
c += box(72, 226, 640, 250, font(240, 250, RED, 700, "letter-spacing: -8px; white-space: nowrap"), "17%")
c += pill(80, 494, "约束性指标", RED, True, 120)
c += box(80, 540, 640, 60, font(18, 28, INK), "「十四五」同一指标为累计降低 18%。2025 年的年度目标是能耗，2026 年起换成碳。")
c += box(760, 196, 1, 410, "background: " + LINE)
cf = [("2026 年碳排放强度降低目标", "3.8% 左右", "替代 2025 年的「单位 GDP 能耗降低 3% 左右」", False), ("2030 年非化石能源占比", "25%", "2025 年为 21.7%，新入主要指标表", False),
      ("能耗强度", "移出主表", "正文仍写「单位GDP能耗下降10%左右」", False)]
for i, (lab, val, sub, em) in enumerate(cf):
    y = 196 + i * 142
    if i:
        c += box(800, y - 18, 400, 1, "background: " + LINE)
    c += box(800, y, 400, 22, font(15, 22, MUTED), lab)
    c += box(800, y + 26, 400, 48, font(38, 48, INK, 700, "white-space: nowrap"), val)
    c += box(800, y + 80, 400, 44, font(15, 22, INK), sub)
c += source("来源：「十五五」规划纲要（2026 年 3 月），「十四五」规划纲要（2021 年 3 月），2025 年、2026 年政府工作报告")
pages.append(("8 碳强度大数字", c))

# 9 GDP line with target band
c = head("上半年增长 4.7%，在目标区间内，二季度放缓到 4.3%")
x0, x1, y0, y1, lo, hi = 120, 780, 220, 580, 4.0, 5.6
def yv(v): return y1 - (v - lo) / (hi - lo) * (y1 - y0)
s = rect(x0, yv(5.0), x1 - x0, yv(4.5) - yv(5.0), "#F1E3C6")
s += t(x0 + 12, yv(4.5) - 10, "2026 年目标区间 4.5%—5%", 15, "#8E6A18", "start", 700)
for v in (4.0, 4.5, 5.0, 5.5):
    s += '<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="%s" stroke-dasharray="%s"/>' % (x0, yv(v), x1, yv(v), LINE, "0" if v == 4.0 else "3 4") + t(x0 - 12, yv(v) + 5, "%g%%" % v, 14, MUTED, "end")
qs = [("2025Q1", 5.4), ("2025Q2", 5.2), ("2025Q3", 4.8), ("2025Q4", 4.5), ("2026Q1", 5.0), ("2026Q2", 4.3)]
step = (x1 - x0 - 60) / 5; pts = []
for i, (q, v) in enumerate(qs):
    px = x0 + 30 + i * step; pts.append((px, yv(v)))
    s += t(px, y1 + 28, q, 15, INK, "middle")
s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="3"/>' % (" ".join("%.1f,%.1f" % p for p in pts), RED)
for i, (px, py) in enumerate(pts):
    last = i == 5
    s += '<circle cx="%.1f" cy="%.1f" r="%d" fill="%s" stroke="%s" stroke-width="2"/>' % (px, py, 7 if last else 5, RED if last else BG, RED)
    s += t(px, py - 14, "%g" % qs[i][1], 18 if last else 16, RED if last else INK, "middle", 700)
s += t(x0, 206, "GDP 单季同比", 15, MUTED)
c += svg(s)
c += rail(860, 196, [("上半年 GDP 增长", "4.7%", "一季度 5.0%，二季度 4.3%", True), ("前三季度数据发布", "10 月 19 日", "国家统计局发布日程", False)], step=180)
c += source("来源：国家统计局 2025 年统计公报，2026 年二季度和上半年 GDP 核算（7 月 16 日）")
pages.append(("9 季度 GDP", c))

# 10 indicators grouped bars
c = head("投资和商品消费走弱、价格回升：1–8 月固投 −7.2%，PPI +2.0%")
base0, k = 420, 22
s = rect(80, 192, 14, 14, WARM2) + t(100, 204, "一季度", 15, MUTED) + rect(170, 192, 14, 14, WARM) + t(190, 204, "上半年", 15, MUTED) + rect(260, 192, 14, 14, RED) + t(280, 204, "1–8 月", 15, RED, "start", 700) + t(1200, 204, "累计同比，%", 15, MUTED, "end")
s += '<line x1="80" y1="%d" x2="1200" y2="%d" stroke="%s"/>' % (base0, base0, WARM)
ind = [("社会消费品零售总额", 2.4, 1.3, 1.1), ("固定资产投资", 1.7, -5.7, -7.2), ("规模以上工业增加值", 6.1, 5.4, 5.3), ("CPI", 0.9, 1.0, 0.9), ("PPI", -0.6, 1.5, 2.0)]
slot = 1120 / 5; bw = 52
for i, (lab, a, b, d) in enumerate(ind):
    cx = 80 + slot * (i + 0.5); em = lab == "固定资产投资"
    for j, (v, col) in enumerate([(a, WARM2), (b, WARM), (d, RED)]):
        x = cx - 1.5 * bw - 6 + j * (bw + 6); h = abs(v) * k
        y = base0 - h if v >= 0 else base0
        s += rect(x, y, bw, max(h, 2), col)
        ly = y - 10 if v >= 0 else y + h + 22
        s += t(x + bw / 2, ly, ("%.1f" % v).replace("-", "−"), 17 if j == 2 else 15, RED if j == 2 else MUTED, "middle", 700 if j == 2 else 400)
    s += t(cx, 618, lab, 16, RED if em else INK, "middle", 700 if em else 400)
c += svg(s)
c += source("来源：国家统计局一季度（4 月 16 日）、上半年（7 月 15 日）、8 月份（9 月 15 日）国民经济运行情况")
pages.append(("10 月度指标", c))

# 11 policy lanes
c = head("年内加码的政策沿两条线走：促消费，产业和就业")
axis = 392; x0_, cw = 196, 168
ev = [("1 月 7 日", "人工智能+制造", "工信部等八部门专项行动", "b", False), ("1 月 20 日", "中小微企业贷款贴息", "年化 1.5 个百分点，最长 2 年", "b", False),
      ("1 月 29 日", "服务消费新增长点方案", "国务院办公厅印发", "a", False), ("7 月 13 日", "扩大消费「十五五」规划", "2030 年社零 60 万亿元左右", "a", False),
      ("8 月 21 日", "贴息加码", "消费贷上限 5000 元，企业贷上限 7500 万元", "a", True), ("9 月 28 日", "国务院常务会议", "增加科技创新和技术改造再贷款额度", "b", False)]
s = '<line x1="%d" y1="%d" x2="1200" y2="%d" stroke="%s" stroke-width="2"/>' % (x0_ - 8, axis, axis, INK)
c += box(80, 206, 110, 24, font(17, 24, RED, 700), "促消费") + box(80, 420, 110, 24, font(17, 24, RED, 700), "产业和就业")
for i, (d, ti, de, lane, em) in enumerate(ev):
    x = x0_ + i * cw; cx = x + 8
    if lane == "a":
        s += '<line x1="%d" y1="210" x2="%d" y2="%d" stroke="%s"/>' % (cx, cx, axis, RED if em else WARM); ty = 206
    else:
        s += '<line x1="%d" y1="%d" x2="%d" y2="560" stroke="%s"/>' % (cx, axis, cx, WARM); ty = 420
    s += '<circle cx="%d" cy="%d" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (cx, axis, RED if em else BG, RED if em else INK)
    c += box(x + 22, ty, cw - 16, 22, font(15, 22, RED if em else MUTED, 700 if em else 400), d)
    c += box(x + 22, ty + 26, cw - 18, 50, font(17, 25, RED if em else INK, 700), ti)
    c += box(x + 22, ty + 80, cw - 22, 66, font(15, 22, MUTED), de)
c += svg(s)
c += box(80, 584, 1120, 52, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
c += box(104, 596, 1080, 28, font(18, 28, INK), "最相关的是 8 月贴息加码：企业贴息贷款单户上限提到 7500 万元")
c += source("来源：中国政府网、工信部、财政部发布的政策文件和国务院常务会议通稿（2026 年 1–9 月）。日期为发布日期", y=656)
pages.append(("11 政策时间线", c))

# 12 funds rings
c = head("资金在加快到位：超长期国债已发九成，以旧换新资金全部下达")
import math
rings = [("超长期特别国债", 90.5, "11770 / 13000 亿元", "截至 9 月 16 日", False), ("新增专项债", 66.6, "29293 / 44000 亿元", "1–8 月", False),
         ("一般公共预算支出", 60.5, "181451 / 300100 亿元", "1–8 月", False), ("以旧换新资金", 100, "2500 / 2500 亿元", "截至 9 月 30 日全部下达", True)]
s = ""
for i, (lab, v, amt, when, em) in enumerate(rings):
    cx = 80 + 140 + i * 280; cy = 320; r = 92
    s += '<circle cx="%d" cy="%d" r="%d" fill="none" stroke="%s" stroke-width="16"/>' % (cx, cy, r, TRACK)
    ang = v / 100 * 2 * math.pi
    if v >= 100:
        s += '<circle cx="%d" cy="%d" r="%d" fill="none" stroke="%s" stroke-width="16"/>' % (cx, cy, r, RED if em else GOLD)
    else:
        ex = cx + r * math.sin(ang); ey = cy - r * math.cos(ang); large = 1 if ang > math.pi else 0
        s += '<path d="M %d %d A %d %d 0 %d 1 %.1f %.1f" fill="none" stroke="%s" stroke-width="16"/>' % (cx, cy - r, r, r, large, ex, ey, GOLD)
    s += t(cx, cy + 14, ("%g" % v) + "%", 40, RED if em else INK, "middle", 700)
    s += t(cx, cy + 140, lab, 19, RED if em else INK, "middle", 700) + t(cx, cy + 168, amt, 16, INK, "middle") + t(cx, cy + 192, when, 15, MUTED, "middle")
c += svg(s)
c += source("来源：财政部国债发行公告、地方债月报、1–8 月财政收支，新华社（9 月 30 日）。进度为已发行、已支出或已下达额占全年额度（计算）")
pages.append(("12 资金进度", c))

# 13 equipment photo + figures
c = '<img src="' + PHOTO + '" alt="智能制造车间里的一排机械臂（示意图，AI 生成）" style="position: absolute; left: 0; top: 0; width: 560px; height: 720px; object-fit: cover">'
c += box(600, 26, 616, 2, "background: " + GOLD) + box(600, 32, 616, 1, "background: " + GOLD)
c += box(616, 56, 600, 90, "display: flex; flex-direction: column; justify-content: flex-end; " + font(32, 44, RED, 700), "<div style=\"text-wrap: balance\">设备更新资金已下达，技改贷款还能贴息</div>")
c += box(616, 160, 64, 2, "background: " + GOLD)
eq = [("设备更新资金（超长期特别国债）", "2000 亿元", "已下达", True), ("中小微企业贷款年化贴息", "1.5 个百分点", "最长 2 年", False), ("单户贴息贷款上限", "7500 万元", "8 月 1 日起，原为 5000 万元", False)]
y = 196
for lab, val, sub, em in eq:
    c += box(616, y, 544, 22, font(15, 22, MUTED), lab)
    c += box(616, y + 28, 300, 52, font(42, 52, RED if em else INK, 700, "white-space: nowrap"), val)
    c += box(940, y + 44, 260, 26, font(16, 24, INK), sub)
    c += box(616, y + 100, 544, 1, "background: " + LINE)
    y += 128
c += box(616, 640, 544, 40, font(14, 20, MUTED), "来源：财政部（2026 年 1 月、8 月）。图为示意图，AI 生成")
pages.append(("13 设备更新照片页", c))

# 14 implications 2x2
c = head("对我们的启示：盯住消费、设备更新、碳排放和出口四条线")
im = [("消费：从补商品转向促服务和贴息", "以旧换新资金少 500 亿元，1–8 月服务零售 +4.9%"), ("设备更新：有钱也有贴息", "2000 亿元资金已下达，企业贷款贴息 1.5 个百分点"),
      ("碳排放：年度考核换口径", "今年碳排放强度降 3.8% 左右，五年累计降 17%"), ("出口：外需仍是亮点", "上半年出口 +13.4%，1–8 月货物进出口 +17.6%")]
for i, (ti, tx) in enumerate(im):
    x = 80 + (i % 2) * 568; y = 186 + (i // 2) * 216
    c += box(x, y, 552, 200, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
    c += box(x, y, 552, 4, "background: " + (RED if i == 1 else GOLD))
    c += numeral(x + 24, y + 30, i, RED, "#FFFFFF", 40)
    c += box(x + 84, y + 34, 440, 32, font(22, 32, RED if i == 1 else INK, 700), ti)
    c += box(x + 84, y + 84, 440, 60, font(18, 28, MUTED), tx)
c += source("来源：2026 年政府工作报告，国家统计局、财政部发布（2026 年 7–9 月）")
pages.append(("14 启示", c))

# 15 ending
c = goldlines()
c += box(80, 110, 1120, 30, "text-align: center; " + font(18, 30, MUTED), "请管理层确认分工")
c += box(80, 150, 1120, 70, "text-align: center; " + font(52, 70, RED, 700), "四季度先做三件事")
c += box(608, 240, 64, 2, "background: " + GOLD)
ed = [("设备更新", "梳理技改项目，对照贴息政策测算融资成本"), ("碳排放", "按碳强度口径，摸清主要工厂的排放基数"), ("跟踪", "10 月 19 日前三季度数据发布后，更新本判断")]
for i, (a, b) in enumerate(ed):
    x = 80 + i * 384
    c += box(x, 290, 360, 290, "background: " + SURF + "; border: 1px solid " + LINE + "; box-sizing: border-box")
    c += numeral(x + 150, 320, i, RED, "#FFFFFF", 60)
    c += box(x, 404, 360, 40, "text-align: center; " + font(28, 40, INK, 700), a)
    c += box(x + 30, 458, 300, 90, "text-align: center; " + font(18, 28, MUTED), b)
c += goldlines(668)
pages.append(("15 结尾", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, FONT, inner.replace(PHOTO, "../up/photo.jpg")))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "vermilion 政府工作报告样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
