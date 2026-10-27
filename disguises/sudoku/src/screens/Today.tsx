import {
  Button,
  ChipRow,
  controls,
  fontStyle,
  layout,
  radii,
  spacing,
  strokes,
  tabularNums,
  textStyle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import { dailyPuzzle, dayOf } from '../engine/daily';
import { LEVELS } from '../engine/grade';
import { streak, type Stats } from '../state/storage';
import { useStore } from '../state/store';
import { clock, strings } from '../strings';
import { PlayGlyph } from './glyphs';
import { AppMark, Figure, SectionLabel } from './parts';

const levelOptions = LEVELS.map((level) => ({ value: level, label: strings.levels[level] }));

/** Solved, best and average over every level. */
function totals(stats: Stats) {
  const levels = Object.values(stats.levels);
  const solved = levels.reduce((sum, level) => sum + level.solved, 0);
  const totalMs = levels.reduce((sum, level) => sum + level.totalMs, 0);
  const bests = levels.flatMap((level) => (level.bestMs === null ? [] : [level.bestMs]));
  return {
    solved: String(solved),
    best: bests.length > 0 ? clock(Math.min(...bests)) : strings.none,
    average: solved > 0 ? clock(totalMs / solved) : strings.none,
  };
}

/** Monday to Sunday of this week: whether that day's daily puzzle was solved. */
function week(stats: Stats, today: number, date: Date): boolean[] {
  const monday = today - ((date.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => stats.days.includes(monday + i));
}

export function Today() {
  const { state, setLevel, playToday } = useStore();
  const { colors, archivo } = useHostTheme();
  const date = new Date();
  const today = dayOf(date);
  const { solved, best, average } = totals(state.stats);
  const days = week(state.stats, today, date);

  return (
    <View testID="sudoku-today" style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          paddingHorizontal: layout.gutter,
          paddingTop: spacing[8],
          paddingBottom: spacing[12],
        }}
      >
        <AppMark />
        <Text
          accessibilityRole="header"
          style={[textStyle('heading', 22, archivo), { color: colors.ink }]}
        >
          {strings.appName}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        <View
          style={{
            marginTop: spacing[16],
            marginHorizontal: spacing[16],
            paddingTop: 22,
            paddingHorizontal: spacing[20],
            paddingBottom: spacing[20],
            gap: 14,
            borderRadius: radii.card,
            backgroundColor: colors.surface,
          }}
        >
          <SectionLabel>{strings.today.date(date)}</SectionLabel>
          <Text
            testID="sudoku-today-number"
            style={[
              textStyle('display', 48, archivo),
              { color: colors.ink, fontVariant: [...tabularNums] },
            ]}
          >
            {strings.today.puzzle(dailyPuzzle(today, state.level))}
          </Text>
          <ChipRow
            options={levelOptions}
            value={state.level}
            onChange={setLevel}
            testID="sudoku-level"
          />
          <Button
            label={strings.today.play}
            onPress={playToday}
            trailing={<PlayGlyph size={controls.icon} color={colors.on} />}
            testID="sudoku-play-today"
          />
        </View>
        <View
          style={{
            paddingTop: 18,
            paddingHorizontal: layout.gutter,
            paddingBottom: spacing[16],
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <SectionLabel>{strings.today.week}</SectionLabel>
            <Text
              testID="sudoku-streak"
              style={[textStyle('action', 15, archivo), { color: colors.ink }]}
            >
              {strings.streak(streak(state.stats, today))}
            </Text>
          </View>
          <View testID="sudoku-week" style={{ flexDirection: 'row', gap: spacing[4] }}>
            {days.map((done, i) => (
              <View
                key={i}
                testID={done ? `sudoku-week-${i}-done` : `sudoku-week-${i}`}
                style={{
                  flex: 1,
                  height: 28,
                  justifyContent: 'center',
                  paddingLeft: 6,
                  borderRadius: radii.tile,
                  borderWidth: done ? 0 : strokes.hairline,
                  borderColor: colors.rule,
                  backgroundColor: done ? colors.accent : 'transparent',
                }}
              >
                <Text
                  style={[
                    textStyle('caption', 11, archivo),
                    fontStyle(600, archivo),
                    { color: done ? colors.on : colors.muted },
                  ]}
                >
                  {strings.today.weekdays[i]}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {[
            { label: strings.today.solved, value: solved, testID: 'sudoku-total-solved' },
            { label: strings.today.best, value: best, testID: 'sudoku-total-best' },
            { label: strings.today.average, value: average, testID: 'sudoku-total-average' },
          ].map((figure, i) => (
            <View
              key={figure.testID}
              style={{
                flex: 1,
                paddingTop: 14,
                paddingBottom: spacing[16],
                paddingLeft: i === 0 ? layout.gutter : 14,
                paddingRight: 14,
                borderRightWidth: i < 2 ? strokes.hairline : 0,
                borderRightColor: colors.hair2,
              }}
            >
              <Figure {...figure} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
