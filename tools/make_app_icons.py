"""Draws the Home Screen icons for the hosted game (game/web/*.png).

Run: python3 tools/make_app_icons.py  (needs Pillow). Re-run only if the design changes.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "game" / "web"
BG, CROSS, LINE = (10, 19, 34), (232, 72, 85), (94, 234, 212)


def draw(size):
    s = size * 4  # supersample, then shrink for smooth edges
    im = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(im)
    u = s / 100
    # rounded red cross
    d.rounded_rectangle([38 * u, 16 * u, 62 * u, 84 * u], radius=6 * u, fill=CROSS)
    d.rounded_rectangle([16 * u, 38 * u, 84 * u, 62 * u], radius=6 * u, fill=CROSS)
    # ECG trace across the middle
    pts = [(6, 50), (30, 50), (38, 50), (44, 30), (52, 72), (58, 42), (63, 50), (94, 50)]
    d.line([(x * u, y * u) for x, y in pts], fill=LINE, width=int(4.5 * u), joint="curve")
    return im.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
draw(180).save(OUT / "apple-touch-icon.png")
draw(192).save(OUT / "icon-192.png")
draw(512).save(OUT / "icon-512.png")
print("wrote", ", ".join(p.name for p in sorted(OUT.glob("*.png"))))
