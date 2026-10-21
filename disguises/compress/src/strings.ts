// Every piece of copy Compress shows, in one place. `pnpm check-words` scans this file.

/** "1 photo", "3 photos" (and the same for files and compressions). */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const strings = {
  appName: 'Compress',
  tabs: { home: 'Compress', history: 'History', settings: 'Settings' },
  home: {
    savedLabel: 'Saved so far',
    across: (runs: number) => `across ${count(runs, 'compression', 'compressions')}`,
    addTitle: 'Add files',
    addSubtitle: 'Photos from your library',
    recent: 'Recent',
    seeAll: 'See all',
  },
  setup: {
    title: 'New compression',
    clear: 'Clear',
    files: (n: number) => `Files · ${n}`,
    add: 'Add',
    emptyTitle: 'No files selected',
    emptyBody: 'Add photos to begin.',
    quality: 'Quality',
    smaller: 'Smaller files',
    sharper: 'Sharper',
    format: 'Format',
    formatOriginal: 'Original',
    formatJpeg: 'JPEG',
    targetSize: 'Target size (KB)',
    targetPlaceholder: 'Optional',
    targetUnit: 'KB',
    targetHelp: 'We’ll lower quality until each file fits under this size.',
    original: 'Original',
    estimated: 'Estimated',
    none: '—',
    estimate: (size: string) => `≈ ${size}`,
    run: (n: number) => (n > 0 ? `Compress ${count(n, 'file', 'files')}` : 'Compress'),
    noFiles: 'Add files to compress',
    pickFailed: 'Couldn’t open your photos',
    failed: 'Couldn’t compress these photos',
  },
  progress: {
    title: 'Compressing',
    file: (index: number, total: number) => `File ${index} of ${total}`,
    cancel: 'Cancel',
  },
  result: {
    title: 'Done',
    done: 'Done',
    summary: (n: number, after: string, before: string) =>
      `${count(n, 'file', 'files')} ${n === 1 ? 'is' : 'are'} ${after} now, down from ${before}.`,
    before: 'Before',
    after: 'After',
    note: 'You can now delete the originals to free up space.',
    save: 'Save to Photos',
    share: 'Share',
    saved: (n: number) => (n > 1 ? `${n} files saved to Photos` : 'Saved to Photos'),
    saveFailed: 'Allow access to Photos to save',
  },
  history: {
    title: 'History',
    emptyTitle: 'No compressions yet',
    emptyBody: 'Photos you compress show up here.',
    photos: (n: number) => count(n, 'photo', 'photos'),
    today: 'Today',
    yesterday: 'Yesterday',
  },
  settings: {
    title: 'Settings',
    defaults: 'Defaults',
    quality: 'Quality',
    format: 'Format',
    about: 'About',
    name: 'Name',
    version: 'Version',
  },
} as const;
