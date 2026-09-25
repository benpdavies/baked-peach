import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllPhotos, photoUrl } from '../lib/photos';

export async function GET(context: APIContext) {
  const photos = await getAllPhotos();

  return rss({
    title: 'Your Name Photography',
    description: 'Latest photos.',
    site: context.site!,
    items: photos.map((photo) => ({
      title: photo.data.title,
      description: photo.data.description,
      pubDate: photo.data.date,
      link: photoUrl(photo),
    })),
  });
}
