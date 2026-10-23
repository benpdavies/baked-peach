// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// TODO: replace with your real domain once you have one — required for
// correct sitemap/RSS URLs and Open Graph tags.
const SITE_URL = 'https://example.com';

// Dev-only: lets the lightbox's location box save straight into a photo's
// .md frontmatter. `configureServer` never runs for `astro build`, so none of
// this reaches production.
/** @returns {import('vite').Plugin} */
function editLocationInDev() {
  return {
    name: 'edit-location-in-dev',
    configureServer(server) {
      // Astro reloads the page when a content file changes. The lightbox already
      // shows the new text, so drop reloads that follow one of our own saves.
      let lastSave = 0;
      /** @param {any} channel */
      const dropReloadsAfterSave = (channel) => {
        const send = channel.send.bind(channel);
        channel.send = (/** @type {any[]} */ ...args) => {
          const message = args[0];
          if (message && typeof message === 'object' && message.type === 'full-reload' && Date.now() - lastSave < 5000) return;
          return send(...args);
        };
      };
      dropReloadsAfterSave(server.environments.client.hot);
      dropReloadsAfterSave(server.ws);

      server.middlewares.use('/__dev/location', async (req, res) => {
        /** @type {(status: number, body: object) => void} */
        const reply = (status, body) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return reply(405, { error: 'POST only' });
        try {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          const { slug, location } = JSON.parse(raw);
          if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug) || typeof location !== 'string') {
            return reply(400, { error: 'Bad request' });
          }
          const file = path.join(server.config.root, 'src/content/photos', `${slug}.md`);
          const source = await readFile(file, 'utf8');
          const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (!match) return reply(500, { error: 'No frontmatter in ' + slug });

          lastSave = Date.now();
          const value = location.trim();
          // Drop any existing location line, then add the new one after `date`.
          const lines = match[1].split(/\r?\n/).filter((line) => !/^location\s*:/.test(line));
          if (value) {
            const at = lines.findIndex((line) => /^date\s*:/.test(line)) + 1;
            lines.splice(at, 0, `location: ${JSON.stringify(value)}`);
          }
          await writeFile(file, source.replace(match[1], lines.join('\n')));
          reply(200, { ok: true });
        } catch (err) {
          reply(500, { error: String(err) });
        }
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  vite: { plugins: [editLocationInDev()] },
  image: {
    // Raise the default remote/service limits a touch; all images here are
    // local so this mainly affects build concurrency, not correctness.
    responsiveStyles: true,
  },
});
