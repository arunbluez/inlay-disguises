import type { ReactNode } from 'react';
import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, motion, radii, spacing, states, strokes, textStyle } from '../tokens';
import { Arrow } from './glyphs';

/**
 * - `primary`: the one action on a screen; accent fill, flush-left label, trailing arrow.
 * - `secondary`: outlined in the rule colour.
 * - `text`: a text action in the deep accent.
 * - `destructive`: confirms something that can't be undone (the confirm button of a delete
 *   dialog); accent fill, no arrow.
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
  const { colors } = useTheme();
  const filled = variant === 'primary' || variant === 'destructive';
  const fg = filled ? colors.on : variant === 'secondary' ? colors.ink : colors.deep;
  const end =
    trailing === undefined && variant === 'primary' ? (
      <Arrow size={controls.icon} color={fg} />
    ) : (
      trailing
    );

  return (
    <Pressable
      {...pressable}
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
          backgroundColor: pressed ? colors.deep : colors.accent,
        },
        variant === 'secondary' && {
          height: layout.row,
          paddingHorizontal: spacing[16],
          borderWidth: strokes.hairline,
          borderColor: colors.rule,
          backgroundColor: pressed ? colors.surface : 'transparent',
        },
        variant === 'text' && {
          alignSelf: 'flex-start',
          height: layout.minHit,
          paddingHorizontal: spacing[4],
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <Text
            numberOfLines={1}
            style={[
              textStyle('action', variant === 'primary' ? 16 : 15),
              { color: variant === 'text' && pressed ? colors.accent : fg },
            ]}
          >
            {label}
          </Text>
          {end}
        </>
      )}
    </Pressable>
  );
}
