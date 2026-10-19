import { Children, createContext, useContext, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, radii, spacing, states, strokes, textStyle } from '../tokens';
import { Chevron } from './glyphs';

/** Which of a row's ends meet the group's rounded corners, so its pressed fill can follow them. */
const RowEdges = createContext({ top: false, bottom: false });

export interface ListGroupProps {
  children: ReactNode;
  testID?: string;
}

/** An inset surface card that holds rows, with a hairline between each. */
export function ListGroup({ children, testID }: ListGroupProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View testID={testID} style={{ backgroundColor: colors.surface, borderRadius: radii.card }}>
      {rows.map((row, index) => (
        <RowEdges.Provider
          key={index}
          value={{ top: index === 0, bottom: index === rows.length - 1 }}
        >
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
        </RowEdges.Provider>
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
  const { colors } = useTheme();
  const edges = useContext(RowEdges);
  return (
    <Pressable
      testID={testID}
      accessible={trailing === undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (value ? `${title}, ${value}` : title)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        minHeight: layout.row,
        paddingHorizontal: spacing[16],
        backgroundColor: pressed && onPress ? colors.bg : 'transparent',
        borderTopLeftRadius: edges.top ? radii.card : 0,
        borderTopRightRadius: edges.top ? radii.card : 0,
        borderBottomLeftRadius: edges.bottom ? radii.card : 0,
        borderBottomRightRadius: edges.bottom ? radii.card : 0,
        opacity: disabled ? states.disabledOpacity : 1,
      })}
    >
      <Text style={[textStyle('body'), { flex: 1, color: colors.ink }]}>{title}</Text>
      {value ? <Text style={[textStyle('body'), { color: colors.muted }]}>{value}</Text> : null}
      {trailing ?? (onPress ? <Chevron size={controls.chevron} color={colors.muted} /> : null)}
    </Pressable>
  );
}
