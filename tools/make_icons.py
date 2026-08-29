#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TEN UI EDITOR のホーム画面アイコンを生成する。
使い方:  pip install pillow  &&  python3 tools/make_icons.py
出力:    リポジトリ直下に icon-180.png / icon-192.png / icon-512.png
"""
import os
from PIL import Image, ImageDraw

BG = "#12141a"
FRAME = "#f4f5f8"
ACC = "#ffb23f"

OUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def make(size):
    S = size * 4  # 4倍で描いてから縮小（アンチエイリアス目的）
    im = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(im)

    m = S * 0.24
    box = [m, m * 1.05, S - m, S - m * 0.95]
    r = S * 0.09
    d.rounded_rectangle(box, radius=r, fill=FRAME)

    o = S * 0.012
    d.rounded_rectangle(
        [box[0] - o * 2, box[1] - o * 2, box[2] + o * 2, box[3] + o * 2],
        radius=r + o * 2, outline=ACC, width=int(o * 2.2))

    hr = S * 0.055
    for cx, cy in [(box[0], box[1]), (box[2], box[1]),
                   (box[0], box[3]), (box[2], box[3])]:
        d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr],
                  fill="#ffffff", outline=ACC, width=int(S * 0.016))

    return im.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    for s in (180, 192, 512):
        path = os.path.join(OUT_DIR, "icon-%d.png" % s)
        make(s).save(path)
        print("wrote", path)
