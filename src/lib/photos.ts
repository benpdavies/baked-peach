import { getCollection, type CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'photos'>;

/** Filename (without extension/folder); identifies the photo in the grid and in dev-mode edits. */
export function photoSlug(photo: Photo): string {
  return photo.id.split('/').pop()!;
}

/** What the photo is called on screen: where it was taken, else its title. */
export function photoLabel(photo: Photo): string {
  return photo.data.location || photo.data.title;
}

/** e.g. "March 2026". UTC so the capture date doesn't shift with the build machine's timezone. */
export function photoMonthYear(photo: Photo): string {
  return photo.data.date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Newest first by the `date` in frontmatter. Photos with the same date fall
// back to filename (numeric-aware, descending) so the order is stable.
function newestFirst(a: Photo, b: Photo): number {
  return (
    b.data.date.valueOf() - a.data.date.valueOf() ||
    photoSlug(b).localeCompare(photoSlug(a), undefined, { numeric: true })
  );
}

export async function getAllPhotos(): Promise<Photo[]> {
  const photos = await getCollection('photos');
  return photos.sort(newestFirst);
}
