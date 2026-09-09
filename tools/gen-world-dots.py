#!/usr/bin/env python3
"""
Regenerate the dotted world map used by the "Rooted in Africa" section
on index.html.

It rasterises Natural Earth 110m country polygons (public domain) onto an
equirectangular grid, marks which cells are land and which of those are in
Africa, then run-length encodes the result into the short string the page
decodes at runtime.

    python3 tools/gen-world-dots.py

Prints the RLE string plus the three constants that must match it. Paste
the string into the `RLE` variable in the map block near the bottom of
index.html, and update COLS / ROWS / LAT_TOP / LAT_BOT there if you change
them here. The page refuses to draw if the decoded length does not equal
COLS * ROWS, so a mismatch fails visibly rather than rendering a garbled
map.

Raising COLS gives a finer map and a longer string; the cost is roughly
linear. 150 columns is about 1.4KB and 2,704 dots.

Pin positions are NOT generated here. They live in the PINS array in
index.html as real latitude / longitude and are projected with the same
formula this script uses, so the two stay in step automatically.
"""

import json
import os
import urllib.request

SRC = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
       "master/geojson/ne_110m_admin_0_countries.geojson")
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ne110.json")

# Grid. Latitude stops at -57 so Antarctica is out of frame; the band would
# otherwise be a wide empty stripe under South Africa.
COLS, LAT_TOP, LAT_BOT = 150, 84.0, -57.0

DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"   # RLE run lengths, max 35


def load():
    if not os.path.exists(CACHE):
        print("downloading Natural Earth 110m ...")
        urllib.request.urlretrieve(SRC, CACHE)
    with open(CACHE) as fh:
        return json.load(fh)


def rings(geom):
    kind, coords = geom["type"], geom["coordinates"]
    if kind == "Polygon":
        return [coords]
    if kind == "MultiPolygon":
        return coords
    return []


def inside(polys, x, y):
    """Ray casting: first ring is the outline, the rest are holes."""
    for poly in polys:
        hit = False
        for ring_index, ring in enumerate(poly):
            crossings = False
            n = len(ring)
            j = n - 1
            for i in range(n):
                xi, yi = ring[i]
                xj, yj = ring[j]
                if (yi > y) != (yj > y) and \
                        x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                    crossings = not crossings
                j = i
            if ring_index == 0:
                hit = crossings
            elif crossings:          # inside a hole, so not inside the land
                hit = False
                break
        if hit:
            return True
    return False


def main():
    data = load()
    step = 360.0 / COLS
    rows = int(round((LAT_TOP - LAT_BOT) / step))

    feats = []
    for f in data["features"]:
        props = f["properties"]
        if (props.get("NAME") or props.get("name")) == "Antarctica":
            continue
        polys = rings(f["geometry"])
        xs = [p[0] for poly in polys for ring in poly for p in ring]
        ys = [p[1] for poly in polys for ring in poly for p in ring]
        feats.append((props.get("CONTINENT") or props.get("continent"),
                      polys, min(xs), max(xs), min(ys), max(ys)))

    cells = []
    for r in range(rows):
        lat = LAT_TOP - (r + 0.5) * step
        for c in range(COLS):
            lon = -180.0 + (c + 0.5) * step
            ch = "."
            for continent, polys, x0, x1, y0, y1 in feats:
                if lon < x0 or lon > x1 or lat < y0 or lat > y1:
                    continue          # bounding box rejects most of them
                if inside(polys, lon, lat):
                    ch = "A" if continent == "Africa" else "#"
                    break
            cells.append(ch)
    flat = "".join(cells)

    out, i = [], 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j] == flat[i]:
            j += 1
        run = j - i
        while run > 0:                # runs longer than 35 split into several
            take = min(run, 35)
            out.append(flat[i] + DIGITS[take])
            run -= take
        i = j
    rle = "".join(out)

    assert "".join(rle[k] * DIGITS.index(rle[k + 1])
                   for k in range(0, len(rle), 2)) == flat, "RLE roundtrip failed"

    print()
    print("COLS = %d, ROWS = %d, LAT_TOP = %g, LAT_BOT = %g"
          % (COLS, rows, LAT_TOP, LAT_BOT))
    print("land dots %d, of which Africa %d"
          % (flat.count("#") + flat.count("A"), flat.count("A")))
    print("RLE %d chars" % len(rle))
    print()
    print(rle)
    print()

    # a rough look at what was generated, so a broken run is obvious here
    # rather than in the browser
    print("preview (every other row):")
    for r in range(0, rows, 2):
        print("  " + flat[r * COLS:(r + 1) * COLS])


if __name__ == "__main__":
    main()
