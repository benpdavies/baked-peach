import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllPhotos, photoLabel, photoSlug } from '../lib/photos';

export async function GET(context: APIContext) {
  const photos = await getAllPhotos();

  return rss({
    title: 'Your Name Photography',
    description: 'Latest photos.',
    site: context.site!,
    items: photos.map((photo) => ({
      title: photoLabel(photo),
      description: photo.data.description,
      pubDate: photo.data.date,
      link: `/#${photoSlug(photo)}`,
    })),
  });
}
