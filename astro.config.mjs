// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: replace with your real domain once you have one — required for
// correct sitemap/RSS URLs and Open Graph tags.
const SITE_URL = 'https://example.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  image: {
    // Raise the default remote/service limits a touch; all images here are
    // local so this mainly affects build concurrency, not correctness.
    responsiveStyles: true,
  },
});
