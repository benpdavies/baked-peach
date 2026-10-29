# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`CLAUDE.md` is a symlink to `AGENTS.md` — edit `AGENTS.md`.

## Overview

Static photography portfolio built with Astro 7 (Node >= 22.12), deployed as a Cloudflare Workers static-assets site (`wrangler.jsonc`) by Cloudflare Workers Builds, which is connected to the GitHub repo and builds (`npm run build`) and deploys (`npx wrangler deploy`) on push to `main`. There is no GitHub Actions workflow. There is no test or lint setup; `npm run astro check` type-checks `.astro`/TS files.

## Commands

- `npm run build` — static build to `dist/` (also validates content/image references)
- `npm run preview` — serve the production build
- `npm run astro check` — type-check
- `npm run add-photos` — import photos (see below)

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Architecture

- **Flat photo collection.** `src/content.config.ts` defines a single `photos` collection (glob loader over `src/content/photos/**/*.md`). Frontmatter is `title`, `date` (capture date/time, e.g. `2026-03-14` or `2026-03-14T16:45:00`), optional `description`, optional `location` (e.g. `Watamu, Kenya`; shown instead of the title wherever a photo is labelled), and `image` (a path relative to the `.md` file into `src/assets/photos/`, validated by Astro's `image()` helper at build time). There are no albums or `featured` flag.
- **README.md is stale.** It still describes an earlier design with albums (`src/content/albums/`, `/albums/` and `/photos/<album>/<photo>/` routes, `Header`/`Footer` components, `featured`). Those were removed; trust the code and this file, not the README.
- **Data layer** is `src/lib/photos.ts`: `photoSlug` (filename without extension; the grid item's `id`), `photoLabel` (location, else title), `photoMonthYear`, and `getAllPhotos`. Photos are sorted by frontmatter `date`, newest first, with filename (descending, numeric-aware) as the tiebreaker, so `date` determines display order everywhere. `add-photos` fills `date` from EXIF.
- **Pages** (`src/pages/`): `index.astro` (grid + lightbox; there are no per-photo detail pages), `404.astro`, plus `rss.xml.ts` and `robots.txt.ts`. Sitemap comes from `@astrojs/sitemap`.
- **Components**: `ResponsiveImage.astro` wraps Astro's `<Image />` (responsive layout + blurred placeholder); `PhotoGrid.astro` renders thumbnails as real links to the full-size image (it reads image dimensions via Astro's private `clone`, because reading any property of the imported image makes Astro copy the multi-MB original into `dist/`); `Lightbox.astro` is a custom element around a native `<dialog>` and is the only client-side JS on the site — keep everything else zero-JS and keep the grid usable without JS. In `astro dev` only, the lightbox shows a location text box that POSTs to `/__dev/location`, a Vite middleware in `astro.config.mjs` that rewrites the photo's `.md` frontmatter (it doesn't exist in builds). The same plugin drops the dev server's full-page reload for ~5s after a save so the lightbox isn't disturbed; the grid picks up the new text on the next manual refresh. Lightbox behaviour: click a thumbnail to open, click the photo to zoom to full size (drag/scroll to pan), click outside or Esc to zoom out then close, ‹ › / arrow keys / swipe to page.
- `public/_headers` gives hashed `/_astro/*` files a one-year immutable Cache-Control on Cloudflare. Astro's resized-image cache lives in `node_modules/.astro`; enable the build cache in Workers Builds settings so only new photos are processed.
- `astro.config.mjs` has `SITE_URL = 'https://www.baked-peach.co.uk'`, which feeds sitemap, RSS, canonical and OG URLs.

## Adding photos

Select photos in Photos.app, then run:

```
npm run add-photos
```

This exports the current Photos.app selection (via `scripts/export-selection.applescript`), reads each file's EXIF capture date, scales it down to a 3840px-long-edge JPEG master (quality 95, EXIF and colour profile kept; HEIC converted; JPEGs already that small are copied untouched), and writes both the image into `src/assets/photos/` and the matching `src/content/photos/<slug>.md` entry. Full-size camera files stay out of git to keep pushes and clones small. The site serves at most 2560px, so this costs no visible quality. Pass `--location "Watamu, Kenya"` (before or after the folder path) to set `location` on every photo imported. Titles are guessed from the original filenames — edit the generated `.md` files afterward for real titles/descriptions.

The first run prompts macOS to grant the terminal Automation permission to control Photos (System Settings → Privacy & Security → Automation).

To import already-exported images from a folder instead of Photos.app, pass the folder path: `npm run add-photos -- /path/to/folder`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
