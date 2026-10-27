import {
  EmptyState,
  fontStyle,
  layout,
  radii,
  ScreenHeader,
  spacing,
  strokes,
  tabularNums,
  textStyle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import { LEVELS } from '../engine/grade';
import { RECENT_LIMIT, type Solve } from '../state/storage';
import { useStore } from '../state/store';
import { clock, shortDay, strings } from '../strings';
import { SectionLabel } from './parts';

/** Bars fill this height at the chart's top value; the source draws 10 minutes as 120. */
const BAR_MAX = 120;
const CHART_MINUTES = 10;

/** The latest solves as bars, oldest first; the newest is in the accent. */
function Chart({ recent }: { recent: Solve[] }) {
  const { colors, archivo } = useHostTheme();
  const top = Math.max(CHART_MINUTES * 60_000, ...recent.map((solve) => solve.ms));
  const caption = [textStyle('caption', 10, archivo), fontStyle(600, archivo)];
  // Always seven columns, the newest on the right; slots without a solve stay empty.
  const slots = [...new Array<Solve | null>(RECENT_LIMIT - recent.length).fill(null), ...recent];
  return (
    <View testID="sudoku-chart">
      <View style={{ flexDirection: 'row', gap: spacing[8], height: 150, marginTop: 14 }}>
        {slots.map((solve, i) => (
          <View key={i} style={{ flex: 1, justifyContent: 'flex-end', gap: spacing[4] }}>
            {solve ? (
              <>
                <Text style={[caption, { color: colors.ink, fontVariant: [...tabularNums] }]}>
                  {clock(solve.ms)}
                </Text>
                <View
                  style={{
                    height: Math.max(2, Math.round((solve.ms / top) * BAR_MAX)),
                    borderTopLeftRadius: radii.tile,
                    borderTopRightRadius: radii.tile,
                    backgroundColor: i === slots.length - 1 ? colors.accent : colors.ink,
                  }}
                />
              </>
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing[8], marginTop: 6 }}>
        {slots.map((solve, i) => (
          <Text
            key={i}
            style={[textStyle('caption', 11, archivo), { flex: 1, color: colors.muted }]}
          >
            {solve ? shortDay(new Date(solve.at)) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Column widths of the table: Difficulty takes two shares. */
const COLUMNS = [2, 1, 1, 1];

function TableRow({ cells, head = false }: { cells: string[]; head?: boolean }) {
  const { colors, archivo } = useHostTheme();
  const text = head
    ? [textStyle('label', 10, archivo), { color: colors.muted }]
    : [textStyle('body', 15, archivo), { color: colors.ink, fontVariant: [...tabularNums] }];
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: head ? 10 : 14,
        paddingHorizontal: layout.gutter,
        borderBottomWidth: strokes.hairline,
        borderBottomColor: colors.hair2,
      }}
    >
      {cells.map((cell, i) => (
        <Text key={i} style={[...text, { flex: COLUMNS[i], textAlign: i >= 2 ? 'right' : 'left' }]}>
          {cell}
        </Text>
      ))}
    </View>
  );
}

export function Stats() {
  const { state } = useStore();
  const { recent, levels } = state.stats;
  return (
    <View testID="sudoku-stats" style={{ flex: 1 }}>
      <ScreenHeader title={strings.stats.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        <View style={{ padding: layout.gutter }}>
          {recent.length > 0 ? (
            <>
              <SectionLabel>{strings.stats.recent}</SectionLabel>
              <Chart recent={recent} />
            </>
          ) : (
            <EmptyState
              title={strings.stats.emptyTitle}
              body={strings.stats.emptyBody}
              testID="sudoku-stats-empty"
            />
          )}
        </View>
        <TableRow
          head
          cells={[
            strings.stats.level,
            strings.stats.solved,
            strings.stats.best,
            strings.stats.average,
          ]}
        />
        {LEVELS.map((level) => {
          const { solved, bestMs, totalMs } = levels[level];
          return (
            <View key={level} testID={`sudoku-stats-${level}`}>
              <TableRow
                cells={[
                  strings.levels[level],
                  String(solved),
                  bestMs === null ? strings.none : clock(bestMs),
                  solved > 0 ? clock(totalMs / solved) : strings.none,
                ]}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
