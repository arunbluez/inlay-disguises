import {
  Button,
  layout,
  ListRow,
  spacing,
  tabularNums,
  textStyle,
  useBottomInset,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import { useStore } from '../state/store';
import { clock, strings } from '../strings';
import { rowInset, Rows, SectionLabel } from './parts';

/**
 * The solved puzzle: its time, number and level, the streak and the best time at that level. No
 * UI Source screen; built from the kit (D-55).
 */
export function Completion() {
  const { state, go } = useStore();
  const { colors, archivo } = useHostTheme();
  const bottomInset = useBottomInset();
  const { solved } = state;
  if (!solved) return null;
  const newBest = solved.bestMs === solved.ms;

  return (
    <View testID="sudoku-completion" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: spacing[48], paddingBottom: spacing[24] }}>
        <View style={{ paddingHorizontal: layout.gutter, gap: spacing[8] }}>
          <SectionLabel>{strings.completion.title}</SectionLabel>
          <Text
            testID="sudoku-completion-time"
            style={[
              textStyle('display', 72, archivo),
              { color: colors.ink, fontVariant: [...tabularNums] },
            ]}
          >
            {clock(solved.ms)}
          </Text>
          <Text
            testID="sudoku-completion-puzzle"
            style={[textStyle('body', 15, archivo), { color: colors.muted }]}
          >
            {strings.completion.puzzle(solved.n, solved.level)}
          </Text>
        </View>
        <View style={{ marginTop: spacing[24] }}>
          <Rows inset={rowInset}>
            <ListRow
              title={strings.completion.best}
              value={newBest ? strings.completion.newBest : clock(solved.bestMs)}
              testID="sudoku-completion-best"
            />
            <ListRow
              title={strings.completion.streak}
              value={strings.streak(solved.streak)}
              testID="sudoku-completion-streak"
            />
          </Rows>
        </View>
      </ScrollView>
      <View
        style={{
          paddingTop: spacing[12],
          paddingHorizontal: layout.gutter,
          paddingBottom: spacing[12] + bottomInset,
        }}
      >
        <Button label={strings.completion.done} onPress={() => go('today')} testID="sudoku-done" />
      </View>
    </View>
  );
}
