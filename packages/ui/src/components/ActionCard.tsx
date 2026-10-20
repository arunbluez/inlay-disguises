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
  /** Defaults to the title and subtitle. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A large accent card that starts the screen's main task, e.g. "Add files": glyph and arrow on
 * top, title and subtitle at the bottom. Steps to the deep accent while pressed.
 */
export function ActionCard({
  title,
  subtitle,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  testID,
}: ActionCardProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
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
          height: controls.actionCard.height,
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {icon ?? <Plus size={controls.actionCard.icon} color={colors.on} />}
        <Arrow size={controls.icon} color={colors.on} />
      </View>
      <View>
        <Text numberOfLines={1} style={[textStyle('heading', 21, archivo), { color: colors.on }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[textStyle('caption', 13, archivo), { color: colors.on }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
