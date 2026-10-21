import {
  Button,
  controls,
  fontStyle,
  layout,
  radii,
  spacing,
  tabularNums,
  textStyle,
  useBottomInset,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import { formatBytes, formatSaving } from '../state/format';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { SaveGlyph, ShareGlyph } from './glyphs';
import { SectionLabel } from './parts';

/** Shortest After bar, as a fraction of Before, so a large saving still shows a bar. */
const MIN_BAR = 0.04;

/** One row of the Before/After comparison: label, bar, size. */
function Bar({
  label,
  size,
  ratio,
  color,
}: {
  label: string;
  size: string;
  ratio: number;
  color: string;
}) {
  const { colors, archivo } = useHostTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}>
      <Text
        style={[
          textStyle('caption', 12, archivo),
          fontStyle(600, archivo),
          { width: 56, color: colors.muted },
        ]}
      >
        {label}
      </Text>
      <View style={{ flex: 1 }}>
        <View style={{ height: 28, width: `${ratio * 100}%`, backgroundColor: color }} />
      </View>
      <Text
        style={[
          textStyle('action', 15, archivo),
          { width: 72, textAlign: 'right', color: colors.ink, fontVariant: [...tabularNums] },
        ]}
      >
        {size}
      </Text>
    </View>
  );
}

export function Result() {
  const { state, done, save, share } = useStore();
  const { colors, archivo } = useHostTheme();
  const bottomInset = useBottomInset();
  const result = state.result ?? { photos: 0, before: 0, after: 0, outputs: [] };
  const before = formatBytes(result.before);
  const after = formatBytes(result.after);
  const ratio =
    result.before > 0 ? Math.min(1, Math.max(MIN_BAR, result.after / result.before)) : 1;
  return (
    <ScrollView testID="compress-result" contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: layout.gutter,
          paddingRight: layout.gutter - spacing[4],
        }}
      >
        <SectionLabel>{strings.result.title}</SectionLabel>
        <Button variant="text" label={strings.result.done} onPress={done} testID="compress-done" />
      </View>
      <View
        style={{
          paddingHorizontal: layout.gutter,
          paddingTop: spacing[24],
          paddingBottom: spacing[20],
        }}
      >
        <Text
          style={[
            textStyle('display', 104, archivo),
            { color: colors.accent, fontVariant: [...tabularNums] },
          ]}
        >
          {formatSaving(result.before, result.after)}
        </Text>
        <Text
          style={[textStyle('body', 16, archivo), { color: colors.ink, marginTop: spacing[12] }]}
        >
          {strings.result.summary(result.photos, after, before)}
        </Text>
      </View>
      <View
        style={{ paddingHorizontal: layout.gutter, paddingBottom: spacing[20], gap: spacing[8] }}
      >
        <Bar label={strings.result.before} size={before} ratio={1} color={colors.ink} />
        <Bar label={strings.result.after} size={after} ratio={ratio} color={colors.accent} />
      </View>
      <View
        style={{
          marginHorizontal: layout.gutter,
          paddingVertical: spacing[12],
          paddingHorizontal: spacing[16],
          borderRadius: radii.card,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={[textStyle('body', 14, archivo), { color: colors.ink }]}>
          {strings.result.note}
        </Text>
      </View>
      <View
        style={{
          marginTop: 'auto',
          paddingTop: spacing[24],
          paddingHorizontal: layout.gutter,
          paddingBottom: spacing[20] + bottomInset,
          gap: spacing[8],
        }}
      >
        <Button
          label={strings.result.save}
          trailing={<SaveGlyph size={controls.icon} color={colors.on} />}
          onPress={save}
          testID="compress-save"
        />
        <Button
          variant="secondary"
          label={strings.result.share}
          trailing={<ShareGlyph size={20} color={colors.ink} />}
          onPress={share}
          testID="compress-share"
        />
      </View>
    </ScrollView>
  );
}
