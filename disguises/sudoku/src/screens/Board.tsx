import {
  Button,
  fontStyle,
  layout,
  radii,
  spacing,
  states,
  strokes,
  tabularNums,
  textStyle,
  useBottomInset,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';

import { levelOf, type Puzzle } from '../engine/generator';
import { bit, boxOf, colOf, rowOf, SIZE } from '../engine/solver';
import { remaining } from '../state/game';
import type { Game } from '../state/storage';
import { useStore } from '../state/store';
import { clock, strings } from '../strings';
import {
  BackGlyph,
  EraseGlyph,
  HintGlyph,
  NotesGlyph,
  PauseGlyph,
  RedoGlyph,
  UndoGlyph,
} from './glyphs';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TIMER_STEP_MS = 1000;

/** The accent over the ground at the source's tints: the selected cell, and matching digits. */
const tint = (accent: string, dark: boolean, strong: boolean) =>
  `${accent}${(strong ? (dark ? 0x57 : 0x3d) : dark ? 0x29 : 0x1a).toString(16)}`;

/**
 * Counts play time while the board is on screen, the app is in the foreground and the game is
 * not paused; leaving the board, pausing or backgrounding the app stops it.
 */
function useTimer(running: boolean, tick: (ms: number) => void) {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setActive(next === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!running || !active) return;
    let last = Date.now();
    const step = () => {
      const now = Date.now();
      tick(now - last);
      last = now;
    };
    const interval = setInterval(step, TIMER_STEP_MS);
    return () => {
      clearInterval(interval);
      step();
    };
  }, [running, active, tick]);
}

function Header({ n, elapsedMs }: { n: number; elapsedMs: number }) {
  const { state, go, setPaused } = useStore();
  const { colors, archivo } = useHostTheme();
  const icon = (Glyph: ComponentType<{ size: number; color: string }>) => (
    <Glyph size={22} color={colors.ink} />
  );
  const iconButton = { width: layout.minHit, height: layout.minHit, borderRadius: radii.pill };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[4],
        paddingHorizontal: spacing[8],
        paddingVertical: spacing[8],
      }}
    >
      <Pressable
        testID="sudoku-board-back"
        accessibilityRole="button"
        accessibilityLabel={strings.board.back}
        onPress={() => go('today')}
        style={({ pressed }) => [
          iconButton,
          { alignItems: 'center', justifyContent: 'center' },
          pressed && { backgroundColor: colors.press },
        ]}
      >
        {icon(BackGlyph)}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          testID="sudoku-board-number"
          style={[
            textStyle('heading', 18, archivo),
            { color: colors.ink, fontVariant: [...tabularNums] },
          ]}
        >
          {strings.number(n)}
        </Text>
        <Text
          testID="sudoku-board-level"
          style={[textStyle('caption', 12, archivo), { color: colors.muted }]}
        >
          {strings.levels[levelOf(n)]}
        </Text>
      </View>
      {state.settings.showTimer ? (
        <Text
          testID="sudoku-timer"
          style={[
            textStyle('heading', 18, archivo),
            { color: colors.ink, fontVariant: [...tabularNums], paddingRight: spacing[4] },
          ]}
        >
          {clock(elapsedMs)}
        </Text>
      ) : null}
      <Pressable
        testID="sudoku-pause"
        accessibilityRole="button"
        accessibilityLabel={strings.board.pause}
        accessibilityState={{ selected: state.paused }}
        onPress={() => setPaused(!state.paused)}
        style={({ pressed }) => [
          iconButton,
          { alignItems: 'center', justifyContent: 'center' },
          pressed && { backgroundColor: colors.press },
        ]}
      >
        {icon(PauseGlyph)}
      </Pressable>
    </View>
  );
}

function Cell({ cell, puzzle, game }: { cell: number; puzzle: Puzzle; game: Game }) {
  const { state, select } = useStore();
  const { colors, archivo, scheme } = useHostTheme();
  const { selected, settings } = state;
  const value = game.values[cell]!;
  const given = puzzle.givens[cell] !== 0;
  const row = rowOf(cell);
  const col = colOf(cell);
  const related =
    selected !== null &&
    (rowOf(selected) === row || colOf(selected) === col || boxOf(selected) === boxOf(cell));
  const matching =
    settings.matching && value !== 0 && selected !== null && game.values[selected] === value;
  const wrong = settings.mistakes && !given && value !== 0 && value !== puzzle.solution[cell];
  const dark = scheme === 'dark';
  const background =
    cell === selected
      ? tint(colors.accent, dark, true)
      : matching
        ? tint(colors.accent, dark, false)
        : related
          ? colors.press
          : 'transparent';
  const notes = game.notes[cell]!;
  return (
    <Pressable
      testID={`sudoku-cell-${cell}`}
      accessibilityRole="button"
      accessibilityLabel={strings.board.cell(row + 1, col + 1, value)}
      accessibilityState={{ selected: cell === selected }}
      onPress={() => select(cell)}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
      }}
    >
      {value !== 0 ? (
        <Text
          style={[
            fontStyle(given ? 600 : 500, archivo),
            {
              fontSize: 22,
              color: given ? colors.ink : wrong ? colors.danger : colors.deep,
              fontVariant: [...tabularNums],
            },
          ]}
        >
          {value}
        </Text>
      ) : notes !== 0 ? (
        <View
          testID={`sudoku-notes-${cell}`}
          style={{ position: 'absolute', inset: 2, flexDirection: 'row', flexWrap: 'wrap' }}
        >
          {DIGITS.map((digit) => (
            <Text
              key={digit}
              style={[
                fontStyle(600, archivo),
                {
                  width: '33.33%',
                  height: '33.33%',
                  fontSize: 9,
                  lineHeight: 11,
                  textAlign: 'center',
                  color: colors.muted,
                },
              ]}
            >
              {notes & bit(digit) ? String(digit) : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The 9 × 9 frame: heavy rules between boxes, hairlines between cells. `cell` draws the content
 * of each slot; without it the frame is the empty board shown while a puzzle is being built.
 */
function Grid({ cell, testID }: { cell?: (index: number) => ReactNode; testID: string }) {
  const { colors } = useHostTheme();
  return (
    <View
      testID={testID}
      style={{
        borderWidth: strokes.rule,
        borderColor: colors.ink,
        borderRadius: radii.tile,
        overflow: 'hidden',
      }}
    >
      {DIGITS.map((_, row) => (
        <View
          key={row}
          style={{
            flexDirection: 'row',
            borderBottomWidth:
              row === SIZE - 1 ? 0 : row % 3 === 2 ? strokes.rule : strokes.hairline,
            borderBottomColor: row % 3 === 2 ? colors.ink : colors.hair2,
          }}
        >
          {DIGITS.map((__, col) => (
            <View
              key={col}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRightWidth:
                  col === SIZE - 1 ? 0 : col % 3 === 2 ? strokes.rule : strokes.hairline,
                borderRightColor: col % 3 === 2 ? colors.ink : colors.hair2,
              }}
            >
              {cell?.(row * SIZE + col)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Stands in for the grid while the game is paused, so the board can't be studied off the clock. */
function Paused() {
  const { setPaused } = useStore();
  const { colors, archivo } = useHostTheme();
  return (
    <View
      testID="sudoku-paused"
      style={{
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[16],
        borderRadius: radii.card,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={[textStyle('heading', 22, archivo), { color: colors.ink }]}>
        {strings.board.paused}
      </Text>
      <Button
        variant="secondary"
        label={strings.board.resume}
        onPress={() => setPaused(false)}
        testID="sudoku-resume"
      />
    </View>
  );
}

function Tool({
  label,
  Glyph,
  onPress,
  on = false,
  first = false,
  testID,
}: {
  label: string;
  Glyph: ComponentType<{ size: number; color: string }>;
  onPress: () => void;
  on?: boolean;
  first?: boolean;
  testID: string;
}) {
  const { colors, archivo } = useHostTheme();
  const color = on ? colors.on : colors.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: layout.row,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        borderLeftWidth: first ? 0 : strokes.hairline,
        borderLeftColor: colors.hair2,
        backgroundColor: on ? colors.accent : pressed ? colors.press : 'transparent',
      })}
    >
      <Glyph size={18} color={color} />
      <Text
        numberOfLines={1}
        style={[textStyle('caption', 13, archivo), fontStyle(600, archivo), { color }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The number keys; `left` gives how many of each digit are still to place. */
function Pad({ left: leftOf }: { left: (digit: number) => number }) {
  const { press } = useStore();
  const { colors, archivo } = useHostTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {DIGITS.map((digit) => {
        const left = leftOf(digit);
        return (
          <Pressable
            key={digit}
            testID={`sudoku-key-${digit}`}
            accessibilityRole="button"
            accessibilityLabel={strings.board.key(digit, left)}
            onPress={() => press(digit)}
            style={({ pressed }) => ({
              flex: 1,
              height: 64,
              justifyContent: 'space-between',
              paddingTop: spacing[8],
              paddingBottom: spacing[8],
              paddingLeft: 9,
              borderLeftWidth: digit === 1 ? 0 : strokes.hairline,
              borderLeftColor: colors.hair2,
              backgroundColor: pressed ? colors.press : 'transparent',
            })}
          >
            <Text
              style={[
                fontStyle(600, archivo),
                { fontSize: 28, lineHeight: 30, color: left > 0 ? colors.deep : colors.hair2 },
              ]}
            >
              {digit}
            </Text>
            <Text
              style={[
                textStyle('caption', 10, archivo),
                fontStyle(600, archivo),
                { color: colors.muted, fontVariant: [...tabularNums] },
              ]}
            >
              {left > 0 ? String(left) : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Board() {
  const { state, tick, undo, redo, erase, toggleNotes, hint } = useStore();
  const { colors } = useHostTheme();
  const bottomInset = useBottomInset();
  const { puzzle, game, paused, opening } = state;
  const ready = puzzle !== null && game !== null && game.n === puzzle.n;
  useTimer(ready && !paused, tick);
  const n = puzzle?.n ?? opening;
  if (n === null) return null;
  const playable = ready && !paused;

  return (
    <View testID="sudoku-board" style={{ flex: 1 }}>
      <Header n={n} elapsedMs={game?.n === n ? game.elapsedMs : 0} />
      <View style={{ paddingTop: spacing[16], paddingHorizontal: 14 }}>
        {!ready ? (
          <Grid testID="sudoku-grid-placeholder" />
        ) : paused ? (
          <Paused />
        ) : (
          <Grid
            testID="sudoku-grid"
            cell={(cell) => <Cell cell={cell} puzzle={puzzle} game={game} />}
          />
        )}
      </View>
      <View
        style={{
          marginTop: 'auto',
          paddingBottom: bottomInset,
          pointerEvents: playable ? 'auto' : 'none',
          opacity: playable ? 1 : states.disabledOpacity,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: strokes.hairline,
            borderBottomColor: colors.hair2,
          }}
        >
          <Tool
            first
            label={strings.board.undo}
            Glyph={UndoGlyph}
            onPress={undo}
            testID="sudoku-undo"
          />
          <Tool label={strings.board.redo} Glyph={RedoGlyph} onPress={redo} testID="sudoku-redo" />
          <Tool
            label={strings.board.erase}
            Glyph={EraseGlyph}
            onPress={erase}
            testID="sudoku-erase"
          />
          <Tool
            label={strings.board.notes}
            Glyph={NotesGlyph}
            onPress={toggleNotes}
            on={state.notesMode}
            testID="sudoku-notes"
          />
          <Tool label={strings.board.hint} Glyph={HintGlyph} onPress={hint} testID="sudoku-hint" />
        </View>
        <Pad left={(digit) => (ready ? remaining(game, puzzle, digit) : SIZE)} />
      </View>
    </View>
  );
}
