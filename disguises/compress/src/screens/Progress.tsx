import {
  Button,
  layout,
  ProgressBar,
  spacing,
  tabularNums,
  textStyle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { Text, View } from 'react-native';

import { useStore } from '../state/store';
import { strings } from '../strings';
import { SectionLabel } from './parts';

export function Progress() {
  const { state, cancel } = useStore();
  const { colors, archivo } = useHostTheme();
  const progress = state.progress ?? { index: 0, total: 1, fraction: 0 };
  const pct = Math.round(progress.fraction * 100);
  return (
    <View
      testID="compress-progress"
      style={{ flex: 1, paddingHorizontal: layout.gutter, paddingBottom: spacing[20] }}
    >
      <SectionLabel style={{ paddingTop: spacing[12], paddingBottom: spacing[12] }}>
        {strings.progress.title}
      </SectionLabel>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: spacing[12] }}>
        <Text
          style={[
            textStyle('display', 96, archivo),
            { color: colors.ink, fontVariant: [...tabularNums] },
          ]}
        >
          {`${pct}%`}
        </Text>
        <ProgressBar
          progress={progress.fraction}
          accessibilityLabel={strings.progress.title}
          testID="compress-progress-bar"
        />
        <Text style={[textStyle('body', 14, archivo), { color: colors.muted }]}>
          {strings.progress.file(Math.min(progress.index + 1, progress.total), progress.total)}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          label={strings.progress.cancel}
          onPress={cancel}
          testID="compress-cancel"
        />
      </View>
    </View>
  );
}
