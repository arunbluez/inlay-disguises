import { useDisguiseFetch, useDisguiseStorage, type DisguiseStorage } from '@inlay/disguise-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Linking } from 'react-native';

import {
  loadLayout,
  loadSaved,
  loadSourcesOff,
  loadStories,
  saveLayout,
  saveSaved,
  saveSourcesOff,
  storeStories,
  type Layout,
} from '../feeds/cache';
import { allowedHosts, sourceById, sources, type Topic } from '../feeds/defaults';
import { fetchFeeds } from '../feeds/fetchFeeds';
import type { Story } from '../feeds/parse';
import { isHttps } from '../feeds/url';
import { createImages, type Images } from '../images';
import { strings } from '../strings';

export type Screen = 'feed' | 'saved' | 'settings' | 'sources';

export type TopicFilter = Topic | 'all';

export interface State {
  screen: Screen;
  topic: TopicFilter;
  /** The Search field, as typed. */
  query: string;
  /** The cache, newest first: every source's stories, including sources switched off. */
  stories: Story[];
  saved: Story[];
  /** Ids of the sources switched off. */
  off: string[];
  layout: Layout;
  refreshing: boolean;
  toast: string | null;
  /** Bumped by every reset, so the screens start over (scroll position included). */
  epoch: number;
}

type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'topic'; topic: TopicFilter }
  | { type: 'query'; query: string }
  | { type: 'refreshing' }
  | { type: 'refreshed'; stories: Story[] }
  | { type: 'saved'; saved: Story[] }
  | { type: 'off'; off: string[] }
  | { type: 'layout'; layout: Layout }
  | { type: 'toast'; toast: string | null }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen };
    case 'topic':
      return { ...state, topic: action.topic };
    case 'query':
      return { ...state, query: action.query };
    case 'refreshing':
      return { ...state, refreshing: true };
    case 'refreshed':
      return { ...state, refreshing: false, stories: action.stories };
    case 'saved':
      return { ...state, saved: action.saved };
    case 'off':
      return { ...state, off: action.off };
    case 'layout':
      return { ...state, layout: action.layout };
    case 'toast':
      return { ...state, toast: action.toast };
    case 'reset':
      return {
        ...state,
        screen: 'feed',
        topic: 'all',
        query: '',
        refreshing: false,
        toast: null,
        epoch: state.epoch + 1,
      };
  }
}

function initialState(storage: DisguiseStorage): State {
  return {
    screen: 'feed',
    topic: 'all',
    query: '',
    stories: loadStories(storage),
    saved: loadSaved(storage),
    off: loadSourcesOff(storage),
    layout: loadLayout(storage),
    refreshing: false,
    toast: null,
    epoch: 0,
  };
}

/** The stories Feed and Shorts show: sources switched on, in the chosen topic. */
export function feedStories({ stories, off, topic }: State): Story[] {
  return stories.filter((story) => {
    const source = sourceById(story.source);
    return (
      source !== undefined &&
      !off.includes(source.id) &&
      (topic === 'all' || source.topic === topic)
    );
  });
}

/** Lower case without accents, so "Café" finds "cafe". */
function folded(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Stories from sources switched on whose title or gist contains the query, in any topic. */
export function searchStories(state: State): Story[] {
  const query = folded(state.query.trim());
  if (query === '') return [];
  return feedStories({ ...state, topic: 'all' }).filter((story) =>
    folded(`${story.title} ${story.gist}`).includes(query),
  );
}

export interface Store {
  state: State;
  /** Story images, in memory only. */
  images: Images;
  go(screen: Screen): void;
  setTopic(topic: TopicFilter): void;
  setQuery(query: string): void;
  /** Fetches the sources switched on and merges their stories into the cache. */
  refresh(): void;
  isSaved(story: Story): boolean;
  /** Saves the story for later, or removes it from Saved. */
  toggleSaved(story: Story): void;
  setSourceOn(id: string, on: boolean): void;
  setLayout(layout: Layout): void;
  /** Opens the article in the system browser; a link that isn't `https:` does nothing. */
  open(story: Story): void;
  dismissToast(): void;
  /**
   * Back to Feed (in the chosen layout) with the Search field empty, the topic at All and no
   * images held; a refresh still in flight ends without effect. Registered with `onReset`.
   */
  reset(): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storage = useDisguiseStorage();
  const fetch = useDisguiseFetch();
  const [images] = useState(() => createImages(fetch, allowedHosts));
  const [state, dispatch] = useReducer(reducer, storage, initialState);
  // Async work checks the generation when it ends: `reset` bumps it, so a refresh started before
  // a reset ends without effect.
  const generation = useRef(0);
  // The generation of the refresh in flight, so a pull while one runs doesn't start another.
  const refreshingAt = useRef<number | null>(null);

  const toast = useCallback((message: string) => dispatch({ type: 'toast', toast: message }), []);
  // Stable, so the toast's dismiss timer isn't restarted by every render.
  const dismissToast = useCallback(() => dispatch({ type: 'toast', toast: null }), []);

  const refresh = useCallback(() => {
    const started = generation.current;
    if (refreshingAt.current === started) return;
    refreshingAt.current = started;
    dispatch({ type: 'refreshing' });
    const off = loadSourcesOff(storage);
    void fetchFeeds(
      fetch,
      sources.filter((source) => !off.includes(source.id)),
    ).then(({ stories, failed }) => {
      if (generation.current !== started) return;
      refreshingAt.current = null;
      dispatch({ type: 'refreshed', stories: storeStories(storage, stories) });
      if (failed.length > 0) toast(strings.feed.refreshFailed);
    });
  }, [fetch, storage, toast]);

  // Refresh on open; nothing fetches in the background.
  useEffect(() => {
    refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);

  const reset = useCallback(() => {
    generation.current += 1;
    refreshingAt.current = null;
    images.clear();
    dispatch({ type: 'reset' });
  }, [images]);

  const store = useMemo<Store>(() => {
    const isSaved = (story: Story) => state.saved.some((saved) => saved.id === story.id);
    return {
      state,
      images,
      go: (screen) => dispatch({ type: 'go', screen }),
      setTopic: (topic) => dispatch({ type: 'topic', topic }),
      setQuery: (query) => dispatch({ type: 'query', query }),
      refresh,
      isSaved,
      toggleSaved: (story) => {
        const saved = isSaved(story)
          ? state.saved.filter((kept) => kept.id !== story.id)
          : [story, ...state.saved];
        saveSaved(storage, saved);
        dispatch({ type: 'saved', saved });
        if (!isSaved(story)) toast(strings.story.saved);
      },
      setSourceOn: (id, on) => {
        const off = on ? state.off.filter((other) => other !== id) : [...state.off, id];
        saveSourcesOff(storage, off);
        dispatch({ type: 'off', off });
        if (on) refresh();
      },
      setLayout: (layout) => {
        saveLayout(storage, layout);
        dispatch({ type: 'layout', layout });
      },
      open: (story) => {
        if (isHttps(story.link)) Linking.openURL(story.link).catch(() => undefined);
      },
      dismissToast,
      reset,
    };
  }, [state, images, storage, refresh, reset, toast, dismissToast]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
