import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#F2F7F4"; SURF = "#FBFDFC"; TEAL = "#0E6B5C"; ACC = "#3D9B82"; INK = "#1E2B27"; MUTED = "#5A6C66"; LINE = "#D5E2DC"
VEIN = "#4A7FB5"; SLATE = "#2E4257"; DANGER = "#B3282B"; WARN = "#B9722F"; TINT = "#E3EFEA"; GHOST = "#B9C7C1"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["pen", "pharmacy", "clinic-room", "pharmacist", "nutrition"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=TEAL, sw=2):
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


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="PingFang SC, Microsoft YaHei, sans-serif">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def beat(x, y, w, color=ACC, sw=2, at=0.3):
    bx = x + w * at
    pts = [(x, y), (bx, y), (bx + 6, y - 10), (bx + 12, y + 14), (bx + 18, y - 22), (bx + 24, y + 6), (bx + 30, y), (x + w, y)]
    return '<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linejoin="round" stroke-linecap="round"/>' % (" ".join("%.1f,%.1f" % p for p in pts), color, sw)


CHIP = {"rct": (TEAL, "RCT · 期刊"), "label": (VEIN, "说明书"), "co": (WARN, "企业口径"), "media": (MUTED, "媒体报道"), "draft": (SLATE, "征求意见稿"), "gov": (TEAL, "官方文件"), "reg": (VEIN, "登记库")}


def chip(x, y, kind, text=None, w=None):
    c, lab = CHIP[kind]
    lab = text or lab
    w = w or int(sum(12 if ord(ch) > 0x2e80 else 7.2 for ch in lab) + 22)
    return box(x, y, w, 22, "border: 1px solid %s; border-radius: 11px; box-sizing: border-box; text-align: center; white-space: nowrap; " % c + font(12, 20, c, 700), lab)


def runhead(pg, section):
    out = svg(beat(64, 38, 34, ACC, 1.6, 0.05))
    out += box(106, 28, 400, 20, font(13, 20, TEAL, 700, "letter-spacing: 2px"), section)
    out += box(716, 28, 500, 20, font(12, 20, MUTED, 400, "text-align: right"), "GLP-1 类减重药进院评估 · 药事会审议")
    out += box(64, 686, 400, 18, font(12, 18, MUTED), "药学部")
    out += box(816, 686, 400, 18, font(12, 18, MUTED, 400, "text-align: right; font-variant-numeric: tabular-nums"), "%02d / %d" % (pg, TOTAL))
    return out


def head(pg, section, title, size=30):
    out = runhead(pg, section)
    out += box(64, 58, 1152, 96, "display: flex; flex-direction: column; justify-content: flex-end; " + font(size, 42, INK, 700), "<div>" + title + "</div>")
    out += box(64, 166, 1152, 1, "background: " + LINE) + box(64, 165, 56, 3, "background: " + TEAL)
    return out


def source(t_, y=648):
    return box(64, y, 1152, 32, font(12, 16, MUTED), t_)


def photo(key, x, y, w, h, cap=None, radius=10):
    out = box(x, y, w, h, "border-radius: %dpx; overflow: hidden" % radius, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))
    if cap:
        out += box(x, y + h + 8, w, 18, font(12, 18, MUTED), cap)
    return out


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: " + SURF + "; border: 1px solid " + LINE + "; border-radius: 10px; box-sizing: border-box; " + extra, content)


pages = []

# 1 cover
c = photo("pen", 704, 0, 576, 720, None, 0)
c += box(64, 64, 600, 22, font(14, 22, TEAL, 700, "letter-spacing: 2px"), "药学部 <span style=\"color: " + MUTED + "; font-weight: 400; letter-spacing: 0\">· 提请药事管理与药物治疗学委员会审议</span>")
c += box(64, 150, 576, 200, "display: flex; flex-direction: column; justify-content: flex-end; " + font(44, 60, INK, 700), "<div>GLP-1 类减重药进院评估与院内管理方案</div>")
c += svg(beat(64, 410, 640, ACC, 2.5, 0.42))
meta = [("议题", "进院品种 · 开具范围 · 审核规则"), ("依据", "临床试验 · 药品说明书 · 国家文件 · 医保目录"), ("日期", "2026 年 10 月")]
y = 470
for k, v in meta:
    c += box(64, y, 576, 1, "background: " + LINE)
    c += box(64, y + 12, 80, 24, font(13, 24, MUTED), k)
    c += box(150, y + 12, 490, 24, font(16, 24, INK), v)
    y += 48
c += box(64, y, 576, 1, "background: " + LINE)
pages.append(("1 封面", c))

# 2 proposal
c = head(2, "提议", "建议纳入替尔泊肽和司美格鲁肽 2.4 mg，限门诊开具、前置审核、自费结算")
pr = [("pill", "品种", "纳入替尔泊肽、诺和盈，玛仕度肽临时采购", "两者中国人群和头对头证据最充分，诺和盈另有心血管结局证据", "依据见第 5 至 13 页", True),
      ("hospital", "范围", "健康体重管理门诊、内分泌科、临床营养科", "经院内培训考核授权的医师开具，药师专人做处方前置审核", "依据见第 14 页", False),
      ("clipboard-check", "规则", "按说明书门槛审核，减重适应证一律自费", "按有效性、安全性、依从性三类指标监测，上线 6 个月首次复评", "依据见第 15 至 17 页", False)]
s = ""
for i, (ic, k, ti, tx, ref, em) in enumerate(pr):
    y = 200 + i * 146
    fg = "#FFFFFF" if em else INK
    c += box(64, y, 1152, 132, ("background: " + TEAL if em else "background: " + SURF + "; border: 1px solid " + LINE) + "; border-radius: 12px; box-sizing: border-box")
    c += box(92, y + 24, 80, 20, font(13, 20, "#CFE6DE" if em else TEAL, 700, "letter-spacing: 2px"), "提议 %d" % (i + 1))
    s += icon(ic, 92, y + 58, 40, "#FFFFFF" if em else TEAL, 1.8)
    c += box(200, y + 22, 760, 34, font(24, 34, fg, 700), k + "：" + ti)
    c += box(200, y + 66, 760, 48, font(16, 24, "#DCEEE8" if em else MUTED), tx)
    c += box(1000, y + 54, 190, 24, "border: 1px solid %s; border-radius: 12px; box-sizing: border-box; text-align: center; " % ("#9FD0C2" if em else LINE) + font(13, 22, "#FFFFFF" if em else MUTED), ref)
c += svg(s)
pages.append(("2 提议", c))

# 3 why now
c = head(3, "背景", "体重管理门诊今年必须开，替尔泊肽药费又降了约八成")
tiles = [("hospital", "全覆盖", "三级公立综合医院 2026 年均提供健康体重管理门诊", "国家卫健委 2026 年为民服务十件实事之三", "gov", False),
         ("trending-down", "约 80%", "替尔泊肽 2026 年 1 月 1 日起降价", "10 mg 规格 4 周 4,758 元降到 936.70 元", "media", True),
         ("hourglass", "0 个", "国产司美格鲁肽注射液获批", "专利 2026 年 3 月到期，截至 9 月 8 日", "co", False)]
s = ""
for i, (ic, v, lab, note, kind, em) in enumerate(tiles):
    x = 64 + i * 392
    c += card(x, 196, 368, 250, "border-top: 3px solid %s" % (TEAL if em else LINE))
    s += icon(ic, x + 24, 220, 26, TEAL)
    c += chip(x + 368 - 24 - (len(CHIP[kind][1]) * 12 + 22), 222, kind)
    c += box(x + 24, 262, 320, 66, font(54, 66, TEAL if em else INK, 700, "white-space: nowrap"), v)
    c += box(x + 24, 336, 320, 52, font(17, 26, INK, 700), lab)
    c += box(x + 24, 396, 320, 44, font(14, 22, MUTED), note)
c += svg(s)
c += box(64, 482, 600, 24, font(16, 24, INK, 700), "成人体重状况（2018 年）")
c += box(64, 508, 600, 20, font(13, 20, MUTED), "《体重管理指导原则（2024 年版）》")
segs = [("肥胖 16.4%", 16.4, TEAL, "#FFFFFF"), ("超重 34.3%", 34.3, ACC, "#FFFFFF"), ("其他 49.3%", 49.3, TINT, MUTED)]
x = 64; W = 1152
for lab, v, col, fc in segs:
    w = W * v / 100
    c += box(int(x), 544, int(w) - 2, 52, "background: %s; box-sizing: border-box; padding-left: 14px; display: flex; align-items: center; " % col + font(16, 22, fc, 700), lab)
    x += w
c += box(64, 604, 1152, 20, font(13, 20, MUTED), "超重和肥胖合计 50.7%")
c += source("来源：国家卫健委新闻发布会（2026-02-12），中新经纬（2026-01-16），智飞生物公告（2026-09-08），《体重管理指导原则（2024 年版）》")
pages.append(("3 为什么现在", c))

# 4 outside
c = head(4, "背景", "院外已有假药和医保代开案例，患者需要一条规范的院内渠道")
c += photo("pharmacy", 64, 196, 520, 400, "示意图：医院门诊药房（AI 生成）")
cases = [("siren", "国家药监局 · 2024-09", "货值", "3,500 万元", "含司美格鲁肽的假减肥药，无证生产"), ("siren", "公安部 · 2025-03", "涉案", "2,200 余万元", "上海非法减肥针案，窝点 15 处，抓获 40 人"),
         ("landmark", "国家医保局 · 2024-04", "罚款", "2 至 5 倍", "代开减肥药涉嫌套取医保基金"), ("badge-alert", "国家药监局 · 2024-09", "提示", "严格限制", "减重药「适用人群有严格限制」")]
s = ""
for i, (ic, org, k, big, desc) in enumerate(cases):
    y = 196 + i * 102
    if i:
        c += box(624, y - 8, 592, 1, "background: " + LINE)
    s += icon(ic, 624, y + 8, 24, DANGER if i < 2 else TEAL)
    c += box(664, y + 4, 300, 22, font(13, 22, MUTED, 700), org)
    c += box(664, y + 30, 300, 52, font(16, 26, INK), desc)
    c += box(980, y + 4, 236, 20, font(12, 20, MUTED, 400, "text-align: right"), k)
    c += box(960, y + 26, 256, 44, font(30, 44, DANGER if i < 2 else INK, 700, "white-space: nowrap; text-align: right"), big)
c += svg(s)
c += source("来源：国家药监局（2024-09-18），公安部典型案例（2025-03-17），国家医保局答记者问（2024-04-16）")
pages.append(("4 院外风险", c))

# 5 china trials
c = head(5, "疗效", "三个品种在中国人群试验中，较安慰剂多减重 8 到 15 个百分点")
tr = [("SURMOUNT-CN", "替尔泊肽 15 mg", "210 例 · 52 周", -17.5, -2.3), ("GLORY-1", "玛仕度肽 6 mg", "610 例 · 48 周", -14.01, 0.30),
      ("STEP 12", "司美格鲁肽 2.4 mg", "242 例 · 44 周", -12.1, -2.2), ("STEP 7 中国亚组", "司美格鲁肽 2.4 mg", "300 例 · 44 周", -11.8, -3.5)]
s = ""
x0 = 420; k = 26
c += box(64, 186, 330, 20, font(12, 20, MUTED), "试验 · 药物 · 例数和疗程")
c += box(x0, 186, 500, 20, font(12, 20, MUTED), "体重变化　<span style=\"color:%s\">■</span> 药物组　<span style=\"color:%s\">□</span> 安慰剂组" % (TEAL, GHOST))
c += box(1036, 186, 180, 20, font(12, 20, MUTED, 400, "text-align: right"), "较安慰剂多减")
for i, (trial, drug, n, d, p) in enumerate(tr):
    y = 222 + i * 100
    c += box(64, y + 98, 1152, 1, "background: " + LINE) if i < 3 else ""
    c += box(64, y + 8, 330, 26, font(19, 26, INK, 700), trial)
    c += box(64, y + 38, 330, 22, font(15, 22, INK), drug)
    c += box(64, y + 62, 330, 20, font(13, 20, MUTED), n)
    s += rect(x0, y + 14, abs(d) * k, 30, TEAL, 'rx="3"') + t(x0 + abs(d) * k + 10, y + 36, "−%.2f%%" % abs(d) if trial == "GLORY-1" else "−%.1f%%" % abs(d), 17, TEAL, "start", 700)
    if p < 0:
        s += rect(x0, y + 52, abs(p) * k, 18, "none", 'stroke="%s" stroke-width="1.5" rx="3"' % GHOST) + t(x0 + abs(p) * k + 10, y + 66, "−%.1f%%" % abs(p), 14, MUTED)
    else:
        s += line(x0, y + 52, x0, y + 70, GHOST, 2) + t(x0 + 10, y + 66, "+%.2f%%" % p, 14, MUTED)
    diff = abs(d - p)
    c += box(1036, y + 10, 180, 48, font(40, 48, TEAL, 700, "text-align: right; white-space: nowrap"), ("%.1f" % diff))
    c += box(1036, y + 58, 180, 20, font(13, 20, MUTED, 400, "text-align: right"), "个百分点")
s += line(x0, 210, x0, 610, INK, 1.5)
c += svg(s)
c += source("来源：JAMA 2024，NEJM 2025，Lancet Diabetes Endocrinol 2026，Diabetes Obes Metab 2025。不同试验，不能直接比较")
pages.append(("5 中国人群", c))

# 6 head to head
c = head(6, "疗效", "唯一头对头：替尔泊肽 −20.2%，司美格鲁肽 −13.7%")
c += chip(64, 192, "rct", "RCT · NEJM 2025 · 751 例 · 72 周 · 开放标签")
s = ""
for i, (nm, v, col, waist) in enumerate([("替尔泊肽", 20.2, TEAL, "−18.4 cm"), ("司美格鲁肽", 13.7, VEIN, "−13.0 cm")]):
    y = 236 + i * 160
    c += box(64, y, 400, 24, font(17, 24, INK, 700), nm)
    c += box(64, y + 26, 400, 76, font(64, 76, col, 700, "white-space: nowrap"), "−%.1f%%" % v)
    s += rect(64, y + 110, v * 22, 14, col, 'rx="2"')
    c += box(64, y + 128, 440, 20, font(13, 20, MUTED), "体重变化 · 腰围 " + waist)
c += svg(s)
c += box(560, 192, 656, 1, "") + box(560, 190, 500, 24, font(16, 24, INK, 700), "减重达标比例")
c += chip(700, 190, "co")
s = ""
gx, gy, gh = 590, 240, 250
thr = [("≥10%", 81.6, 60.5), ("≥15%", 64.6, 40.1), ("≥20%", 48.4, 27.3), ("≥25%", 31.6, 16.1)]
for j, (lab, a, b) in enumerate(thr):
    x = gx + j * 156
    s += rect(x, gy + gh - a / 100 * gh, 52, a / 100 * gh, TEAL) + rect(x + 58, gy + gh - b / 100 * gh, 52, b / 100 * gh, VEIN)
    s += t(x + 26, gy + gh - a / 100 * gh - 8, "%.1f" % a, 14, TEAL, "middle", 700) + t(x + 84, gy + gh - b / 100 * gh - 8, "%.1f" % b, 14, VEIN, "middle", 700)
    s += t(x + 55, gy + gh + 24, "减重 " + lab, 14, INK, "middle")
s += line(gx - 10, gy + gh, 1216, gy + gh, INK, 1.2)
s += rect(1036, 214, 12, 12, TEAL) + t(1054, 225, "替尔泊肽", 12, MUTED) + rect(1140, 214, 12, 12, VEIN) + t(1158, 225, "司美格鲁肽", 12, MUTED)
c += svg(s)
st = [("恶心", "43.6%", "44.4%"), ("呕吐", "15.0%", "21.3%"), ("因不良事件停药", "6.1%", "8.0%")]
for j, (lab, a, b) in enumerate(st):
    x = 560 + j * 224
    c += box(x, 548, 210, 1, "background: " + LINE)
    c += box(x, 558, 210, 20, font(13, 20, MUTED), lab + ("（企业口径）" if j == 2 else ""))
    c += box(x, 580, 210, 34, font(24, 34, INK, 700, "white-space: nowrap"), "<span style=\"color:%s\">%s</span> <span style=\"font-size:15px;color:%s;font-weight:400\">vs</span> <span style=\"color:%s\">%s</span>" % (TEAL, a, MUTED, VEIN, b))
c += source("来源：SURMOUNT-5（NEJM 2025，礼来资助）。达标比例和停药率为礼来新闻稿口径，恶心、呕吐按 ClinicalTrials.gov 登记库计数折算")
pages.append(("6 头对头", c))

# 7 SELECT forest
c = head(7, "心血管", "心血管获益只有司美格鲁肽有证据：SELECT 主要终点 HR 0.80")
c += chip(64, 186, "rct", "RCT · NEJM 2023 · 17,604 例 · 已有心血管病 · 无糖尿病")
cols = [("终点", 64, 300, "left"), ("司美格鲁肽", 380, 100, "right"), ("安慰剂", 490, 90, "right"), ("HR（95% CI）", 1000, 216, "right")]
for lab, x, w, al in cols:
    c += box(x, 226, w, 20, font(12, 20, MUTED, 400, "text-align: " + al), lab)
c += box(64, 250, 1152, 2, "background: " + INK)
fx0, fx1 = 620, 960
def fx(v): return fx0 + (v - 0.6) / 0.6 * (fx1 - fx0)
rows = [("主要心血管不良事件", "6.5%", "8.0%", 0.80, 0.72, 0.90, "0.80（0.72 至 0.90）", True), ("心血管死亡", "2.5%", "3.0%", 0.85, 0.71, 1.01, "0.85（0.71 至 1.01）<br><span style=\"font-size:12px;color:%s\">未达统计学显著</span>" % MUTED, False),
        ("全因死亡", "4.3%", "5.2%", 0.81, 0.71, 0.93, "0.81（0.71 至 0.93）", False), ("心衰复合终点", "3.4%", "4.1%", 0.82, 0.71, 0.96, "0.82（0.71 至 0.96）", False)]
s = ""
for i, (e, a, b, hr, lo, hi, txt, em) in enumerate(rows):
    y = 252 + i * 64
    if em:
        c += box(64, y, 1152, 64, "background: " + TINT)
    c += box(64, y + 63, 1152, 1, "background: " + LINE)
    c += box(76, y + 20, 300, 24, font(17, 24, INK, 700 if em else 400), e)
    c += box(380, y + 20, 100, 24, font(17, 24, INK, 700 if em else 400, "text-align: right"), a)
    c += box(490, y + 20, 90, 24, font(17, 24, MUTED, 400, "text-align: right"), b)
    c += box(1000, y + (12 if "<br>" in txt else 20), 216, 44, font(15, 22 if "<br>" in txt else 24, TEAL if em else INK, 700 if em else 400, "text-align: right; white-space: nowrap"), txt)
    cy = y + 32
    s += line(fx(lo), cy, fx(hi), cy, TEAL if em else SLATE, 2)
    s += rect(fx(hr) - 7, cy - 7, 14, 14, TEAL if em else SLATE, 'transform="rotate(45 %.1f %.1f)"' % (fx(hr), cy))
s += line(fx(1.0), 240, fx(1.0), 512, INK, 1.2, 'stroke-dasharray="4 3"')
for v in [0.6, 0.8, 1.0, 1.2]:
    s += t(fx(v), 534, "%.1f" % v, 12, MUTED, "middle")
s += t(fx(1.0) - 8, 556, "← 司美格鲁肽更好", 12, TEAL, "end", 700) + t(fx(1.0) + 8, 556, "安慰剂更好 →", 12, MUTED)
c += svg(s)
c += card(64, 578, 1152, 56, "display: flex; align-items: center; padding-left: 56px; " + font(16, 24, INK))
c += box(120, 594, 1000, 24, font(16, 24, INK), "替尔泊肽的心血管结局试验 SURMOUNT-MMO 预计 2027 年 10 月完成，目前没有结果")
c += svg(icon("hourglass", 82, 594, 22, WARN))
c += source("来源：SELECT（NEJM 2023，平均随访 39.8 个月，BMI≥27），ACC 摘要，ClinicalTrials.gov NCT05556512", y=648)
pages.append(("7 心血管森林图", c))

# 8 safety
c = head(8, "安全性", "胃肠道反应最常见，甲状腺和胆囊风险要筛查和随访")
c += box(64, 186, 640, 20, font(12, 20, MUTED), "发生率　<span style=\"color:%s\">■</span> 药物组　<span style=\"color:%s\">│</span> 安慰剂组" % (TEAL, SLATE))
ae = [("司美格鲁肽 2.4 mg", "美国标签", "label", ("44", "16"), ("24", "6"), ("6.8", "3.2"), False), ("替尔泊肽 15 mg", "美国标签", "label", ("28", "8"), ("13", "2"), ("6.7", "3.4"), False),
      ("玛仕度肽 6 mg", "中国说明书", "label", ("50.5", "5.9"), ("43.1", "2.9"), ("1.0", "1.0"), True)]
heads = [("恶心", 290), ("呕吐", 438), ("因不良反应停药", 586)]
for lab, x in heads:
    c += box(x, 214, 140, 20, font(13, 20, INK, 700), lab)
c += box(64, 238, 664, 2, "background: " + INK)
s = ""
for i, (nm, src, kind, n, v, q, em) in enumerate(ae):
    y = 240 + i * 112
    if em:
        c += box(64, y, 664, 112, "background: " + TINT)
    c += box(64, y + 111, 664, 1, "background: " + LINE)
    c += box(76, y + 26, 200, 24, font(17, 24, INK, 700), nm)
    c += chip(76, y + 58, kind, src)
    for j, (a, b) in enumerate([n, v, q]):
        x = heads[j][1]; sc = 2.2 if j < 2 else 14
        s += rect(x, y + 40, float(a) * sc, 22, TEAL, 'rx="2"')
        s += line(x + float(b) * sc, y + 34, x + float(b) * sc, y + 68, SLATE, 2)
        s += t(x, y + 32, a + "%", 15, TEAL, "start", 700) + t(x + 132, y + 32, "对照 " + b + "%", 12, MUTED, "end")
c += svg(s)
risks = [("shield-alert", "甲状腺 C 细胞肿瘤", "三药标签均有警示，甲状腺髓样癌或 MEN2 病史禁用", DANGER), ("triangle-alert", "胆囊胆道疾病", "减重试验中 RR 2.29（76 项随机试验荟萃分析）", WARN),
         ("eye", "缺血性视神经病变", "EMA 2025 年 6 月列为司美格鲁肽非常罕见不良反应", WARN), ("bed", "麻醉误吸", "美国标签列入警告，围术期和胃肠镜前要评估", WARN)]
s = ""
for i, (ic, ti, tx, col) in enumerate(risks):
    y = 196 + i * 108
    c += card(768, y, 448, 96)
    s += icon(ic, 788, y + 18, 24, col)
    c += box(824, y + 14, 380, 26, font(17, 26, INK, 700), ti)
    c += box(824, y + 44, 380, 44, font(14, 22, MUTED), tx)
c += svg(s)
c += source("来源：Wegovy、Zepbound 美国标签，信尔美中国说明书，JAMA Intern Med 2022，EMA（2025-06）。不同试验，不能直接比较")
pages.append(("8 安全性", c))

# 9 rebound trajectory
c = head(9, "安全性", "停药就反弹：SURMOUNT-4 停药组 52 周回升 14.0%")
c += chip(64, 186, "rct", "RCT · JAMA 2024 · 先用药 36 周，再随机继续或换安慰剂")
gx0, gx1, gy0, gy1 = 130, 700, 236, 590
def wx(wk): return gx0 + wk / 88 * (gx1 - gx0)
def wy(v): return gy0 + (-v) / 28 * (gy1 - gy0)
s = ""
for v in [0, -10, -20]:
    s += line(gx0, wy(v), gx1, wy(v), LINE, 1) + t(gx0 - 12, wy(v) + 4, "%d%%" % v if v else "0", 12, MUTED, "end")
for wk in [0, 36, 88]:
    s += t(wx(wk), gy1 + 24, "第 %d 周" % wk, 12, MUTED, "middle")
s += line(wx(36), gy0 - 10, wx(36), gy1, MUTED, 1, 'stroke-dasharray="4 4"') + t(wx(36) + 8, gy0, "随机分组", 12, MUTED)
s += '<polyline points="%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (wx(0), wy(0), wx(36), wy(-20.9), TEAL)
s += '<polyline points="%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (wx(36), wy(-20.9), wx(88), wy(-25.3), TEAL)
s += '<polyline points="%.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round"/>' % (wx(36), wy(-20.9), wx(88), wy(-9.9), WARN)
for (wk, v, col) in [(36, -20.9, TEAL), (88, -25.3, TEAL), (88, -9.9, WARN)]:
    s += '<circle cx="%.1f" cy="%.1f" r="6" fill="%s"/>' % (wx(wk), wy(v), col)
s += t(wx(36) - 12, wy(-20.9) + 28, "−20.9%", 15, TEAL, "end", 700)
s += t(wx(88) - 4, wy(-25.3) + 28, "继续用药 −25.3%", 15, TEAL, "end", 700)
s += t(wx(88) - 4, wy(-9.9) - 14, "换安慰剂 −9.9%", 15, WARN, "end", 700)
c += svg(s)
c += box(int(wx(60)) - 60, int(wy(-15.5)) - 22, 170, 44, "background: %s; border-radius: 6px; text-align: center; " % WARN + font(14, 20, "#FFFFFF", 700), "较第 36 周回升<br>14.0%")
ev = [("STEP 4 · 司美格鲁肽", "继续 −7.9%　换安慰剂 +6.9%", "随机后 48 周，JAMA 2021"), ("STEP 1 延伸 · 司美格鲁肽", "停药 1 年回升 11.6 个百分点", "净减重只剩 5.6%"), ("BMJ 2026 荟萃分析", "每月回升 0.4 kg", "37 项研究，9,341 人")]
for i, (a, b, d) in enumerate(ev):
    y = 196 + i * 116
    c += card(760, y, 456, 104)
    c += box(784, y + 14, 420, 22, font(14, 22, MUTED, 700), a)
    c += box(784, y + 40, 420, 32, font(22, 32, INK, 700, "white-space: nowrap"), b)
    c += box(784, y + 74, 420, 20, font(13, 20, MUTED), d)
c += box(760, 552, 456, 72, "background: " + TINT + "; border-radius: 10px; box-sizing: border-box; padding: 14px 18px 14px 56px; " + font(15, 22, INK, 700), "美国真实世界：约 2/3 患者 1 年内停药")
c += svg(icon("trending-up", 778, 576, 22, WARN))
c += source("来源：SURMOUNT-4（JAMA 2024），STEP 4（JAMA 2021），STEP 1 延伸（Diabetes Obes Metab 2022），BMJ 2026，《肥胖症诊疗指南（2024 年版）》")
pages.append(("9 停药反弹", c))

# 10 approvals timeline
c = head(10, "审批", "在华已有 6 个减重品种获批，诺和盈又增心血管和 MASH 适应证")
tx0, tx1, ay = 100, 1180, 410
def mx(y_, m, d=1): return tx0 + ((y_ - 2023) * 12 + (m - 1) + (d - 1) / 30) / 48 * (tx1 - tx0)
s = line(tx0, ay, tx1, ay, INK, 2)
for yy in [2023, 2024, 2025, 2026]:
    x = mx(yy, 1)
    s += line(x, ay - 6, x, ay + 6, INK, 2) + t(x + 6, ay + 22, str(yy), 13, INK, "start", 700)
s += t(64, 214, "减重适应证获批（药监局批准日）", 13, TEAL, "start", 700) + t(64, 640, "", 1)
up = [("2023-06-30", 2023, 6, 30, "利鲁平", "利拉鲁肽", 0), ("2023-07-25", 2023, 7, 25, "贝那鲁肽", "", 1), ("2024-06-18", 2024, 6, 18, "诺和盈", "司美格鲁肽 2.4 mg", 0), ("2024-07-16", 2024, 7, 16, "穆峰达", "替尔泊肽", 1),
      ("2025-06-24", 2025, 6, 24, "信尔美", "玛仕度肽", 0), ("2026-03-03", 2026, 3, 3, "先维盈", "埃诺格鲁肽", 0)]
for d, yy, m, dd, nm, sub, tier in up:
    x = mx(yy, m, dd); ty = 250 + tier * 62
    s += line(x, ty + 50, x, ay - 6, ACC, 1.2) + '<circle cx="%.1f" cy="%.1f" r="6" fill="%s"/>' % (x, ay, TEAL)
    s += t(x + 8, ty + 4, d, 12, MUTED) + t(x + 8, ty + 24, nm, 16, INK, "start", 700) + (t(x + 8, ty + 42, sub, 12, MUTED) if sub else "")
s += t(64, 452, "新增适应证、政策与专利", 13, SLATE, "start", 700)
dn = [("2024-10-12", 2024, 10, 12, "《肥胖症诊疗指南》印发", 0, SLATE, False), ("2025-06-30", 2025, 6, 30, "穆峰达增睡眠呼吸暂停", 1, SLATE, False), ("2025-12-16", 2025, 12, 16, "诺和盈增心血管适应证", 0, TEAL, True),
      ("2026-01-01", 2026, 1, 1, "新版医保目录执行", 2, SLATE, False), ("2026-03-20", 2026, 3, 20, "司美格鲁肽专利到期", 3, SLATE, False), ("2026-09-08", 2026, 9, 8, "诺和盈增 MASH", 0, SLATE, False)]
for d, yy, m, dd, nm, tier, col, em in dn:
    x = mx(yy, m, dd); ty = 484 + tier * 40
    s += line(x, ay + 6, x, ty - 14, GHOST, 1.2) + '<rect x="%.1f" y="%.1f" width="10" height="10" fill="%s" transform="rotate(45 %.1f %.1f)"/>' % (x - 5, ay - 5, col, x, ay)
    s += t(x + 8, ty, d, 12, MUTED) + t(x + 8, ty + 20, nm, 15 if em else 14, TEAL if em else INK, "start", 700 if em else 400)
c += svg(s)
c += source("来源：国家药监局药品批准证明文件送达信息（2023-07 至 2026-09），日期为药监局批准日，不是企业公告日。在审未批：玛仕度肽 9 mg、口服司美格鲁肽 25 mg、国产司美格鲁肽注射液")
pages.append(("10 获批时间线", c))

# 11 BMI ruler
c = head(11, "审批", "诺和盈的 BMI 门槛是 30/27，穆峰达和信尔美是 28/24")
bx0, bx1 = 400, 1040
def bmx(v): return bx0 + (v - 22) / 14 * (bx1 - bx0)
s = ""
for v in [24, 27, 28, 30, 32.5]:
    s += line(bmx(v), 210, bmx(v), 610, LINE, 1, 'stroke-dasharray="3 3"') + t(bmx(v), 204, ("%g" % v), 13, INK, "middle", 700)
s += t(bx0 - 16, 204, "BMI", 12, MUTED, "end", 700)
c += box(1068, 190, 148, 20, font(12, 20, MUTED), "审核要点")
rws = [("诺和盈、利鲁平", [(27, 30, "light", "合并症"), (30, 36, "solid", "肥胖档")], "门槛更高", TEAL, True),
       ("穆峰达、信尔美", [(24, 28, "light", "合并症"), (28, 36, "solid", "肥胖档")], "与指导原则一致", MUTED, False),
       ("《体重管理指导原则》", [(24, 28, "light", "并发症"), (28, 36, "solid", "干预 3 至 6 个月减重 <5%")], "用药参考", MUTED, False),
       ("诺和盈心血管适应证", [(27, 36, "solid", "已确诊心血管病")], "单独核验", VEIN, False),
       ("诺和盈用于 BMI 24 至 <28", [(24, 28, "dash", "超说明书")], "超说明书", DANGER, False)]
for i, (nm, segs, tag, tc, em) in enumerate(rws):
    y = 226 + i * 76
    if em:
        c += box(64, y - 6, 1152, 64, "background: " + TINT + "; border-radius: 8px")
    c += box(76, y + 14, 310, 24, font(16, 24, INK, 700 if em else 400), nm)
    for a, b, kind, lab in segs:
        x, w = bmx(a), bmx(b) - bmx(a)
        if kind == "solid":
            s += rect(x, y + 8, w, 36, TEAL if i != 3 else VEIN, 'rx="4"') + t(x + 10, y + 31, lab, 13, "#FFFFFF", "start", 700)
        elif kind == "light":
            s += rect(x, y + 8, w, 36, "#BFDDD3", 'rx="4"') + t(x + 8, y + 31, lab, 12, TEAL, "start", 700)
        else:
            s += rect(x, y + 8, w, 36, "none", 'stroke="%s" stroke-width="1.5" stroke-dasharray="5 4" rx="4"' % DANGER) + t(x + 10, y + 31, lab, 13, DANGER, "start", 700)
    c += box(1068, y + 14, 148, 24, "border: 1px solid %s; border-radius: 12px; box-sizing: border-box; text-align: center; " % tc + font(12, 22, tc, 700), tag)
s += rect(400, 612, 14, 14, "#BFDDD3", 'rx="3"') + t(420, 624, "超重档，需至少 1 种合并症", 12, MUTED) + rect(620, 612, 14, 14, TEAL, 'rx="3"') + t(640, 624, "肥胖档", 12, MUTED)
s += t(720, 624, "STEP 12 有中国 BMI 24 至 <28 人群数据，但诺和盈说明书门槛未改", 12, MUTED)
c += svg(s)
c += source("来源：诺和诺德、礼来、华东医药上市公告，信尔美说明书，《体重管理指导原则（2024 年版）》，STEP 12（2026）")
pages.append(("11 BMI 标尺", c))

# 12 cost dumbbell
c = head(12, "费用", "替尔泊肽 4 周药费降到千元以内，但医保只报糖尿病，减重全自费")
dx0, dx1 = 290, 680
def dmx(v): return dx0 + v / 5000 * (dx1 - dx0)
cost = [("替尔泊肽 10 mg", 4758, 937, "−80%", True), ("替尔泊肽 5 mg", 2758, 551, "−80%", False), ("诺和盈 2.4 mg", 2463, 1284, "−48%", False), ("诺和盈 1.7 mg", 1894, 987, "−48%", False), ("玛仕度肽 6 mg（零售）", 2920, 2020, "−31%", False)]
s = ""
c += box(64, 186, 700, 20, font(12, 20, MUTED), "4 周药费（元）　<span style=\"color:%s\">○</span> 调整前　<span style=\"color:%s\">●</span> 2026 年初" % (MUTED, TEAL))
c += box(740, 186, 60, 20, font(12, 20, MUTED, 400, "text-align: right"), "降幅")
for v in [0, 1000, 2000, 3000, 4000, 5000]:
    s += line(dmx(v), 220, dmx(v), 590, LINE, 1) + t(dmx(v), 610, "{:,}".format(v), 12, MUTED, "middle")
for i, (nm, a, b, pct, em) in enumerate(cost):
    y = 246 + i * 70
    if em:
        c += box(64, y - 22, 736, 52, "background: " + TINT + "; border-radius: 8px")
    c += box(76, y - 12, 210, 24, font(15, 24, INK, 700 if em else 400), nm)
    s += line(dmx(b), y, dmx(a), y, GHOST, 3) + '<circle cx="%.1f" cy="%.1f" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (dmx(a), y, BG, MUTED) + '<circle cx="%.1f" cy="%.1f" r="8" fill="%s"/>' % (dmx(b), y, TEAL)
    s += t(dmx(b) - 14, y + 5, "{:,}".format(b), 14, TEAL, "end", 700) + t(dmx(a) + 14, y + 5, "{:,}".format(a), 13, MUTED)
    c += box(740, y - 12, 60, 24, font(16, 24, TEAL if em else INK, 700, "text-align: right"), pct)
c += svg(s)
c += card(840, 196, 376, 428, "border-top: 3px solid " + WARN)
c += svg(icon("receipt", 864, 220, 26, WARN))
c += box(900, 218, 300, 30, font(19, 30, INK, 700), "医保只报 2 型糖尿病")
c += box(864, 264, 330, 20, font(12, 20, MUTED), "2025 年版目录 · 替尔泊肽支付限制")
c += box(864, 288, 330, 52, "border-left: 3px solid " + LINE + "; padding-left: 12px; box-sizing: border-box; " + font(15, 24, INK), "「限成人2型糖尿病患者的血糖控制」")
c += box(864, 360, 330, 20, font(12, 20, MUTED), "《基本医疗保险用药管理暂行办法》第八条")
c += box(864, 384, 330, 52, "border-left: 3px solid " + LINE + "; padding-left: 12px; box-sizing: border-box; " + font(15, 24, INK), "「减肥、美容」等作用的药品不纳入目录")
c += box(864, 468, 330, 1, "background: " + LINE)
c += box(864, 486, 330, 64, font(19, 30, WARN, 700), "减重处方一律自费，玛仕度肽不在目录")
c += source("来源：中新经纬、时代周报报道的医院执行价（2026-01），玛仕度肽为京东零售价折算，四舍五入到元。国家医保局医保发〔2025〕33 号目录")
pages.append(("12 费用与医保", c))

# 13 formulary decision
c = head(13, "建议", "建议纳入替尔泊肽和诺和盈，玛仕度肽个案走临时采购")
cols = [("药品", 64, 250), ("主要依据", 330, 470), ("4 周药费", 820, 190), ("建议", 1040, 176)]
for lab, x, w in cols:
    c += box(x + 12, 188, w, 20, font(12, 20, MUTED), lab)
c += box(64, 212, 1152, 2, "background: " + INK)
fm = [("替尔泊肽", "头对头 −20.2%，中国人群 −17.5%，心血管结局 2027 年出", "551 至 937 元", "纳入", "solid", True),
      ("司美格鲁肽 2.4 mg", "唯一有心血管结局证据，SELECT HR 0.80", "987 至 1,284 元", "纳入", "solid", False),
      ("玛仕度肽", "中国人群 −14.01%，无心血管结局，恶心 50.5%", "约 2,020 元（零售）", "临时采购", "outline", False),
      ("埃诺格鲁肽", "说明书 BMI 门槛和价格未查到", "未查到", "暂缓", "grey", False),
      ("利拉鲁肽、贝那鲁肽", "疗效较弱：去除安慰剂后 5.4%，16 周 −6.0%", "利拉鲁肽约 1,550 元（30 天）", "不纳入", "greyfill", False)]
s = ""
for i, (nm, why, cost_, dec, kind, em) in enumerate(fm):
    y = 214 + i * 82
    if em:
        c += box(64, y, 1152, 82, "background: " + TINT)
    c += box(64, y + 81, 1152, 1, "background: " + LINE)
    s += icon("pill", 76, y + 29, 22, TEAL if kind in ("solid", "outline") else GHOST)
    c += box(108, y + 26, 220, 28, font(18, 28, INK, 700), nm)
    c += box(342, y + 1, 460, 80, "display: flex; align-items: center; " + font(15, 24, INK), why)
    c += box(832, y + 28, 200, 24, font(15, 24, INK, 400, "white-space: nowrap"), cost_)
    st = {"solid": "background: %s; color: #FFFFFF; border: 1px solid %s" % (TEAL, TEAL), "outline": "background: transparent; color: %s; border: 1.5px solid %s" % (TEAL, TEAL),
          "grey": "background: transparent; color: %s; border: 1.5px solid %s" % (MUTED, GHOST), "greyfill": "background: #E2E9E6; color: %s; border: 1px solid #E2E9E6" % MUTED}[kind]
    c += box(1052, y + 24, 120, 34, st + "; border-radius: 17px; box-sizing: border-box; text-align: center; font-size: 15px; line-height: 31px; font-weight: 700", dec)
c += svg(s)
c += source("来源：前文各试验与说明书，《肥胖症诊疗指南（2024 年版）》，媒体报道价格（2026-01）。药费区间按常用规格计算")
pages.append(("13 进院建议", c))

# 14 scope
c = head(14, "管理", "限定在体重管理门诊和两个专科开具，药师专人审核")
c += photo("clinic-room", 64, 196, 560, 400, "示意图：体重管理门诊诊室（AI 生成）")
sc = [("hospital", "开具场所", "体重管理门诊、内分泌科、临床营养科"), ("user-check", "处方权限", "经院内培训考核授权的医师"), ("badge-check", "审核药师", "每个门诊至少 1 名专项培训药师"), ("users", "多学科随访", "内分泌、营养、减重外科、药学")]
s = ""
for i, (ic, ti, tx) in enumerate(sc):
    x = 656 + (i % 2) * 288; y = 196 + (i // 2) * 212
    c += card(x, y, 272, 196)
    s += '<circle cx="%d" cy="%d" r="24" fill="%s"/>' % (x + 46, y + 48, TINT) + icon(ic, x + 34, y + 36, 24, TEAL)
    c += box(x + 22, y + 90, 230, 28, font(19, 28, INK, 700), ti)
    c += box(x + 22, y + 124, 230, 52, font(15, 24, MUTED), tx)
c += svg(s)
c += source("来源：国家卫健委健康体重管理门诊通知（2025-03），中国药学会征求意见稿（2026-06）。限定科室和每门诊 1 名药师为本院提议，国家文件未作规定")
pages.append(("14 开具范围", c))

# 15 audit flow
c = head(15, "管理", "处方前置审核分五步，存在禁忌或门槛不符即拦截")
c += chip(64, 186, "draft", "依据：中国药学会征求意见稿（2026-06）")
stp = [("ruler", "核门槛", "BMI、合并症和体成分，按品种对照说明书"), ("ban", "排禁忌", "甲状腺髓样癌或 MEN2 病史，妊娠和哺乳"), ("pill", "查相互作用", "左甲状腺素钠、华法林、口服避孕药等"),
       ("file-check", "核超说明书", "知情同意书和备案记录齐全"), ("receipt", "定结算", "减重适应证自费，糖尿病按医保限定支付")]
s = ""
for i, (ic, ti, tx) in enumerate(stp):
    x = 64 + i * 232
    c += card(x, 228, 212, 176, "border-top: 3px solid " + TEAL)
    s += t(x + 20, 262, "%02d" % (i + 1), 14, ACC, "start", 700) + icon(ic, x + 168, 244, 24, TEAL)
    c += box(x + 20, 278, 180, 30, font(21, 30, INK, 700), ti)
    c += box(x + 20, 318, 176, 76, font(15, 24, MUTED), tx)
    if i < 4:
        s += '<polygon points="%d,322 %d,328 %d,334" fill="%s"/>' % (x + 216, x + 228, x + 216, TEAL)
for i in range(2):
    x = 64 + i * 232 + 106
    s += line(x, 404, x, 450, DANGER, 1.5, 'stroke-dasharray="4 3"')
s += line(170, 450, 402, 450, DANGER, 1.5, 'stroke-dasharray="4 3"') + line(286, 450, 286, 470, DANGER, 1.5) + '<polygon points="280,468 286,478 292,468" fill="%s"/>' % DANGER
c += svg(s)
c += box(64, 482, 560, 96, "border: 1.5px solid %s; border-radius: 10px; box-sizing: border-box; background: #FBEDEC; padding: 0 20px 0 60px; display: flex; align-items: center; " % DANGER + font(17, 28, DANGER, 700), "拦截：存在禁忌、不符合说明书门槛，或因容貌焦虑求药")
c += svg(icon("ban", 84, 518, 24, DANGER))
c += card(656, 482, 560, 96, "padding: 0 20px 0 60px; display: flex; align-items: center; " + font(15, 24, INK), "替尔泊肽的糖尿病和减重是同一产品、同一文号，系统要按诊断区分医保结算")
c += svg(icon("receipt-text", 676, 518, 24, TEAL))
c += source("来源：中国药学会《医疗机构减重药物临床应用与药学监护标准（征求意见稿）》（2026-06），2025 年版国家医保药品目录")
pages.append(("15 前置审核", c))

# 16 pharmacist
c = head(16, "管理", "药师还要防滥用：首诊评估风险，盯住跨机构就诊和剂量异常")
c += photo("pharmacist", 656, 196, 560, 400, "示意图：药师在审方工作站（AI 生成）")
ph = [("clipboard-list", "首诊评估", "用 DAST-10 量表筛查药物滥用风险"), ("scan-search", "处方监测", "识别频繁跨机构就诊、剂量异常递增"), ("bed", "围术期", "麻醉和胃肠镜前评估误吸风险"), ("baby", "特殊人群", "妊娠哺乳期禁用，育龄女性确认未孕")]
s = ""
for i, (ic, ti, tx) in enumerate(ph):
    y = 196 + i * 104
    if i:
        c += box(64, y - 8, 552, 1, "background: " + LINE)
    s += '<circle cx="88" cy="%d" r="24" fill="%s"/>' % (y + 32, TINT) + icon(ic, 76, y + 20, 24, TEAL)
    c += box(128, y + 6, 480, 28, font(19, 28, INK, 700), ti)
    c += box(128, y + 40, 480, 24, font(15, 24, MUTED), tx)
c += svg(s)
c += source("来源：中国药学会《医疗机构减重药物临床应用与药学监护标准（征求意见稿）》（2026-06-26）")
pages.append(("16 防滥用", c))

# 17 monitoring
c = head(17, "监测", "按有效性、安全性、依从性监测，上线 6 个月首次复评")
mon = [("activity", "有效性", ["最大耐受剂量 3 至 6 个月减重 ≥5% 的比例", "不足 5% 评估停药"]), ("shield-check", "安全性", ["胰腺炎、胆囊炎等严重不良事件", "因不良反应停药率", "瘦体重下降超 5% 的比例"]),
       ("calendar-check", "依从性", ["6 个月治疗持续率", "门诊随访依从率"])]
s = ""
for i, (ic, ti, items) in enumerate(mon):
    x = 64 + i * 260
    c += card(x, 196, 244, 248)
    s += icon(ic, x + 20, 216, 24, TEAL)
    c += box(x + 54, 214, 170, 28, font(19, 28, INK, 700), ti)
    for j, it in enumerate(items):
        y = 260 + j * 58
        s += rect(x + 20, y + 4, 14, 14, "none", 'stroke="%s" stroke-width="1.5" rx="2"' % TEAL)
        c += box(x + 44, y, 186, 48, font(14, 22, INK), it)
c += svg(s)
c += photo("nutrition", 856, 196, 360, 248, None)
tl = [("上线", "院内目录生效", False), ("+6 个月", "首次复评", True), ("2027-04", "司美格鲁肽数据保护到期", False), ("2027-10", "SURMOUNT-MMO 完成", False), ("2027-12", "医保协议到期", False)]
s = line(140, 536, 1140, 536, INK, 2)
for i, (d, lab, em) in enumerate(tl):
    x = 140 + i * 250
    s += '<circle cx="%d" cy="536" r="%d" fill="%s" stroke="%s" stroke-width="2"/>' % (x, 9 if em else 7, TEAL if em else BG, TEAL)
    s += t(x, 516, d, 16, TEAL if em else INK, "middle", 700) + t(x, 568, lab, 14, TEAL if em else MUTED, "middle", 700 if em else 400)
s += t(64, 484, "复评节点", 13, TEAL, "start", 700)
c += svg(s)
c += source("来源：中国药学会征求意见稿（2026-06），《肥胖症诊疗指南（2024 年版）》，ClinicalTrials.gov。图为示意图，AI 生成", y=648)
pages.append(("17 监测复评", c))

# 18 ballot
c = runhead(18, "表决")
c += box(64, 80, 1152, 60, font(40, 56, INK, 700), "请委员会表决三项")
c += box(64, 152, 1152, 1, "background: " + LINE) + box(64, 151, 56, 3, "background: " + TEAL)
bal = [("品种", "纳入替尔泊肽、诺和盈，玛仕度肽临时采购"), ("范围", "体重管理门诊、内分泌科、临床营养科"), ("规则", "前置审核，减重自费，上线 6 个月首评")]
s = ""
c += box(820, 178, 396, 20, font(12, 20, MUTED), "<span style=\"display:inline-block;width:120px;text-align:center\">同意</span><span style=\"display:inline-block;width:120px;text-align:center\">不同意</span><span style=\"display:inline-block;width:120px;text-align:center\">弃权</span>")
for i, (k, v) in enumerate(bal):
    y = 206 + i * 112
    c += card(64, y, 1152, 96)
    c += box(88, y + 22, 60, 52, font(36, 52, TEAL, 700), "%d" % (i + 1))
    c += box(150, y + 18, 120, 24, font(14, 24, TEAL, 700, "letter-spacing: 2px"), k)
    c += box(150, y + 44, 640, 34, font(22, 34, INK, 700), v)
    for j in range(3):
        bx = 820 + j * 120 + 46
        s += rect(bx, y + 34, 28, 28, BG, 'stroke="%s" stroke-width="1.8" rx="4"' % (TEAL if j == 0 else GHOST))
c += svg(s)
c += box(64, 560, 1152, 1, "background: " + LINE)
c += box(64, 580, 600, 24, font(15, 24, INK), "提请：药学部　　　日期：2026 年 10 月")
c += box(816, 580, 400, 24, font(15, 24, MUTED, 400, "text-align: right"), "委员会主任委员签字：________________")
pages.append(("18 表决", c))

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
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "clinic 减重药进院评估样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
