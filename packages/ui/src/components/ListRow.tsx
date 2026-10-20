import { Children, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, radii, spacing, states, strokes, textStyle } from '../tokens';
import { focusRing, useFocused } from './focus';
import { Chevron } from './glyphs';

export interface ListGroupProps {
  children: ReactNode;
  testID?: string;
}

/** An inset surface card that holds rows, with a hairline between each. */
export function ListGroup({ children, testID }: ListGroupProps) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{ backgroundColor: colors.surface, borderRadius: radii.card, overflow: 'hidden' }}
    >
      {Children.toArray(children).map((row, index) => (
        <View key={index}>
          {index > 0 ? (
            <View
              style={{
                height: strokes.hairline,
                marginHorizontal: spacing[16],
                backgroundColor: colors.hair2,
              }}
            />
          ) : null}
          {row}
        </View>
      ))}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  /** Current setting, shown muted at the end. */
  value?: string;
  /** End-of-row control such as a Toggle; replaces the chevron. */
  trailing?: ReactNode;
  /** Makes the row pressable and shows a chevron (unless `trailing` is set). */
  onPress?: () => void;
  disabled?: boolean;
  /** Defaults to `title`, plus `value` when given. */
  accessibilityLabel?: string;
  testID?: string;
}

/** A 52-point settings row: title flush left, value or control flush right. */
export function ListRow({
  title,
  value,
  trailing,
  onPress,
  disabled = false,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  return (
    <Pressable
      {...focusHandlers}
      testID={testID}
      accessible={trailing === undefined}
      focusable={onPress !== undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          minHeight: layout.row,
          paddingHorizontal: spacing[16],
          backgroundColor: pressed && onPress ? colors.press : 'transparent',
          opacity: disabled ? states.disabledOpacity : 1,
        },
        focused && focusRing(colors.ink, true),
      ]}
    >
      <Text style={[textStyle('body', 15, archivo), { flex: 1, color: colors.ink }]}>{title}</Text>
      {value ? (
        <Text style={[textStyle('body', 15, archivo), { color: colors.muted }]}>{value}</Text>
      ) : null}
      {trailing ?? (onPress ? <Chevron size={controls.chevron} color={colors.muted} /> : null)}
    </Pressable>
  );
}
