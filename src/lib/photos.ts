import { getCollection, type CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'photos'>;
export type Album = CollectionEntry<'albums'>;

/** Filename (without extension/folder) used as the photo's URL segment. */
export function photoSlug(photo: Photo): string {
  return photo.id.split('/').pop()!;
}

export function photoUrl(photo: Photo): string {
  return `/photos/${photo.data.album.id}/${photoSlug(photo)}/`;
}

export function albumUrl(albumId: string): string {
  return `/albums/${albumId}/`;
}

function byDateDesc(a: Photo, b: Photo): number {
  return b.data.date.valueOf() - a.data.date.valueOf();
}

export async function getAllPhotos(): Promise<Photo[]> {
  const photos = await getCollection('photos');
  return photos.sort(byDateDesc);
}

export async function getAllAlbums(): Promise<Album[]> {
  const albums = await getCollection('albums');
  return albums.sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99) || a.data.title.localeCompare(b.data.title));
}

export async function getAlbumPhotos(albumId: string): Promise<Photo[]> {
  const photos = await getAllPhotos();
  return photos.filter((photo) => photo.data.album.id === albumId);
}

export async function getFeaturedPhotos(limit: number): Promise<Photo[]> {
  const photos = await getAllPhotos();
  const featured = photos.filter((photo) => photo.data.featured);
  const rest = photos.filter((photo) => !photo.data.featured);
  return [...featured, ...rest].slice(0, limit);
}

/** Previous/next within the photo's own album, ordered newest first. */
export async function getAdjacentPhotos(photo: Photo): Promise<{ prev: Photo | null; next: Photo | null }> {
  const albumPhotos = await getAlbumPhotos(photo.data.album.id);
  const index = albumPhotos.findIndex((p) => p.id === photo.id);
  return {
    prev: index > 0 ? albumPhotos[index - 1] : null,
    next: index >= 0 && index < albumPhotos.length - 1 ? albumPhotos[index + 1] : null,
  };
}
