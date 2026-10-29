# Photography Portfolio

A static photography portfolio built with [Astro](https://astro.build), deployed to Cloudflare Workers, with code hosted on GitHub.

## Running locally

```sh
npm install
npm run dev       # http://localhost:4321
```

Other useful commands:

| Command           | Action                                    |
| :----------------- | :----------------------------------------- |
| `npm run build`    | Build the static site to `./dist/`         |
| `npm run preview`  | Preview the production build locally       |
| `npm run astro check` | Type-check `.astro` files               |

## Project structure

```
src/
├── assets/photos/<album>/<photo>.jpg   # actual image files, grouped by album
├── content/
│   ├── albums/<album>.json             # album metadata (title, description, order)
│   └── photos/<album>/<photo>.md       # one entry per photo, frontmatter only
├── content.config.ts                   # collection schemas
├── components/                         # PhotoGrid, ResponsiveImage, Lightbox, Header, Footer
├── layouts/BaseLayout.astro            # <head>, SEO/OG tags, header/footer
├── lib/photos.ts                       # data-layer helpers (sorting, URLs, prev/next)
└── pages/                              # routes — see "Pages" below
```

**Pages:**
- `/` — home grid (featured photos, or the latest if nothing is marked featured)
- `/albums/` — index of all albums
- `/albums/<album>/` — grid for one album
- `/photos/<album>/<photo>/` — full-size photo with description and prev/next
- `/about/` — bio/contact (placeholder content — edit `src/pages/about.astro`)
- `/rss.xml`, `/sitemap-index.xml`, `/robots.txt` — generated automatically

## Adding new photos

1. **Add the image file** to `src/assets/photos/<album>/`, using a new folder name for a new album.
2. **Add a matching content entry** at `src/content/photos/<album>/<same-name>.md`:

   ```md
   ---
   title: Photo Title
   album: landscapes          # must match an id in src/content/albums/
   date: 2026-01-15
   description: Optional caption text.
   image: ../../../assets/photos/landscapes/photo-title.jpg
   featured: true             # optional — surfaces it on the home page
   ---
   ```

   The `image` path is relative to the `.md` file itself. Astro validates it at build
   time — a typo or missing file fails the build rather than shipping a broken image.

3. **New album?** Also add `src/content/albums/<album>.json`:

   ```json
   { "title": "Album Title", "description": "One line about this album.", "order": 4 }
   ```

   The `album` field on a photo (not its folder location) is what actually assigns it
   to an album — folders just keep the content directory organized.

Astro automatically generates WebP thumbnails, a blurred low-res placeholder, and the
`/albums/<album>/` and `/photos/<album>/<photo>/` pages for every entry — no other
wiring needed.

### Keeping originals out of git

Full-resolution masters (RAWs, unedited exports) shouldn't go in `src/assets/photos/` —
only the images you actually want on the site should be committed. Put your working
originals in an `/originals/` folder at the project root (already in `.gitignore`),
edit/export the web-sized version into `src/assets/photos/<album>/`, and commit only that.

## Image handling

- `src/components/ResponsiveImage.astro` wraps Astro's `<Image />` with:
  - `layout="constrained"` for grid thumbnails, `layout="full-width"` for the detail view
    — Astro generates the `srcset`/`sizes` and outputs WebP automatically.
  - A blurred low-resolution placeholder (a 24px-wide version of the same image) shown
    behind the real image until it loads, then faded out.
  - `loading="lazy"` by default; the detail-page hero image passes `priority` to load eagerly.

## The lightbox

Clicking a grid thumbnail opens it full-screen via `src/components/Lightbox.astro`. It's a
plain custom element (`<photo-lightbox>`), not a UI framework component — Astro ships zero
JS by default, and this is the **only** part of the site that ships any client-side
JavaScript, by design. It uses a native `<dialog>` for the overlay (built-in focus
trapping and Escape-to-close) and adds arrow-key navigation between photos. Every
thumbnail is a real link to its `/photos/<album>/<photo>/` page, so the gallery is fully
usable with JavaScript disabled.

## Deployment

Code is hosted on GitHub; the production site is a Cloudflare Workers static-assets
site (configured in `wrangler.jsonc`). Cloudflare Workers Builds is connected to the
GitHub repo and, on every push to `main`, runs `npm run build` and `npx wrangler deploy`.
Other branches get preview URLs. There is no GitHub Actions workflow.

**One-time setup:**

1. In the Cloudflare dashboard, go to Workers & Pages → Create application → Import a
   repository, authorise the Cloudflare GitHub app, and select this repo and the `main` branch.
2. Set the Worker name to `baked-peach` (it must match `name` in `wrangler.jsonc`), the build
   command to `npm run build` and the deploy command to `npx wrangler deploy`.
3. Add a build variable `NODE_VERSION` = `22`, and optionally enable the build cache so only
   new photos are re-processed.
4. Save and deploy. Add the custom domain under the Worker's Settings → Domains & Routes.

The domain in `astro.config.mjs` (`SITE_URL`) is used to build the sitemap, RSS links,
canonical URLs, and Open Graph URLs — update it if the live domain changes.

## Not included (on purpose)

- **Analytics** — no tracking script is wired up. See the comment in
  `src/components/Footer.astro` for where to add one if you want it.
- **Comments** — none. Add a third-party embed to the photo detail page if needed.
