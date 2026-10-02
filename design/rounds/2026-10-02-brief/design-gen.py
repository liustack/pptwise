import json, os, datetime
ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "project")
NAVY="#1E2A4A"; Y="#F5C518"; BG="#F7F6F2"; SURF="#FFFFFF"; INK="#1C1E23"; MUTED="#5B6069"; LINE="#DDDCD4"; GREY="#797D86"; BARTINT="#C9CCD2"
FONT='Georgia, "Source Han Serif SC", serif'

def pad(t):
    return '<span style="background: linear-gradient(transparent 60%, ' + Y + ' 60%, ' + Y + ' 94%, transparent 94%); padding: 0 3px; white-space: nowrap">' + t + '</span>'

def page(title, inner, bg=BG, color=INK):
    return """<!doctype html>
<html lang="en">
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
<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: """ + bg + "; color: " + color + "; font-family: " + FONT.replace('"', "'") + """">
""" + inner + """
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1280,"height":720}}'>
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
    if h is not None: s += "height: %dpx; " % h
    return '<div style="' + s + style + '">' + content + '</div>\n'

def chrome(n, heading, source=None, bg_dark=False):
    out = ""
    # heading band, bottom-aligned to the rule
    out += box(96, 56, 1000, 104, "display: flex; flex-direction: column; justify-content: flex-end; font-size: 36px; line-height: 46px; color: " + NAVY, heading)
    out += box(96, 172, 1088, 1, "background: " + NAVY)
    if source:
        out += box(96, 624, 1088, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "Source: " + source)
    out += footer(n)
    return out

def footer(n, dark=False):
    c = "#AEB4C2" if dark else MUTED
    rule = "#3A4666" if dark else LINE
    out = box(96, 664, 1088, 1, "background: " + rule)
    out += box(96, 676, 700, 24, "font-size: 16px; line-height: 24px; color: " + c, "Halden Partners")
    out += box(784, 676, 400, 24, "font-size: 16px; line-height: 24px; text-align: right; color: " + c, "Confidential&#160;&#160;&#160;&#160;" + str(n))
    return out

def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="' + FONT.replace('"', "'") + '">' + body + '</svg>\n'

def t(x, y, s, size=16, fill=MUTED, anchor="start", weight="400"):
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%s">%s</text>' % (x, y, size, fill, anchor, weight, s)

pages = {}

# 1 cover
c = ""
c += box(96, 56, 600, 28, "font-size: 20px; line-height: 28px; letter-spacing: 1px; font-weight: 700; color: " + NAVY, "Halden Partners")
c += box(784, 60, 400, 24, "font-size: 16px; line-height: 24px; text-align: right; color: " + MUTED, "Confidential")
c += box(96, 196, 64, 6, "background: " + Y)
c += box(96, 226, 900, 32, "font-size: 22px; line-height: 32px; color: " + MUTED, "Proposal to Northwind Logistics")
c += box(96, 272, 940, 168, "font-size: 68px; line-height: 80px; color: " + NAVY, "Cut last-mile cost 18% in twelve months")
c += box(96, 520, 1088, 1, "background: " + NAVY)
cols = ["Lift first-attempt success to 92%", "Re-cut routes for 15% more stops", "Plan overtime a week ahead"]
for i, s in enumerate(cols):
    x = 96 + i * 368
    c += box(x, 540, 336, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "0" + str(i + 1))
    c += box(x, 568, 320, 64, "font-size: 22px; line-height: 32px; color: " + INK, s)
c += box(96, 676, 700, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "Maya Ellison, Engagement lead")
c += box(784, 676, 400, 24, "font-size: 16px; line-height: 24px; text-align: right; color: " + MUTED, "14 October 2026")
pages["Main.dc.html"] = ("1 封面", page("Cover", c))

# 2 statement
c = ""
c += box(96, 176, 64, 6, "background: " + NAVY)
c += box(96, 206, 960, 132, "font-size: 54px; line-height: 66px; color: " + NAVY, "Last mile is the cost line that keeps growing")
c += box(96, 384, 880, 200, "font-size: 27px; line-height: 44px; color: " + INK,
         "Northwind delivered 160 million parcels this year. The last mile cost $5.35 each, " + pad("41% of all delivery cost") + ". Volume grew 22% in three years, and last-mile cost per parcel grew 30%.")
c += box(96, 624, 1088, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "Source: Northwind finance, FY2023 to FY2026")
c += footer(2)
pages["p02-statement.dc.html"] = ("2 观点", page("Statement", c))

# 3 combo chart + stats
c = chrome(3, "Cost per parcel rose 30% while volume grew 22%", "Northwind finance and network data, FY2023 to FY2026")
# plot area: x 160..780, baseline y 568, top 232
base = 568; top = 232; H = base - top
x0, x1 = 168, 772
s = ""
s += t(96, 212, "Parcels (millions)", 16, MUTED)
s += t(844, 212, "Cost per parcel", 16, MUTED, "end")
for v in [0, 80, 160, 240]:
    yy = base - v / 240 * H
    s += '<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="%s" stroke-width="1"/>' % (x0, yy, x1, yy, LINE if v else GREY)
    s += t(x0 - 14, yy + 6, str(v), 16, MUTED, "end")
for v in [0, 2, 4, 6]:
    yy = base - v / 6 * H
    s += t(x1 + 14, yy + 6, "$" + str(v), 16, MUTED)
years = ["FY2023", "FY2024", "FY2025", "FY2026"]
parcels = [131, 139, 150, 160]
cost = [4.10, 4.45, 4.90, 5.35]
slot = (x1 - x0) / 4
pts = []
for i in range(4):
    cx = x0 + slot * (i + 0.5)
    bh = parcels[i] / 240 * H
    s += '<rect x="%.1f" y="%.1f" width="72" height="%.1f" fill="%s"/>' % (cx - 36, base - bh, bh, BARTINT)
    s += t(cx, base - bh - 10, str(parcels[i]), 16, MUTED, "middle")
    s += t(cx, base + 28, years[i], 16, MUTED, "middle")
    ly = base - cost[i] / 6 * H
    pts.append((cx, ly))
s += '<polyline points="' + " ".join("%.1f,%.1f" % p for p in pts) + '" fill="none" stroke="' + NAVY + '" stroke-width="3"/>'
for i, (px, py) in enumerate(pts):
    s += '<circle cx="%.1f" cy="%.1f" r="6" fill="%s"/>' % (px, py, NAVY)
    s += t(px, py - 16, "$%.2f" % cost[i], 18, NAVY, "middle", "700")
c += svg(s)
# stats column
c += box(904, 200, 1, 384, "background: " + LINE)
c += box(944, 216, 240, 6, "") 
c += box(944, 224, 24, 12, "background: " + BARTINT)
c += box(976, 218, 220, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "Parcels")
c += box(944, 252, 240, 64, "font-size: 56px; line-height: 64px; color: " + MUTED, "+22%")
c += box(944, 320, 240, 52, "font-size: 18px; line-height: 26px; color: " + MUTED, "131M to 160M parcels")
c += box(944, 404, 24, 3, "background: " + NAVY + "; top: 410px")
c += box(976, 400, 220, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "Cost per parcel")
c += box(944, 434, 240, 64, "font-size: 56px; line-height: 64px; color: " + NAVY, pad("+30%"))
c += box(944, 502, 240, 52, "font-size: 18px; line-height: 26px; color: " + INK, "$4.10 to $5.35")
pages["p03-trend.dc.html"] = ("3 趋势图", page("Trend", c))

# 4 waterfall
c = chrome(4, "Three drivers explain almost 90% of the increase", "Last-mile cost per parcel, Halden analysis of 2.1 million route records")
k = 122; base = 552; FLOOR = 3.0
items = [("FY2023", 4.10, "total"), ("Failed first|attempts", 0.48, "plan"), ("Falling route|density", 0.37, "plan"), ("Driver|overtime", 0.26, "plan"), ("Fuel", 0.09, "other"), ("Other", 0.05, "other"), ("FY2026", 5.35, "total")]
slot = 1088 / 7
s = ""
run = 0
prev_top = None
tops = []
for i, (lab, v, kind) in enumerate(items):
    cx = 96 + slot * (i + 0.5)
    if kind == "total":
        y0, y1 = base - (v - FLOOR) * k, base
        run = v
        fill = NAVY
        label = "$%.2f" % v
    else:
        y1 = base - (run - FLOOR) * k
        run = round(run + v, 2)
        y0 = base - (run - FLOOR) * k
        fill = Y if kind == "plan" else GREY
        label = "+$%.2f" % v
    s += '<rect x="%.1f" y="%.1f" width="92" height="%.1f" fill="%s"/>' % (cx - 46, y0, y1 - y0, fill)
    if i < len(items) - 1:
        s += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" stroke-dasharray="3 3"/>' % (cx + 46, y0, cx + slot - 46, y0, GREY)
    s += t(cx, y0 - 10, label, 18, NAVY if kind != "other" else MUTED, "middle", "700" if kind == "total" else "400")
    for j, part in enumerate(lab.split("|")):
        s += t(cx, base + 30 + j * 22, part, 16, INK if kind != "other" else MUTED, "middle")
    if kind == "total":
        for dy in (0, 9):
            s += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="3"/>' % (cx - 50, base - 30 - dy + 6, cx + 50, base - 30 - dy - 6, BG)
    tops.append((cx, y0))
s += '<line x1="96" y1="%d" x2="1184" y2="%d" stroke="%s" stroke-width="1"/>' % (base, base, GREY)
# bracket over the three planning drivers
bx0 = tops[1][0] - 46; bx1 = tops[3][0] + 46; by = 226
s += '<path d="M%.1f %d V%d H%.1f V%d" fill="none" stroke="%s" stroke-width="1.5"/>' % (bx0, by + 10, by, bx1, by + 10, NAVY)
s += t((bx0 + bx1) / 2, by - 12, "Planning drivers: +$1.11 of the +$1.25 rise", 18, NAVY, "middle", "700")
c += svg(s)
pages["p04-drivers.dc.html"] = ("4 瀑布图", page("Drivers", c))

# 5 points + callout
c = chrome(5, "Each driver is a planning problem")
rows = [("Missed deliveries", "No time windows"), ("Density", "Routes cut for 2022 volume"), ("Overtime", "Shifts planned same day")]
for i, (a, b) in enumerate(rows):
    y = 208 + i * 88
    c += box(96, y, 40, 32, "font-size: 18px; line-height: 32px; color: " + MUTED, "0" + str(i + 1))
    c += box(152, y, 360, 32, "font-size: 26px; line-height: 32px; color: " + NAVY + "; font-weight: 700", a)
    c += box(520, y, 664, 32, "font-size: 26px; line-height: 32px; color: " + INK, b)
    c += box(96, y + 60, 1088, 1, "background: " + LINE)
c += box(96, 488, 1088, 112, "background: " + NAVY + "; box-sizing: border-box; padding: 0 48px; display: flex; align-items: center; font-size: 28px; line-height: 40px; color: #FFFFFF",
         "None of the three needs a single new van. All three need a better plan.")
pages["p05-why.dc.html"] = ("5 要点与结论", page("Why", c))

# 6 chapter
c = ""
c += box(96, 272, 64, 6, "background: " + Y)
c += box(96, 300, 600, 28, "font-size: 20px; line-height: 28px; letter-spacing: 2px; color: #AEB4C2", "02")
c += box(96, 340, 1000, 96, "font-size: 80px; line-height: 96px; color: #FFFFFF", "What we propose")
c += footer(6, dark=True)
pages["p06-chapter.dc.html"] = ("6 章节页", page("Chapter", c, bg=NAVY, color="#FFFFFF"))

# 7 comparison
c = chrome(7, "Fix density before buying fleet")
LX, AX, BX = 96, 400, 792; AW, BW = 360, 392
c += box(BX, 200, BW, 416, "background: " + SURF)
c += box(AX, 200, AW, 64, "box-sizing: border-box; padding: 0 0 0 0; display: flex; align-items: center; font-size: 24px; color: " + MUTED, "Add 600 vans")
c += box(BX, 200, BW, 64, "box-sizing: border-box; padding: 0 28px; display: flex; align-items: center; font-size: 24px; color: #FFFFFF; background: " + NAVY, "Fix density first")
rows = [("Cost to Northwind", "$210M capital", "$38M over 12 months"), ("Time to first saving", "18 months", "3 months"), ("Cost per parcel", "4% lower", pad("18% lower")), ("Main risk", "Vans sit idle off peak", "Depot teams absorb change")]
for i, (l, a, b) in enumerate(rows):
    y = 264 + i * 84
    c += box(LX, y + 26, 280, 32, "font-size: 18px; line-height: 32px; color: " + MUTED, l)
    c += box(AX, y + 26, AW - 24, 32, "font-size: 24px; line-height: 32px; color: " + INK, a)
    c += box(BX + 28, y + 26, BW - 56, 64, "font-size: 24px; line-height: 32px; color: " + NAVY + "; font-weight: 700", b)
    if i < 3:
        c += box(96, y + 84, 1088, 1, "background: " + LINE)
pages["p07-options.dc.html"] = ("7 方案对比", page("Options", c))

# 8 roadmap
c = chrome(8, "Four waves, each paying for the next")
waves = [("Pilot", "Months 1 to 3", ("Depots", "3"), ("Target", "$0.40 off per parcel")),
         ("First attempts", "Months 4 to 6", ("Depots", "20"), ("Target", "92% success")),
         ("Route re-cut", "Months 7 to 9", ("Depots", "All 46"), ("Target", "15% more stops")),
         ("Overtime and handover", "Months 10 to 12", ("Owner", "Northwind ops"), ("Target", "Run rate reached"))]
W = 260
for i, (title, period, r1, r2) in enumerate(waves):
    x = 96 + i * (W + 16)
    c += box(x, 212, W, 10, "background: " + (Y if i == 0 else NAVY))
    c += box(x, 240, W, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, period)
    c += box(x, 272, W - 16, 72, "font-size: 28px; line-height: 34px; color: " + NAVY, title)
    c += box(x, 372, W - 16, 1, "background: " + LINE)
    c += box(x, 392, W, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, r1[0])
    c += box(x, 418, W - 16, 48, "font-size: 36px; line-height: 44px; color: " + INK, r1[1])
    c += box(x, 492, W, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, r2[0])
    c += box(x, 518, W - 16, 64, "font-size: 24px; line-height: 32px; color: " + INK, r2[1])
pages["p08-plan.dc.html"] = ("8 路线图", page("Plan", c))

# 9 stat hero
c = chrome(9, "What the program is worth")
c += box(96, 236, 1000, 180, "font-size: 176px; line-height: 180px; color: " + NAVY + "; white-space: nowrap",
         "$154M<span style=\"font-size: 44px; color: " + MUTED + "; padding-left: 20px\">a year</span>")
c += box(96, 430, 540, 10, "background: " + Y)
c += box(96, 472, 900, 40, "font-size: 30px; line-height: 40px; color: " + INK, "Saving at run rate, from month 12")
c += box(96, 520, 900, 30, "font-size: 20px; line-height: 30px; color: " + MUTED, "$0.96 off each of 160 million parcels")
pages["p09-prize.dc.html"] = ("9 关键数字", page("Prize", c))

# 10 org tree
c = chrome(10, "One owner per lever, one steering group")
c += box(452, 232, 376, 96, "background: " + NAVY + "; box-sizing: border-box; padding: 18px 28px; text-align: center",
         '<div style="font-size: 26px; line-height: 34px; color: #FFFFFF">Steering group</div><div style="font-size: 18px; line-height: 26px; color: #C3C8D4">COO, CFO, Halden partner</div>')
s = ""
cx = [96 + 168, 472 + 168, 848 + 168]
s += '<line x1="640" y1="328" x2="640" y2="368" stroke="%s" stroke-width="1.5"/>' % NAVY
s += '<line x1="%d" y1="368" x2="%d" y2="368" stroke="%s" stroke-width="1.5"/>' % (cx[0], cx[2], NAVY)
for x in cx:
    s += '<line x1="%d" y1="368" x2="%d" y2="408" stroke="%s" stroke-width="1.5"/>' % (x, x, NAVY)
c += svg(s)
kids = [("First attempts", "VP Customer"), ("Route density", "VP Network"), ("Overtime", "VP Operations")]
for i, (n, r) in enumerate(kids):
    x = 96 + i * 376
    c += box(x, 408, 336, 128, "background: " + SURF + "; border: 1px solid " + LINE + "; border-top: 4px solid " + NAVY + "; box-sizing: border-box; padding: 26px 28px",
             '<div style="font-size: 26px; line-height: 34px; color: ' + NAVY + '">' + n + '</div><div style="font-size: 18px; line-height: 26px; color: ' + MUTED + '; margin-top: 6px">' + r + '</div>')
pages["p10-team.dc.html"] = ("10 组织", page("Team", c))

# 11 ending
c = ""
c += box(96, 120, 64, 6, "background: " + NAVY)
c += box(96, 150, 1000, 132, "font-size: 54px; line-height: 66px; color: " + NAVY, "Approve the three-depot pilot by " + pad("15 November"))
c += box(96, 368, 1088, 1, "background: " + NAVY)
steps = ["Pilot depots: Leeds, Bristol, Glasgow", "Halden team on site in week one", "First readout on 15 February"]
for i, s2 in enumerate(steps):
    x = 96 + i * 368
    c += box(x, 392, 336, 24, "font-size: 16px; line-height: 24px; color: " + MUTED, "0" + str(i + 1))
    c += box(x, 420, 344, 72, "font-size: 24px; line-height: 34px; color: " + INK, s2)
c += box(96, 584, 900, 28, "font-size: 18px; line-height: 28px; color: " + MUTED, "Maya Ellison, Engagement lead, Halden Partners")
c += footer(11)
pages["p11-ending.dc.html"] = ("11 结尾", page("Ending", c))

boards = {}; order = []
for i, (name, (title, html)) in enumerate(pages.items()):
    col = i % 4; row = i // 4
    boards[name] = {"x": col * 1360, "y": row * 840, "w": 1280, "h": 720, "title": title}
    order.append(name)
    open(os.path.join(P, name), "w").write(html)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
          "title": "Brief 样例设计稿", "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order, "notes": {}, "designSystems": []}
json.dump(canvas, open(os.path.join(P, "canvas.json"), "w"), ensure_ascii=False, indent=1)
print(order)
