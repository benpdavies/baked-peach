import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One markdown entry per photo.
const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // When the photo was taken, e.g. `2026-03-14` or `2026-03-14T16:45:00`.
      // Newest first is decided by this.
      date: z.coerce.date(),
      description: z.string().optional(),
      // Where it was taken, e.g. `Watamu, Kenya`. Shown instead of the title.
      location: z.string().optional(),
      // Path to the source image in src/assets/photos/** — Astro validates
      // this at build time and gives us width/height/format for free.
      image: image(),
    }),
});

export const collections = { photos };
