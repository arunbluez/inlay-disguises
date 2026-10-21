import { launchImageLibraryAsync, type ImagePickerAsset } from 'expo-image-picker';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { shareAsync } from 'expo-sharing';

import type { Photo } from './compress';

/** Upper-case type from a file name or URI, e.g. "JPG"; "IMG" when there is none. */
function extOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  const ext = match?.[1]?.toUpperCase() ?? 'IMG';
  return ext === 'JPEG' ? 'JPG' : ext;
}

/** The last path segment of a URI, without any query. */
function baseName(uri: string): string {
  return decodeURIComponent(uri.split(/[?#]/)[0]!.split('/').pop() ?? uri);
}

export function photoFromAsset(asset: ImagePickerAsset): Photo {
  const name = asset.fileName || baseName(asset.uri);
  return { uri: asset.uri, name, ext: extOf(name), bytes: asset.fileSize ?? 0 };
}

/**
 * Opens the system photo picker: photos only, several at once, no camera. Resolves the picked
 * photos (cache copies made by the picker), or none when the user backs out.
 */
export async function pickPhotos(): Promise<Photo[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    orderedSelection: true,
  });
  return result.canceled ? [] : result.assets.map(photoFromAsset);
}

/** Adds each file to the photo library. Resolves false when the user doesn't allow it. */
export async function saveToPhotos(uris: readonly string[]): Promise<boolean> {
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) return false;
  for (const uri of uris) await Asset.create(uri);
  return true;
}

/** Opens the system share sheet for each file in turn. */
export async function shareFiles(uris: readonly string[]): Promise<void> {
  for (const uri of uris) await shareAsync(uri, { mimeType: mimeOf(uri) });
}

function mimeOf(uri: string): string {
  return extOf(uri) === 'PNG' ? 'image/png' : 'image/jpeg';
}
