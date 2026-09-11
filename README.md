# alinabun.com

The main Alina Bun site — the story, the buns, and where to order.
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
index.html          the whole site — single page, no build step
CNAME               tells GitHub Pages the custom domain
.nojekyll           skip Jekyll processing; serve files as-is
brand/tokens.css    ← SHARED brand tokens, source of truth
brand/color-guide.html   interactive palette reference
assets/             favicon, logo, og image
```

## Brand

`brand/tokens.css` is the **single source of truth** for colour, type and
spacing across every `alinabun.*` repo. Other repos (e.g. `links`) mirror
these values inline for speed — if you change a token here, update the
mirrors too. Open `brand/color-guide.html` in a browser for the palette
with contrast ratios.

Never introduce a colour that isn't in the token file.

## Editing

No build, no dependencies. Edit `index.html`, commit, push — Pages
redeploys in about a minute.

```bash
open index.html          # preview locally
```

Sections marked `[Replace: ...]` are placeholder prose awaiting the real story.

## Related

- [`alinabun/links`](https://github.com/alinabun/links) → links.alinabun.com
- `alinabun/store` → store.alinabun.com *(not built yet)*
