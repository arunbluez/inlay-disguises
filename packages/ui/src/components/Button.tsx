import type { ReactNode } from 'react';
import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, motion, radii, spacing, states, strokes, textStyle } from '../tokens';
import { focusRing, useFocused } from './focus';
import { Arrow } from './glyphs';

/**
 * - `primary`: the one action on a screen; accent fill, flush-left label, trailing arrow.
 * - `secondary`: outlined in the rule colour.
 * - `text`: a text action in the deep accent.
 * - `destructive`: confirms something that can't be undone (the confirm button of a delete
 *   dialog); danger fill, no arrow.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'destructive';

export interface ButtonProps extends Pick<
  PressableProps,
  'onPress' | 'onLongPress' | 'testID' | 'accessibilityHint'
> {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Flush-right content. Primary buttons default to an arrow; pass `null` for none. */
  trailing?: ReactNode;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  disabled = false,
  trailing,
  accessibilityLabel,
  style,
  ...pressable
}: ButtonProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  const fg = {
    primary: colors.on,
    destructive: colors.onDanger,
    secondary: colors.ink,
    text: colors.deep,
  }[variant];
  const end =
    trailing === undefined && variant === 'primary' ? (
      <Arrow size={controls.icon} color={fg} />
    ) : (
      trailing
    );

  return (
    <Pressable
      {...pressable}
      {...focusHandlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      delayLongPress={motion.longPressCommit}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[8],
          borderRadius: radii.button,
          opacity: disabled ? states.disabledOpacity : 1,
        },
        variant === 'primary' && {
          height: layout.primaryAction,
          paddingHorizontal: spacing[16],
          backgroundColor: pressed ? colors.deep : colors.accent,
        },
        variant === 'destructive' && {
          height: layout.row,
          paddingHorizontal: spacing[16],
          backgroundColor: pressed ? colors.dangerDeep : colors.danger,
        },
        variant === 'secondary' && {
          height: controls.secondary.height,
          paddingHorizontal: controls.secondary.inset,
          borderWidth: strokes.hairline,
          borderColor: colors.rule,
          backgroundColor: pressed ? colors.press : 'transparent',
        },
        variant === 'text' && {
          alignSelf: 'flex-start',
          height: layout.minHit,
          paddingHorizontal: spacing[4],
          backgroundColor: pressed ? colors.press : 'transparent',
        },
        focused && focusRing(colors.ink),
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[textStyle('action', variant === 'primary' ? 16 : 15, archivo), { color: fg }]}
      >
        {label}
      </Text>
      {end}
    </Pressable>
  );
}
