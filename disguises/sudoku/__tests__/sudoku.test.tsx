// Sudoku under the testkit's MockHost. Nothing is replaced: the engine, the SDK, storage and every
// screen are real. Today's puzzle depends on the date, so each test builds the expected puzzle
// with the same engine.
import { satisfiesMinSdk, themes } from '@inlay/disguise-sdk';
import { createMockHost, MockHost, renderDisguise, type MockHostValue } from '@inlay/testkit';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import packageJson from '../package.json';
import sudoku from '../src';
import { dailyPuzzle, dayOf } from '../src/engine/daily';
import { generate, type Puzzle } from '../src/engine/generator';
import type { Level } from '../src/engine/grade';
import { GAME_KEY, loadGame, loadSettings, loadStats } from '../src/state/storage';

const palette = themes.sudoku.light;

function todaysPuzzle(level: Level): Puzzle {
  return generate(dailyPuzzle(dayOf(new Date()), level));
}

/** The empty cells of `puzzle`, in order. */
function openCells(puzzle: Puzzle): number[] {
  return puzzle.givens.flatMap((digit, cell) => (digit === 0 ? [cell] : []));
}

/** A digit that is not the solution of `cell`. */
function wrongDigit(puzzle: Puzzle, cell: number): number {
  return (puzzle.solution[cell]! % 9) + 1;
}

async function press(testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

async function enter(cell: number, digit: number) {
  await press(`sudoku-cell-${cell}`);
  await press(`sudoku-key-${digit}`);
}

function cellText(cell: number): string {
  const node = screen.getByTestId(`sudoku-cell-${cell}`);
  return (
    within(node)
      .queryByText(/^[1-9]$/)
      ?.props.children?.toString() ?? ''
  );
}

/** Play today's puzzle, then wait for the board to replace its placeholder. */
async function openToday() {
  await press('sudoku-play-today');
  await screen.findByTestId('sudoku-grid');
}

async function playToday(level: Level = 'easy') {
  await press(`sudoku-level-${level}`);
  await openToday();
  return todaysPuzzle(level);
}

/** Enters the solution in every empty cell. */
async function solve(puzzle: Puzzle) {
  for (const cell of openCells(puzzle)) await enter(cell, puzzle.solution[cell]!);
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Sudoku manifest', () => {
  it('is the Pro Sudoku disguise with its version, icons, trigger sentence and no hosts', () => {
    expect(sudoku).toMatchObject({
      id: 'sudoku',
      name: 'Sudoku',
      version: packageJson.version,
      triggerDescription: 'Type your code as the puzzle number, then hold Play',
      allowedHosts: [],
      tier: 'pro',
    });
    expect(satisfiesMinSdk(sudoku)).toBe(true);
    expect(Object.keys(sudoku.icon.ios)).toEqual(['light', 'dark', 'tinted']);
    expect(Object.keys(sudoku.icon.android)).toEqual(['foreground', 'background', 'monochrome']);
  });
});

describe('Today', () => {
  it('shows the daily puzzle for the picked level, an empty streak and empty totals', async () => {
    await renderDisguise(sudoku);
    const day = dayOf(new Date());
    expect(screen.getByTestId('sudoku-today-number')).toHaveTextContent(
      `Puzzle #${dailyPuzzle(day, 'easy').toLocaleString('en-US')}`,
    );
    await press('sudoku-level-expert');
    expect(screen.getByTestId('sudoku-today-number')).toHaveTextContent(
      `Puzzle #${dailyPuzzle(day, 'expert').toLocaleString('en-US')}`,
    );
    expect(screen.getByTestId('sudoku-streak')).toHaveTextContent('0-day streak');
    expect(screen.getByTestId('sudoku-total-solved')).toHaveTextContent('Solved0');
    expect(screen.getByTestId('sudoku-total-best')).toHaveTextContent('Best—');
    expect(screen.getByTestId('sudoku-tabs-today')).toBeTruthy();
  });

  it('opens today’s puzzle at the picked level on the board', async () => {
    await renderDisguise(sudoku);
    const puzzle = await playToday('hard');
    expect(screen.getByTestId('sudoku-board-number')).toHaveTextContent(
      `#${puzzle.n.toLocaleString('en-US')}`,
    );
    expect(screen.getByTestId('sudoku-board-level')).toHaveTextContent('Hard');
    puzzle.givens.forEach((digit, cell) => {
      expect(cellText(cell)).toBe(digit === 0 ? '' : String(digit));
    });
    expect(screen.queryByTestId('sudoku-tabs')).toBeNull();
  });
});

describe('Board', () => {
  it('comes up as an empty placeholder while the puzzle is built; a reset cancels the build', async () => {
    jest.useFakeTimers();
    const { host } = await renderDisguise(sudoku);
    const puzzle = todaysPuzzle('easy');
    await press('sudoku-play-today');
    expect(screen.getByTestId('sudoku-grid-placeholder')).toBeTruthy();
    expect(screen.getByTestId('sudoku-board-number')).toHaveTextContent(
      `#${puzzle.n.toLocaleString('en-US')}`,
    );
    expect(screen.getByTestId('sudoku-board-level')).toHaveTextContent('Easy');

    await act(() => host.reset());
    await act(() => jest.runOnlyPendingTimers());
    expect(screen.getByTestId('sudoku-today')).toBeTruthy();
    expect(loadGame(host.storage)).toBeNull();

    await press('sudoku-play-today');
    await act(() => jest.runOnlyPendingTimers());
    expect(screen.getByTestId('sudoku-grid')).toBeTruthy();
    expect(loadGame(host.storage)!.n).toBe(puzzle.n);
  });

  it('enters and clears digits; givens do not change', async () => {
    await renderDisguise(sudoku);
    const puzzle = await playToday();
    const [cell] = openCells(puzzle);
    const given = puzzle.givens.findIndex((digit) => digit !== 0);

    await enter(cell!, 4);
    expect(cellText(cell!)).toBe('4');
    await press('sudoku-key-4'); // the same digit again takes it out
    expect(cellText(cell!)).toBe('');
    await enter(cell!, 7);
    await press('sudoku-erase');
    expect(cellText(cell!)).toBe('');

    await enter(given, wrongDigit(puzzle, given));
    expect(cellText(given)).toBe(String(puzzle.givens[given]));
  });

  it('notes mode pencils digits in and out, and a digit replaces the notes', async () => {
    await renderDisguise(sudoku);
    const puzzle = await playToday();
    const [cell] = openCells(puzzle);

    await press(`sudoku-cell-${cell}`);
    await press('sudoku-notes');
    expect(screen.getByTestId('sudoku-notes')).toBeSelected();
    await press('sudoku-key-1');
    await press('sudoku-key-3');
    await press('sudoku-key-5');
    await press('sudoku-key-3');
    const notes = screen.getByTestId(`sudoku-notes-${cell}`);
    expect(within(notes).getByText('1')).toBeTruthy();
    expect(within(notes).getByText('5')).toBeTruthy();
    expect(within(notes).queryByText('3')).toBeNull();

    await press('sudoku-notes');
    await press('sudoku-key-8');
    expect(cellText(cell!)).toBe('8');
    expect(screen.queryByTestId(`sudoku-notes-${cell}`)).toBeNull();
  });

  it('undo and redo step through moves; a new move clears redo', async () => {
    const { host } = await renderDisguise(sudoku);
    const puzzle = await playToday();
    const [a, b] = openCells(puzzle);

    await enter(a!, 2);
    await enter(b!, 6);
    await press('sudoku-undo');
    expect(cellText(b!)).toBe('');
    await press('sudoku-undo');
    expect(cellText(a!)).toBe('');
    await press('sudoku-undo'); // nothing left: no change
    await press('sudoku-redo');
    expect(cellText(a!)).toBe('2');
    await enter(b!, 9);
    await press('sudoku-redo'); // cleared by the new move
    expect(cellText(b!)).toBe('9');
    const stored = loadGame(host.storage)!;
    expect(stored.undo).toHaveLength(2);
    expect(stored.redo).toHaveLength(0);
  });

  it('hint fills the selected cell with its solution, or the first open cell', async () => {
    await renderDisguise(sudoku);
    const puzzle = await playToday();
    const cells = openCells(puzzle);
    const picked = cells[5]!;

    await press(`sudoku-cell-${picked}`);
    await press('sudoku-hint');
    expect(cellText(picked)).toBe(String(puzzle.solution[picked]));

    await press('sudoku-hint'); // the selected cell is right now, so the first open cell
    expect(cellText(cells[0]!)).toBe(String(puzzle.solution[cells[0]!]));
  });

  it('shows a wrong digit in the danger colour unless Highlight mistakes is off', async () => {
    await renderDisguise(sudoku);
    const puzzle = await playToday();
    const [cell] = openCells(puzzle);
    const wrong = wrongDigit(puzzle, cell!);
    const digit = () => within(screen.getByTestId(`sudoku-cell-${cell}`)).getByText(String(wrong));

    await enter(cell!, wrong);
    expect(digit()).toHaveStyle({ color: palette.danger });

    await press('sudoku-board-back');
    await press('sudoku-tabs-settings');
    await press('sudoku-setting-mistakes');
    await press('sudoku-tabs-today');
    await openToday();
    expect(digit()).toHaveStyle({ color: palette.deep });
  });

  it('the timer counts while the board is open, and stops on pause and in the background', async () => {
    jest.useFakeTimers();
    let onChange: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      onChange = listener;
      return { remove: () => undefined };
    });
    await renderDisguise(sudoku);
    await playToday();
    const timer = () => screen.getByTestId('sudoku-timer');

    await act(() => jest.advanceTimersByTime(3000));
    expect(timer()).toHaveTextContent('0:03');

    await press('sudoku-pause');
    expect(screen.getByTestId('sudoku-paused')).toBeTruthy();
    expect(screen.queryByTestId('sudoku-grid')).toBeNull();
    await act(() => jest.advanceTimersByTime(5000));
    expect(timer()).toHaveTextContent('0:03');
    await press('sudoku-resume');

    await act(() => onChange!('background'));
    await act(() => jest.advanceTimersByTime(60_000));
    await act(() => onChange!('active'));
    await act(() => jest.advanceTimersByTime(2000));
    expect(timer()).toHaveTextContent('0:05');

    // Leaving the board stops it too.
    await press('sudoku-board-back');
    await act(() => jest.advanceTimersByTime(10_000));
    await openToday();
    expect(timer()).toHaveTextContent('0:05');
  });

  it('drops the timer from the board when Show timer is off', async () => {
    const { host } = await renderDisguise(sudoku);
    await press('sudoku-tabs-settings');
    await press('sudoku-setting-showTimer');
    expect(loadSettings(host.storage).showTimer).toBe(false);
    await press('sudoku-tabs-today');
    await playToday();
    expect(screen.queryByTestId('sudoku-timer')).toBeNull();
  });
});

describe('Completion', () => {
  it('a solved board shows Completion and updates the streak, totals and stats', async () => {
    jest.useFakeTimers(); // no play time passes, so the time reads 0:00
    const { host } = await renderDisguise(sudoku);
    const puzzle = await playToday('easy');
    await solve(puzzle);

    expect(screen.getByTestId('sudoku-completion')).toBeTruthy();
    expect(screen.getByTestId('sudoku-completion-time')).toHaveTextContent('0:00');
    expect(screen.getByTestId('sudoku-completion-puzzle')).toHaveTextContent(
      `Puzzle #${puzzle.n.toLocaleString('en-US')} · Easy`,
    );
    expect(screen.getByTestId('sudoku-completion-best')).toHaveTextContent('BestNew best');
    expect(screen.getByTestId('sudoku-completion-streak')).toHaveTextContent('Streak1-day streak');
    expect(host.storage.getString(GAME_KEY)).toBeUndefined();
    const stats = loadStats(host.storage);
    expect(stats.levels.easy.solved).toBe(1);
    expect(stats.days).toEqual([dayOf(new Date())]);

    await press('sudoku-done');
    expect(screen.getByTestId('sudoku-streak')).toHaveTextContent('1-day streak');
    expect(screen.getByTestId('sudoku-total-solved')).toHaveTextContent('Solved1');
    const weekday = (new Date().getDay() + 6) % 7;
    expect(screen.getByTestId(`sudoku-week-${weekday}-done`)).toBeTruthy();

    await press('sudoku-tabs-stats');
    expect(screen.getByTestId('sudoku-chart')).toBeTruthy();
    expect(screen.getByTestId('sudoku-stats-easy')).toHaveTextContent('Easy10:000:00');
    expect(screen.getByTestId('sudoku-stats-hard')).toHaveTextContent('Hard0——');
  });
});

describe('Stats and Settings', () => {
  it('Stats says there are no games yet on a fresh install', async () => {
    await renderDisguise(sudoku);
    await press('sudoku-tabs-stats');
    expect(screen.getByTestId('sudoku-stats-empty')).toHaveTextContent(
      'No games yetYour times will show here after a puzzle.',
    );
    expect(screen.queryByTestId('sudoku-chart')).toBeNull();
  });

  it('About shows the name, version and licence only', async () => {
    await renderDisguise(sudoku);
    await press('sudoku-tabs-settings');
    const about = screen.getByTestId('sudoku-about');
    expect(about).toHaveTextContent(`NameSudokuVersion${packageJson.version}LicenceApache-2.0`);
    expect(about).not.toHaveTextContent(/https?:|www\.|@|\.com/);
  });

  it('How to play opens a sheet with the rules', async () => {
    await renderDisguise(sudoku);
    await press('sudoku-tabs-settings');
    await press('sudoku-rules');
    expect(screen.getByTestId('sudoku-rules-sheet')).toHaveTextContent(/every 3 × 3 box/);
  });
});

describe('Reset and persistence', () => {
  /** Renders Sudoku on `host`, as a fresh launch with the host's storage. */
  async function launch(host: MockHostValue) {
    return render(<MockHost manifest={sudoku} host={host} />);
  }

  it('host reset returns to Today and clears the selection and the open sheet; the game stays', async () => {
    const { host } = await renderDisguise(sudoku);
    const puzzle = await playToday();
    const [cell] = openCells(puzzle);
    await enter(cell!, 5);
    await press('sudoku-notes');

    await act(() => host.reset());
    expect(screen.getByTestId('sudoku-today')).toBeTruthy();

    await openToday();
    expect(cellText(cell!)).toBe('5');
    expect(screen.getByTestId(`sudoku-cell-${cell}`)).not.toBeSelected();
    expect(screen.getByTestId('sudoku-notes')).not.toBeSelected();

    await press('sudoku-board-back');
    await press('sudoku-tabs-settings');
    await press('sudoku-rules');
    await act(() => host.reset());
    expect(screen.getByTestId('sudoku-today')).toBeTruthy();
    await press('sudoku-tabs-settings');
    expect(screen.queryByTestId('sudoku-rules-sheet')).toBeNull();
  });

  it('the game in progress, stats and settings survive a relaunch', async () => {
    const host = createMockHost({ theme: 'sudoku' });
    const first = await launch(host);
    const puzzle = await playToday('medium');
    const [cell] = openCells(puzzle);
    await enter(cell!, 3);
    await press('sudoku-board-back');
    await press('sudoku-tabs-settings');
    await press('sudoku-setting-matching');
    await first.unmount();

    await launch(host);
    await playToday('medium');
    expect(cellText(cell!)).toBe('3');
    expect(loadGame(host.storage)!.n).toBe(puzzle.n);
    expect(loadSettings(host.storage).matching).toBe(false);
  });

  it('opening another puzzle starts it fresh and replaces the saved game', async () => {
    const { host } = await renderDisguise(sudoku);
    const easy = await playToday('easy');
    await enter(openCells(easy)[0]!, 1);
    await press('sudoku-board-back');
    const hard = await playToday('hard');
    expect(openCells(hard).every((cell) => cellText(cell) === '')).toBe(true);
    expect(loadGame(host.storage)!.n).toBe(hard.n);
  });
});
