import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, radii, spacing, textStyle } from '../tokens';

export interface EmptyStateProps {
  title: string;
  body?: string;
  /** Optional next step under the text, e.g. a Button. */
  action?: ReactNode;
  testID?: string;
}

/** A surface card saying there is nothing here yet, and what to do about it. */
export function EmptyState({ title, body, action, testID }: EmptyStateProps) {
  const { colors, archivo } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        borderRadius: radii.card,
        backgroundColor: colors.surface,
        padding: controls.emptyState.padding,
      }}
    >
      <View accessible accessibilityLabel={body ? `${title}. ${body}` : title}>
        <Text style={[textStyle('action', 15, archivo), { color: colors.ink }]}>{title}</Text>
        {body ? (
          <Text
            style={[
              textStyle('caption', 12, archivo),
              { color: colors.muted, marginTop: spacing[4] },
            ]}
          >
            {body}
          </Text>
        ) : null}
      </View>
      {action ? <View style={{ marginTop: spacing[12] }}>{action}</View> : null}
    </View>
  );
}
