#!/usr/bin/env python3
"""Web-ready photos, bun cut-outs and video loops for alinabun.com, made from the originals in assets/.

The originals (HEIC, iPhone JPGs, MOVs) stay in assets/ and are not committed (see .gitignore);
only what this script writes to assets/img/ and assets/video/ is.

Needs (macOS): sips, ffmpeg, avifenc, cwebp, and Python with Pillow + numpy.
    python3 tools/build-media.py            # everything
    python3 tools/build-media.py photos     # or: cutouts | videos | extras

To add a photo: put the original in assets/, add a line to PHOTOS, run the script,
then copy an existing <picture> block in index.html and change the name.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
IMG = ROOT / "assets" / "img"
VID = ROOT / "assets" / "video"
SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
WIDTHS = (480, 960, 1600)
MILK_BUN = (244, 238, 225)  # brand/tokens.css --milk-bun

# name -> (original in assets/, crop as fractions (left, top, right, bottom) or None)
PHOTOS = {
    "flatlay-all": ("FullSizeRender 4.HEIC", None),
    "flatlay-ingredients": ("IMG_2349.jpg", (0, 0, 1, 0.70)),  # stop above the floor
    "scene-tuna": ("TUNA BUN.HEIC", None),
    "scene-cream": ("CREME.HEIC", None),
    "scene-chocolate": ("CHOCOLATE.HEIC", None),
    "boards-all": ("IMG_2583.PNG", (0, 0, 1, 0.94)),
    "box-cream-hand": ("IMG_2497.JPG", None),
    "boxes-plate-2": ("IMG_2498.JPG", None),
    "boxes-plate": ("IMG_2499.JPG", None),
    "boxes-chocolate": ("IMG_2500.JPG", None),
    "box-tuna-hand": ("IMG_2502.JPG", None),
    "box-tuna-hand-2": ("IMG_2503.JPG", None),
    "boxes-cream": ("IMG_2515.jpg", None),
    "boxes-mixed": ("IMG_2516.jpg", None),
    "box-chocolate-hand": ("IMG_2517.jpg", None),
    "sesame-window": ("IMG_2609.JPG", None),
    "sesame-plate": ("IMG_2610.JPG", None),
    "sesame-sun": ("IMG_2611.JPG", None),
    "sesame-top": ("IMG_2612.JPG", None),
    "chocolate-plate": ("IMG_2614.JPG", None),
    "cream-plate": ("IMG_2617.JPG", None),
    "cream-plate-2": ("IMG_2618.JPG", None),
    "cream-top": ("IMG_2621.jpg", None),
    "buns-plate": ("IMG_2625.jpg", None),
    "dough-twists": ("IMG_2637.JPG", None),
    "chocolate-inside": ("IMG_2678.jpg", None),
    "oven": ("IMG_2923.JPG", None),
    "trays": ("IMG_2931.jpg", None),
    "packing": ("IMG_2932.jpg", None),
    "packing-2": ("IMG_2933.jpg", None),
    "beach-chocolate": ("IMG_2963.JPG", None),
    "beach-chocolate-2": ("IMG_2964.JPG", None),
    "beach-cream": ("IMG_2965.JPG", None),
    "sea-cream": ("IMG_2966.JPG", None),
    "flowers-cream": ("IMG_2967.JPG", None),
    "flowers-cream-2": ("IMG_2968.JPG", None),
    "flowers-cream-3": ("IMG_2970.JPG", None),
    "flowers-label": ("IMG_2971.JPG", None),
    "ixora-tuna": ("IMG_2972.JPG", None),
}

# Close-ups on white paper -> transparent cut-outs.
CUTOUTS = {"tuna": "FullSizeRender 2.HEIC", "cream": "FullSizeRender 3.HEIC", "chocolate": "FullSizeRender.HEIC"}

# Silent loops: name -> (original, start s, length s, crop "w:h:x:y" in the upright frame or None, width, play forward then back)
VIDEOS = {
    "hero": ("IMG_2930.mov", 0, 7.6, None, 720, True),
    "hero-sm": ("IMG_2930.mov", 0, 7.6, None, 480, True),
    "shaping": ("1022(1).MOV", 4.0, 6.0, "1080:1260:0:660", 540, False),  # below the burned-in caption
    "glazing": ("IMG_7580.MOV", 0, 5.4, "1080:1350:0:285", 540, True),
    "packing": ("IMG_2925.MOV", 0, 5.8, "1080:1350:0:285", 540, False),
    "beach": ("copy_FB66E253-1D72-4EE6-AADC-A9500C26E1BC.MOV", 16.9, 6.7, None, 540, False),  # beach only (cuts at 14.4, 16.7)
}


def run(*cmd):
    subprocess.run([str(c) for c in cmd], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def load_srgb(name: str) -> Image.Image:
    """Any original (HEIC/JPG/PNG, often Display P3) -> upright sRGB RGB image."""
    with tempfile.TemporaryDirectory() as t:
        out = Path(t) / "x.png"
        run("sips", "--matchTo", SRGB, "-s", "format", "png", SRC / name, "--out", out)
        im = ImageOps.exif_transpose(Image.open(out))  # iPhone JPGs are stored sideways with a rotate flag
        im.load()
    return im.convert("RGB")


def avif(png: Path, out: Path, q=60, alpha=False):
    args = ["avifenc", "-q", str(q), "-s", "6", "-j", "all"]
    if alpha:
        args += ["--qalpha", "90"]
    run(*args, png, out)


def photos():
    IMG.mkdir(parents=True, exist_ok=True)
    manifest = {}
    with tempfile.TemporaryDirectory() as t:
        for slug, (name, crop) in PHOTOS.items():
            im = load_srgb(name)
            if crop:
                w, h = im.size
                im = im.crop((round(crop[0] * w), round(crop[1] * h), round(crop[2] * w), round(crop[3] * h)))
            sizes = []
            for w in WIDTHS:
                if w > im.width and sizes:
                    continue
                cw = min(w, im.width)
                r = im.resize((cw, round(im.height * cw / im.width)), Image.LANCZOS)
                png = Path(t) / f"{slug}-{w}.png"
                r.save(png)
                avif(png, IMG / f"{slug}-{w}.avif")
                if w == 960:  # one JPEG for browsers without AVIF
                    r.save(IMG / f"{slug}-960.jpg", quality=78, optimize=True, progressive=True)
                sizes.append([w, r.width, r.height])
            manifest[slug] = sizes
            print(f"{slug:22} {im.width}x{im.height}")
    (IMG / "photos.json").write_text(json.dumps(manifest, indent=1))


def cutout(name: str, thr=0.30) -> Image.Image:
    """Bun on white paper -> RGBA: saturated pixels are bun; keep the blob in the middle; fill holes; feather.
    Needs a plain pale background: on a sunlit cream plate the shadows are as saturated as the bun."""
    im = load_srgb(name)
    a = np.asarray(im).astype(np.float32) / 255
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)  # paper and its shadow stay below ~0.25
    m = Image.fromarray(((sat > thr) * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))  # close drizzle/glare gaps
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))  # drop specks
    arr = np.asarray(m) > 0
    ys, xs = np.nonzero(arr)
    cy, cx = np.median(ys), np.median(xs)
    i = int(np.argmin((ys - cy) ** 2 + (xs - cx) ** 2))  # a bun pixel near the middle (not a pepper fleck)
    ImageDraw.floodfill(m, (int(xs[i]), int(ys[i])), 128)
    comp = np.asarray(m) == 128
    assert comp.mean() < 0.6, f"{name}: cut-out covers {comp.mean():.0%} of the photo"
    inv = Image.fromarray(np.where(comp, 0, 255).astype(np.uint8)).copy()
    ImageDraw.floodfill(inv, (0, 0), 128)  # outside; anything not reached is a hole inside the bun
    mask = Image.fromarray(((np.asarray(inv) != 128) * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.GaussianBlur(4)).point(lambda v: 255 if v > 127 else 0)
    mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.5))  # 2 px in, then feather
    rgba = im.copy()
    rgba.putalpha(mask)
    x0, y0, x1, y1 = mask.getbbox()
    side = max(x1 - x0, y1 - y0) + 32
    cxm, cym = (x0 + x1) // 2, (y0 + y1) // 2
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(rgba.crop((cxm - side // 2, cym - side // 2, cxm + side // 2, cym + side // 2)))
    return square


def warm(im: Image.Image, lift=0.9, rgb=(1.04, 1.0, 0.93)) -> Image.Image:
    """The close-ups were shot in cool, flat light; lift the midtones and warm them a touch."""
    a = np.asarray(im).astype(np.float32) / 255
    out = np.clip((a[..., :3] ** lift) * np.array(rgb, np.float32), 0, 1)
    return Image.fromarray((np.concatenate([out, a[..., 3:]], axis=2) * 255).round().astype(np.uint8), "RGBA")


def cutouts():
    IMG.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        for bun, name in CUTOUTS.items():
            sq = warm(cutout(name))
            for w in (400, 800):
                png = Path(t) / f"cut-{bun}-{w}.png"
                sq.resize((w, w), Image.LANCZOS).save(png)
                avif(png, IMG / f"cut-{bun}-{w}.avif", q=66, alpha=True)
                run("cwebp", "-q", "82", "-alpha_q", "90", "-exact", png, "-o", IMG / f"cut-{bun}-{w}.webp")
            print(f"cut-{bun:10} {sq.width}px")


def videos():
    VID.mkdir(parents=True, exist_ok=True)
    for slug, (name, start, length, crop, width, boomerang) in VIDEOS.items():
        chain = (f"crop={crop}," if crop else "") + f"scale={width}:-2:flags=lanczos,fps=30,format=yuv420p"
        out = VID / f"{slug}.mp4"
        common = ["-an", "-c:v", "libx264", "-profile:v", "high", "-crf", "27", "-preset", "slower",
                  "-movflags", "+faststart", "-tag:v", "avc1", out]
        if boomerang:  # forward then reversed: loops without a jump
            fc = f"[0:v]{chain},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]"
            run("ffmpeg", "-v", "error", "-y", "-ss", start, "-t", length, "-i", SRC / name,
                "-filter_complex", fc, "-map", "[v]", *common)
        else:
            run("ffmpeg", "-v", "error", "-y", "-ss", start, "-t", length, "-i", SRC / name, "-vf", chain, *common)
        if not slug.endswith("-sm"):
            run("ffmpeg", "-v", "error", "-y", "-ss", start, "-i", SRC / name, "-frames:v", "1",
                "-vf", (f"crop={crop}," if crop else "") + f"scale={width}:-2", "-q:v", "4", VID / f"{slug}.jpg")
        print(f"{slug:10} {out.stat().st_size / 1e6:.2f} MB")


def extras():
    """Link-preview image (1200x630) and the home-screen icon."""
    im = load_srgb("FullSizeRender 4.HEIC")
    w, h = im.size
    ch = round(w * 630 / 1200)
    top = (h - ch) // 2
    im.crop((0, top, w, top + ch)).resize((1200, 630), Image.LANCZOS).save(
        ROOT / "assets" / "og.jpg", quality=82, optimize=True, progressive=True)
    bun = warm(cutout(CUTOUTS["tuna"])).resize((150, 150), Image.LANCZOS)
    icon = Image.new("RGBA", (180, 180), MILK_BUN + (255,))
    icon.alpha_composite(bun, (15, 15))
    icon.convert("RGB").save(ROOT / "assets" / "apple-touch-icon.png", optimize=True)
    print("og.jpg, apple-touch-icon.png")


if __name__ == "__main__":
    jobs = {"photos": photos, "cutouts": cutouts, "videos": videos, "extras": extras}
    for job in sys.argv[1:] or ["photos", "cutouts", "videos", "extras"]:
        jobs[job]()
