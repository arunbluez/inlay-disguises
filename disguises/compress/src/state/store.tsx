import { useDisguiseStorage, useTrigger, type DisguiseStorage } from '@inlay/disguise-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import {
  compressPhoto,
  MAX_ENCODES,
  type Compressed,
  type OutputFormat,
  type Photo,
} from '../engine/compress';
import { pickPhotos, saveToPhotos, shareFiles } from '../engine/library';
import { strings } from '../strings';
import { targetBytes } from './format';
import {
  loadDefaults,
  loadHistory,
  recordRun,
  saveDefaults,
  type Defaults,
  type History,
} from './history';

export type Screen = 'home' | 'setup' | 'progress' | 'result' | 'history' | 'settings';

/** Digits the Target size field takes. */
export const TARGET_SIZE_MAX_DIGITS = 8;

export interface Progress {
  /** 0-based index of the photo being compressed. */
  index: number;
  total: number;
  /** 0–1 over the whole run. */
  fraction: number;
}

export interface RunResult {
  photos: number;
  before: number;
  after: number;
  outputs: Compressed[];
}

export interface State {
  screen: Screen;
  photos: Photo[];
  quality: number;
  format: OutputFormat;
  /** Digits as typed, at most `TARGET_SIZE_MAX_DIGITS`. */
  targetSize: string;
  progress: Progress | null;
  result: RunResult | null;
  toast: string | null;
  history: History;
  defaults: Defaults;
}

type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'addPhotos'; photos: Photo[] }
  | { type: 'removePhoto'; uri: string }
  | { type: 'clearPhotos' }
  | { type: 'quality'; quality: number }
  | { type: 'format'; format: OutputFormat }
  | { type: 'targetSize'; targetSize: string }
  | { type: 'start'; total: number; defaults: Defaults }
  | { type: 'progress'; progress: Progress }
  | { type: 'finish'; result: RunResult; history: History }
  | { type: 'toast'; toast: string | null }
  | { type: 'reset' };

/** Home with nothing picked, settings back at the defaults; history and defaults are kept. */
function home(state: Pick<State, 'history' | 'defaults'>): State {
  return {
    screen: 'home',
    photos: [],
    quality: state.defaults.quality,
    format: state.defaults.format,
    targetSize: '',
    progress: null,
    result: null,
    toast: null,
    history: state.history,
    defaults: state.defaults,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen };
    case 'addPhotos': {
      const known = new Set(state.photos.map((photo) => photo.uri));
      const added = action.photos.filter((photo) => !known.has(photo.uri));
      return { ...state, screen: 'setup', photos: [...state.photos, ...added] };
    }
    case 'removePhoto':
      return { ...state, photos: state.photos.filter((photo) => photo.uri !== action.uri) };
    case 'clearPhotos':
      return { ...state, photos: [] };
    case 'quality':
      return { ...state, quality: action.quality };
    case 'format':
      return { ...state, format: action.format };
    case 'targetSize':
      return { ...state, targetSize: action.targetSize };
    case 'start':
      return {
        ...state,
        screen: 'progress',
        defaults: action.defaults,
        progress: { index: 0, total: action.total, fraction: 0 },
        result: null,
      };
    case 'progress':
      return { ...state, progress: action.progress };
    case 'finish':
      return {
        ...state,
        screen: 'result',
        progress: null,
        result: action.result,
        history: action.history,
      };
    case 'toast':
      return { ...state, toast: action.toast };
    case 'reset':
      return home(state);
  }
}

export interface Store {
  state: State;
  go(screen: Screen): void;
  /** Opens the photo picker and adds what the user picks, then shows Setup. */
  addPhotos(): void;
  removePhoto(uri: string): void;
  clearPhotos(): void;
  setQuality(quality: number): void;
  setFormat(format: OutputFormat): void;
  /** Keeps digits only, at most `TARGET_SIZE_MAX_DIGITS`. */
  setTargetSize(text: string): void;
  /** The Compress button: compresses the picked photos, or says to add some first. */
  compress(): void;
  /**
   * Compress held past the hold threshold: hands a non-empty Target size to the host, as typed.
   * Nothing else differs from a tap; the release does the normal action.
   */
  hold(): void;
  /** The finger lifts after a hold: `compress`, unless a reset came since the hold. */
  release(): void;
  /** Stops the run in progress and returns to Setup. */
  cancel(): void;
  /** Leaves Result for Home with nothing picked. */
  done(): void;
  save(): void;
  share(): void;
  dismissToast(): void;
  /**
   * Back to Home with nothing picked and an empty Target size; any run or picker still pending
   * finishes without effect. Registered with the host's `onReset`.
   */
  reset(): void;
}

const StoreContext = createContext<Store | null>(null);

function initialState(storage: DisguiseStorage): State {
  return home({ history: loadHistory(storage), defaults: loadDefaults(storage) });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const storage = useDisguiseStorage();
  const trigger = useTrigger();
  const [state, dispatch] = useReducer(reducer, storage, initialState);
  // Async work checks the generation after every await: `cancel` and `reset` bump it, so anything
  // started before them ends without effect.
  const generation = useRef(0);
  // The generation when Compress was last held; the release acts only if it is still current.
  const heldAt = useRef<number | null>(null);

  const toast = useCallback((message: string) => dispatch({ type: 'toast', toast: message }), []);
  // Stable, so the toast's dismiss timer isn't restarted by every render.
  const dismissToast = useCallback(() => dispatch({ type: 'toast', toast: null }), []);

  const addPhotos = useCallback(() => {
    const started = generation.current;
    pickPhotos().then(
      (photos) => {
        if (generation.current === started && photos.length > 0) {
          dispatch({ type: 'addPhotos', photos });
        }
      },
      () => {
        if (generation.current === started) toast(strings.setup.pickFailed);
      },
    );
  }, [toast]);

  const run = useCallback(
    async ({ photos, quality, format, targetSize, history }: State) => {
      const current = ++generation.current;
      const live = () => generation.current === current;
      const settings = { quality, format, targetBytes: targetBytes(targetSize) };
      const defaults = { quality, format };
      saveDefaults(storage, defaults);
      dispatch({ type: 'start', total: photos.length, defaults });

      const outputs: Compressed[] = [];
      try {
        for (const [index, photo] of photos.entries()) {
          const progress = (encodes: number) => {
            if (!live()) return;
            const fraction = (index + Math.min(encodes, MAX_ENCODES) / MAX_ENCODES) / photos.length;
            dispatch({ type: 'progress', progress: { index, total: photos.length, fraction } });
          };
          progress(0);
          const output = await compressPhoto(photo, settings, {
            onEncode: progress,
            isCancelled: () => !live(),
          });
          if (!output || !live()) return;
          outputs.push(output);
        }
      } catch {
        if (!live()) return;
        dispatch({ type: 'go', screen: 'setup' });
        toast(strings.setup.failed);
        return;
      }

      const before = photos.reduce((sum, photo) => sum + Math.max(photo.bytes, 0), 0);
      const after = outputs.reduce((sum, output) => sum + output.bytes, 0);
      const first = photos[0]!;
      const next = recordRun(storage, history, {
        name: photos.length === 1 ? first.name : strings.history.photos(photos.length),
        ext: first.ext,
        photos: photos.length,
        at: Date.now(),
        before,
        after,
      });
      dispatch({
        type: 'finish',
        result: { photos: photos.length, before, after, outputs },
        history: next,
      });
    },
    [storage, toast],
  );

  const reset = useCallback(() => {
    generation.current += 1;
    dispatch({ type: 'reset' });
  }, []);

  const store = useMemo<Store>(() => {
    const compress = () => {
      if (state.photos.length === 0) toast(strings.setup.noFiles);
      else void run(state);
    };
    return {
      state,
      go: (screen) => dispatch({ type: 'go', screen }),
      addPhotos,
      removePhoto: (uri) => dispatch({ type: 'removePhoto', uri }),
      clearPhotos: () => dispatch({ type: 'clearPhotos' }),
      setQuality: (quality) => dispatch({ type: 'quality', quality }),
      setFormat: (format) => dispatch({ type: 'format', format }),
      setTargetSize: (text) =>
        dispatch({
          type: 'targetSize',
          targetSize: text.replace(/\D/g, '').slice(0, TARGET_SIZE_MAX_DIGITS),
        }),
      compress,
      hold: () => {
        heldAt.current = generation.current;
        if (state.targetSize !== '') trigger.submit(state.targetSize);
      },
      release: () => {
        const held = heldAt.current;
        heldAt.current = null;
        if (held === generation.current) compress();
      },
      cancel: () => {
        generation.current += 1;
        dispatch({ type: 'go', screen: 'setup' });
      },
      done: () => dispatch({ type: 'reset' }),
      save: () => {
        const outputs = state.result?.outputs ?? [];
        saveToPhotos(outputs.map((output) => output.uri)).then(
          (saved) =>
            toast(saved ? strings.result.saved(outputs.length) : strings.result.saveFailed),
          () => toast(strings.result.saveFailed),
        );
      },
      share: () => {
        const outputs = state.result?.outputs ?? [];
        // The share sheet reports nothing useful back; a dismissed sheet is not an error.
        shareFiles(outputs.map((output) => output.uri)).catch(() => undefined);
      },
      dismissToast,
      reset,
    };
  }, [state, trigger, addPhotos, run, reset, toast, dismissToast]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
