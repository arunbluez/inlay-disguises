import { useDisguiseStorage, useTrigger, type DisguiseStorage } from '@inlay/disguise-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { dailyPuzzle, dayOf } from '../engine/daily';
import { generate, MAX_PUZZLE, type Puzzle } from '../engine/generator';
import type { Level } from '../engine/grade';
import * as play from './game';
import {
  loadGame,
  loadSettings,
  loadStats,
  recordSolve,
  saveGame,
  saveSettings,
  streak,
  type Game,
  type Settings,
  type Stats,
} from './storage';

export type Screen = 'today' | 'play' | 'board' | 'completion' | 'stats' | 'settings';

/** Play puzzle # takes up to 9 digits: every puzzle number. */
export const PUZZLE_NUMBER_MAX_DIGITS = String(MAX_PUZZLE).length;

/** The puzzle a typed number opens: leading zeros dropped, and 0 opens #1. */
export function puzzleNumber(text: string): number {
  return Math.max(1, Number(text));
}

/** What the Completion screen shows about the puzzle just solved. */
export interface Solved {
  n: number;
  level: Level;
  ms: number;
  streak: number;
  /** Best time at this level, including this one. */
  bestMs: number;
}

export interface State {
  screen: Screen;
  /** The level picked on Today. */
  level: Level;
  /** The game in progress, kept across launches until it is solved. */
  game: Game | null;
  /** The number of the puzzle being built for the board; null once it is there. */
  opening: number | null;
  /** The puzzle of `game`, built when the board opens. */
  puzzle: Puzzle | null;
  selected: number | null;
  notesMode: boolean;
  paused: boolean;
  rulesOpen: boolean;
  solved: Solved | null;
  stats: Stats;
  settings: Settings;
}

type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'level'; level: Level }
  | { type: 'opening'; n: number }
  | { type: 'open'; puzzle: Puzzle }
  | { type: 'select'; cell: number }
  | { type: 'game'; game: Game; selected?: number }
  | { type: 'notesMode' }
  | { type: 'paused'; paused: boolean }
  | { type: 'tick'; ms: number }
  | { type: 'solved'; solved: Solved; stats: Stats }
  | { type: 'settings'; settings: Settings }
  | { type: 'rules'; open: boolean }
  | { type: 'reset' };

/** Today, with nothing selected or open; the game, stats and settings are kept. */
function today(state: Pick<State, 'level' | 'game' | 'stats' | 'settings'>): State {
  return {
    screen: 'today',
    level: state.level,
    game: state.game,
    opening: null,
    puzzle: null,
    selected: null,
    notesMode: false,
    paused: false,
    rulesOpen: false,
    solved: null,
    stats: state.stats,
    settings: state.settings,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen, paused: false, solved: null };
    case 'level':
      return { ...state, level: action.level };
    case 'opening':
      return {
        ...state,
        screen: 'board',
        opening: action.n,
        puzzle: null,
        selected: null,
        notesMode: false,
        paused: false,
      };
    case 'open': {
      const { puzzle } = action;
      if (state.opening !== puzzle.n) return state;
      // The game in progress resumes; any other puzzle starts fresh and replaces it.
      const game = state.game?.n === puzzle.n ? state.game : play.newGame(puzzle);
      return { ...state, opening: null, puzzle, game };
    }
    case 'select':
      return { ...state, selected: action.cell };
    case 'game':
      return { ...state, game: action.game, selected: action.selected ?? state.selected };
    case 'notesMode':
      return { ...state, notesMode: !state.notesMode };
    case 'paused':
      return { ...state, paused: action.paused };
    case 'tick':
      return state.game
        ? { ...state, game: { ...state.game, elapsedMs: state.game.elapsedMs + action.ms } }
        : state;
    case 'solved':
      return {
        ...state,
        screen: 'completion',
        game: null,
        puzzle: null,
        selected: null,
        solved: action.solved,
        stats: action.stats,
      };
    case 'settings':
      return { ...state, settings: action.settings };
    case 'rules':
      return { ...state, rulesOpen: action.open };
    case 'reset':
      return today(state);
  }
}

export interface Store {
  state: State;
  /** Switches screen; leaving the board stops its timer. */
  go(screen: Screen): void;
  setLevel(level: Level): void;
  /** Today's daily puzzle at the level picked on Today. */
  playToday(): void;
  /** Opens puzzle #n, resuming it if it is the game in progress. */
  play(n: number): void;
  /**
   * Play on Play puzzle # held past the hold threshold: hands the number to the host, as typed.
   * Nothing else differs from a tap; the release opens the puzzle.
   */
  hold(text: string): void;
  /** The finger lifts after a hold: opens puzzle `text`, unless a reset came since the hold. */
  release(text: string): void;
  select(cell: number): void;
  /** A number pad key on the selected cell. */
  press(digit: number): void;
  erase(): void;
  toggleNotes(): void;
  hint(): void;
  undo(): void;
  redo(): void;
  setPaused(paused: boolean): void;
  /** Adds time to the game in progress. */
  tick(ms: number): void;
  setSetting(key: keyof Settings, value: boolean): void;
  setRulesOpen(open: boolean): void;
  /**
   * Back to Today with nothing selected and no sheet open; the game in progress stays. Registered
   * with the host's `onReset`.
   */
  reset(): void;
}

const StoreContext = createContext<Store | null>(null);

function initialState(storage: DisguiseStorage): State {
  return today({
    level: 'easy',
    game: loadGame(storage),
    stats: loadStats(storage),
    settings: loadSettings(storage),
  });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const storage = useDisguiseStorage();
  const trigger = useTrigger();
  const [state, dispatch] = useReducer(reducer, storage, initialState);

  useEffect(() => saveGame(storage, state.game), [storage, state.game]);

  // The puzzle being built after the board placeholder is up; leaving the board cancels it.
  const building = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelBuild = useCallback(() => {
    if (building.current !== null) clearTimeout(building.current);
    building.current = null;
  }, []);

  useEffect(() => cancelBuild, [cancelBuild]);

  // Whether Play was held and not yet released; a reset in between drops the release.
  const held = useRef(false);

  const reset = useCallback(() => {
    cancelBuild();
    held.current = false;
    dispatch({ type: 'reset' });
  }, [cancelBuild]);
  const tick = useCallback((ms: number) => dispatch({ type: 'tick', ms }), []);

  const store = useMemo<Store>(() => {
    const { game, puzzle, selected, notesMode, stats, settings } = state;

    /** Takes the next game; a solved board records the solve and shows Completion. */
    const update = (next: Game, cell?: number) => {
      if (!puzzle || next === game) return;
      if (!play.isComplete(next, puzzle)) {
        dispatch({ type: 'game', game: next, selected: cell });
        return;
      }
      const day = dayOf(new Date());
      const solve = { n: next.n, level: puzzle.level, ms: next.elapsedMs, at: Date.now() };
      const nextStats = recordSolve(storage, stats, solve, day);
      dispatch({
        type: 'solved',
        stats: nextStats,
        solved: {
          ...solve,
          streak: streak(nextStats, day),
          bestMs: nextStats.levels[puzzle.level].bestMs!,
        },
      });
    };

    // Building a hard puzzle can take a few hundred ms on a slow phone, so the board comes up
    // as a placeholder first and the puzzle is built on the next turn of the JS thread.
    // (React Native 0.88 removed InteractionManager.runAfterInteractions.)
    const open = (n: number) => {
      cancelBuild();
      dispatch({ type: 'opening', n });
      building.current = setTimeout(() => {
        building.current = null;
        dispatch({ type: 'open', puzzle: generate(n) });
      }, 0);
    };

    return {
      state,
      go: (screen) => {
        cancelBuild();
        dispatch({ type: 'go', screen });
      },
      setLevel: (level) => dispatch({ type: 'level', level }),
      playToday: () => open(dailyPuzzle(dayOf(new Date()), state.level)),
      play: open,
      hold: (text) => {
        held.current = true;
        if (text !== '') trigger.submit(text);
      },
      release: (text) => {
        if (held.current) open(puzzleNumber(text));
        held.current = false;
      },
      select: (cell) => dispatch({ type: 'select', cell }),
      press: (digit) => {
        if (game && puzzle && selected !== null) {
          update(play.enter(game, puzzle, selected, digit, notesMode));
        }
      },
      erase: () => {
        if (game && puzzle && selected !== null) update(play.erase(game, puzzle, selected));
      },
      toggleNotes: () => dispatch({ type: 'notesMode' }),
      hint: () => {
        const filled = game && puzzle ? play.hint(game, puzzle, selected) : null;
        if (filled) update(filled.game, filled.cell);
      },
      undo: () => {
        if (game) update(play.undo(game));
      },
      redo: () => {
        if (game) update(play.redo(game));
      },
      setPaused: (paused) => dispatch({ type: 'paused', paused }),
      tick,
      setSetting: (key, value) => {
        const next = { ...settings, [key]: value };
        saveSettings(storage, next);
        dispatch({ type: 'settings', settings: next });
      },
      setRulesOpen: (open) => dispatch({ type: 'rules', open }),
      reset,
    };
  }, [state, storage, trigger, reset, tick, cancelBuild]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
