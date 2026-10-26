# alinabun.com

The main Alina Bun site: the buns, the kitchen, the boxes, the islands, and how to order.
This repo is the GitHub **user site** for the `alinabun` account, so it is
served at the apex domain.

| | |
|---|---|
| **Live** | https://alinabun.com |
| **Repo type** | user site (`alinabun.github.io`) — there can only be one |
| **Branch** | `main`, served from `/` (root) |
| **Custom domain** | `alinabun.com` (see `CNAME`) |

## Layout

```
index.html               the whole site: one page, no build step
assets/site.css          styles (mobile first)
assets/site.js           live store data, squishy buns, video, photo viewer
assets/img/              web photos (AVIF + JPEG) and bun cut-outs (AVIF + WebP)
assets/video/            short muted loops (MP4) and their posters
assets/og.jpg            link preview image
tools/build-media.py     makes assets/img and assets/video from the originals
brand/tokens.css         ← SHARED brand tokens, source of truth
brand/color-guide.html   interactive palette reference
CNAME, .nojekyll         GitHub Pages settings
```

The original photos and videos also live in `assets/` but are ignored by git
(see `.gitignore`); only what `tools/build-media.py` makes from them is committed.

## Live data from the store

The page reads the store's public API (the `store` edge function behind
store.alinabun.com), so nothing here goes stale:

- `/catalog`: which buns are on sale, their names, prices, descriptions and photos.
  Cards for buns not on sale are removed; a new bun gets a simple card.
- `/delivery-dates`: the next order day, the cutoff hour, extras left today,
  the delivery fee outside Malé and the Instagram handle.

Change those in the store admin, never in this repo. If the API can't be reached,
the page still works: the live lines and Instagram links stay hidden and the text
falls back to neutral wording ("by the evening before", "a small fee").

On `localhost` the page calls a local copy of the store at `localhost:54321`
instead; without one running you see the fallback.

## Brand

`brand/tokens.css` is the **single source of truth** for colour, type and
spacing across every `alinabun.*` repo. Other repos (e.g. `links`) mirror
these values inline for speed — if you change a token here, update the
mirrors too. `assets/site.css` repeats four of them as RGB triplets so they can
be used with transparency; keep those in step too. Open `brand/color-guide.html`
in a browser for the palette with contrast ratios.

Never introduce a colour that isn't in the token file.

## Editing

No build, no dependencies. Edit, commit, push — Pages redeploys in about a minute.

```bash
python3 -m http.server 8080    # then open http://localhost:8080
```

### Photos and videos

Put the original in `assets/`, add it to `PHOTOS` (or `VIDEOS`) in
`tools/build-media.py`, run the script, then copy an existing `<picture>` block
in `index.html` and change the name. The script needs macOS (`sips`), `ffmpeg`,
`avifenc`, `cwebp` and Python with Pillow and numpy.

```bash
python3 tools/build-media.py photos    # or: cutouts | videos | extras (no argument = all)
```

## Related

- [`alinabun/links`](https://github.com/alinabun/links) → links.alinabun.com
- [`alinabun/store`](https://github.com/alinabun/store) → store.alinabun.com
