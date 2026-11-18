import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, radii, states, textStyle } from '../tokens';
import { focusRing, useFocused } from './focus';
import { Arrow, Plus } from './glyphs';

export interface ActionCardProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Top-left glyph, drawn in `colors.on`; defaults to a plus. */
  icon?: ReactNode;
  disabled?: boolean;
  /** A shorter card for inside a screen: glyph, title and subtitle, and the arrow in one row. */
  compact?: boolean;
  /** Defaults to the title and subtitle. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A large accent card that starts the screen's main task, e.g. "Compress now": glyph and arrow on
 * top, title and subtitle at the bottom; `compact` puts them in one shorter row. Steps to the deep
 * accent while pressed.
 */
export function ActionCard({
  title,
  subtitle,
  onPress,
  icon,
  disabled = false,
  compact = false,
  accessibilityLabel,
  testID,
}: ActionCardProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  const glyph = icon ?? <Plus size={controls.actionCard.icon} color={colors.on} />;
  const arrow = <Arrow size={controls.icon} color={colors.on} />;
  const text = (
    <View style={compact ? { flex: 1 } : undefined}>
      <Text numberOfLines={1} style={[textStyle('heading', 21, archivo), { color: colors.on }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={[textStyle('caption', 13, archivo), { color: colors.on }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
  return (
    <Pressable
      {...focusHandlers}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: compact ? controls.actionCard.compactHeight : controls.actionCard.height,
          flexDirection: compact ? 'row' : 'column',
          alignItems: compact ? 'center' : 'stretch',
          gap: compact ? controls.actionCard.horizontal : 0,
          justifyContent: 'space-between',
          paddingVertical: controls.actionCard.vertical,
          paddingHorizontal: controls.actionCard.horizontal,
          borderRadius: radii.card,
          backgroundColor: pressed ? colors.deep : colors.accent,
          opacity: disabled ? states.disabledOpacity : 1,
        },
        focused && focusRing(colors.ink),
      ]}
    >
      {compact ? (
        <>
          {glyph}
          {text}
          {arrow}
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {glyph}
            {arrow}
          </View>
          {text}
        </>
      )}
    </Pressable>
  );
}
