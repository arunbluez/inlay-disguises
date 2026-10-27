// Every piece of copy Sudoku shows, in one place. `pnpm check-words` scans this file.
import type { Level } from './engine/grade';

/** 1284 → "1,284". */
export function grouped(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 372 000 ms → "6:12"; an hour or more → "1:02:03". */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(seconds % 60)}` : `${m}:${pad(seconds % 60)}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Saturday 17 October". */
export function longDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Sat". */
export function shortDay(date: Date): string {
  return WEEKDAYS[date.getDay()]!.slice(0, 3);
}

const levels: Record<Level, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export const strings = {
  appName: 'Sudoku',
  tabs: { today: 'Today', stats: 'Stats', settings: 'Settings' },
  levels,
  number: (n: number) => `#${grouped(n)}`,
  streak: (days: number) => `${days}-day streak`,
  none: '—',
  today: {
    date: (date: Date) => `Today · ${longDate(date)}`,
    puzzle: (n: number) => `Puzzle #${grouped(n)}`,
    play: 'Play today’s puzzle',
    week: 'This week',
    /** Monday first. */
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    solved: 'Solved',
    best: 'Best',
    average: 'Average',
  },
  board: {
    back: 'Back',
    undo: 'Undo',
    redo: 'Redo',
    erase: 'Erase',
    notes: 'Notes',
    hint: 'Hint',
    pause: 'Pause',
    paused: 'Paused',
    resume: 'Resume',
    cell: (row: number, col: number, value: number) =>
      `Row ${row}, column ${col}, ${value === 0 ? 'empty' : value}`,
    key: (digit: number, left: number) => `${digit}, ${left} left`,
  },
  completion: {
    title: 'Solved',
    puzzle: (n: number, level: Level) => `Puzzle #${grouped(n)} · ${levels[level]}`,
    best: 'Best',
    newBest: 'New best',
    streak: 'Streak',
    done: 'Done',
  },
  stats: {
    title: 'Stats',
    recent: 'Last 7 puzzles · minutes',
    emptyTitle: 'No games yet',
    emptyBody: 'Your times will show here after a puzzle.',
    level: 'Difficulty',
    solved: 'Solved',
    best: 'Best',
    average: 'Average',
  },
  settings: {
    title: 'Settings',
    game: 'Game',
    showTimer: 'Show timer',
    matching: 'Highlight matching numbers',
    mistakes: 'Highlight mistakes',
    rules: 'How to play',
    rulesBody:
      'Fill the grid so every row, every column and every 3 × 3 box holds the digits 1 to 9 once each. Tap a cell, then a number. Notes lets you pencil in the digits a cell could hold. Every puzzle has one solution.',
    about: 'About',
    name: 'Name',
    version: 'Version',
    licence: 'Licence',
    licenceValue: 'Apache-2.0',
  },
} as const;
