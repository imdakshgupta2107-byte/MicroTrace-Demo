#!/usr/bin/env python3
"""Optional brand regeneration; normal npm/Android builds do not need Python.
Source: the user's supplied, unaltered PNG at public/brand/logo-original.png.
Only crop, contain/resize and pad it. Never redraw or stretch the logo.
Requires Pillow: python -m pip install Pillow
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / 'public' / 'brand'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
ORIGINAL = Image.open(BRAND / 'logo-original.png').convert('RGB')


def crop_ink(image):
    mask = image.convert('L').point(lambda value: 255 if value < 205 else 0)
    return image.crop(mask.getbbox())


def contain(image, size, padding=0, background='white'):
    canvas = Image.new('RGB', size, background)
    art = ImageOps.contain(image, (size[0] - 2 * padding, size[1] - 2 * padding), Image.Resampling.LANCZOS)
    canvas.paste(art, ((size[0] - art.width) // 2, (size[1] - art.height) // 2))
    return canvas


# The uploaded square has the symbol above the separate MICROTRACE wordmark.
cut = round(ORIGINAL.height * .825)
symbol = crop_ink(ORIGINAL.crop((0, 0, ORIGINAL.width, cut)))
wordmark = crop_ink(ORIGINAL.crop((0, cut, ORIGINAL.width, ORIGINAL.height)))
icon = contain(symbol, (512, 512), padding=38)
icon.save(BRAND / 'logo-icon.png', optimize=True)
for size in (192, 512):
    icon.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / 'public' / f'icon-{size}.png', optimize=True)

# Horizontal lockup is assembled from the same pixels, for narrow navigation.
lockup = Image.new('RGB', (720, 168), 'white')
small_symbol = ImageOps.contain(symbol, (116, 144), Image.Resampling.LANCZOS)
small_wordmark = ImageOps.contain(wordmark, (540, 86), Image.Resampling.LANCZOS)
lockup.paste(small_symbol, (20 + (116 - small_symbol.width) // 2, (168 - small_symbol.height) // 2))
lockup.paste(small_wordmark, (160 + (540 - small_wordmark.width) // 2, (168 - small_wordmark.height) // 2))
lockup.save(BRAND / 'logo-lockup.png', optimize=True)

for folder in RES.glob('mipmap-*dpi'):
    for name in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        target = folder / name
        if not target.exists():
            continue
        size = Image.open(target).size
        if name == 'ic_launcher_foreground.png':
            # Adaptive-icon safe zone. Source art remains fully visible in a mask.
            image = contain(symbol, size, padding=round(size[0] * .215))
        else:
            image = contain(symbol, size, padding=round(size[0] * .13))
        image.save(target, optimize=True)

for target in RES.glob('drawable*/splash.png'):
    size = Image.open(target).size
    canvas = Image.new('RGB', size, '#0f2142')
    width = round(min(size[0] * .7, size[1] * .8))
    height = round(width * lockup.height / lockup.width)
    tile = contain(lockup, (width, height))
    canvas.paste(tile, ((size[0] - width) // 2, (size[1] - height) // 2))
    canvas.save(target, optimize=True)

# Replace the unused stock Android robot fallback too.
(RES / 'drawable-v24' / 'ic_launcher_foreground.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@mipmap/ic_launcher_foreground" android:gravity="center" />
''')
print('Created faithful web, launcher and splash assets from the supplied logo.')
