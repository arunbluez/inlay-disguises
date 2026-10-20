import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { fitToTarget, type Encoded } from './targetSize';

/** A photo the user picked: the picker's copy in the cache, never the library original. */
export interface Photo {
  uri: string;
  name: string;
  /** Upper-case type shown in the file tile, e.g. "JPG". */
  ext: string;
  /** Size of the picked file; 0 when the system didn't say. */
  bytes: number;
}

/** What the Format row offers: keep the photo's own type, or always JPEG. */
export type OutputFormat = 'original' | 'jpeg';

export interface CompressSettings {
  /** 10–100. */
  quality: number;
  format: OutputFormat;
  /** Each output should be at most this many bytes; `undefined` for no target. */
  targetBytes?: number;
}

export interface Compressed {
  uri: string;
  bytes: number;
  /** File type of `uri`, upper case. */
  ext: string;
}

/** Lowest quality the target-size search goes down to (the slider's minimum). */
export const QUALITY_FLOOR = 10;
/** Encodes after the first while searching for a target size: enough to cover 10–100 exactly. */
export const TARGET_SEARCH_STEPS = 7;
/** Longest edge of an output, in pixels. Larger photos are scaled down while decoding. */
export const MAX_EDGE = 4096;

/** Encodes per photo at most: the first plus the search steps. */
export const MAX_ENCODES = 1 + TARGET_SEARCH_STEPS;

/** Bytes of the data a base64 string encodes. */
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

/** PNG stays PNG under "Original"; everything else (JPEG, HEIC, WebP…) is written as JPEG. */
function outputFormat(photo: Photo, format: OutputFormat): SaveFormat {
  return format === 'original' && photo.ext === 'PNG' ? SaveFormat.PNG : SaveFormat.JPEG;
}

/**
 * Re-encodes one photo: decoded at most `MAX_EDGE` on its longest side, written without its
 * metadata (the encoder never copies EXIF or location), at the chosen quality, or lower until it
 * fits the target size. PNG is lossless, so it is written once. Resolves `null` once `isCancelled`
 * returns true.
 */
export async function compressPhoto(
  photo: Photo,
  settings: CompressSettings,
  { onEncode, isCancelled }: { onEncode?: (encodes: number) => void; isCancelled: () => boolean },
): Promise<Compressed | null> {
  const format = outputFormat(photo, settings.format);
  const context = ImageManipulator.manipulate(photo.uri, {
    maxWidth: MAX_EDGE,
    maxHeight: MAX_EDGE,
  });
  try {
    const image = await context.renderAsync();
    try {
      const encode = async (quality: number): Promise<Encoded> => {
        const saved = await image.saveAsync({ compress: quality / 100, format, base64: true });
        return { uri: saved.uri, bytes: base64Bytes(saved.base64 ?? '') };
      };
      const lossless = format === SaveFormat.PNG;
      const fit = await fitToTarget(encode, {
        quality: settings.quality,
        targetBytes: lossless ? undefined : settings.targetBytes,
        floor: QUALITY_FLOOR,
        maxSteps: TARGET_SEARCH_STEPS,
        onEncode,
        isCancelled,
      });
      if (!fit) return null;
      return { uri: fit.uri, bytes: fit.bytes, ext: lossless ? 'PNG' : 'JPG' };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
