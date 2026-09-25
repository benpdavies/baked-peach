import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Album metadata lives as plain data files (no body content needed).
// One file per album: src/content/albums/<slug>.json
const albums = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Order albums on the /albums index; lower first. Defaults to alphabetical.
    order: z.number().optional(),
  }),
});

// One markdown entry per photo, grouped into folders per album purely for
// editor convenience — the `album` frontmatter field (not the folder path)
// is the source of truth for which album a photo belongs to.
const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      album: reference('albums'),
      date: z.coerce.date(),
      description: z.string().optional(),
      // Path to the source image in src/assets/photos/** — Astro validates
      // this at build time and gives us width/height/format for free.
      image: image(),
      // Hand-picked photos to surface on the home page grid.
      featured: z.boolean().default(false),
    }),
});

export const collections = { albums, photos };
