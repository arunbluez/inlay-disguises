import type { ReactElement, ReactNode } from 'react';
import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, useLongPressGesture } from 'react-native-gesture-handler';

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

/** How far a held finger may drift before the hold gives way: half a hit target. */
const holdSlop = layout.minHit / 2;

export interface ButtonProps extends Pick<
  PressableProps,
  'onPress' | 'testID' | 'accessibilityHint'
> {
  label: string;
  /**
   * Fires once the button has been held for `holdMs`, through Gesture Handler's native long
   * press, so it is the same on iOS and Android. A tap still fires only `onPress`; a hold never
   * fires `onPress`; a scroll or a drift past half a hit target before `holdMs` fires neither. No
   * haptic. A button with `onHold` must render inside the host's `GestureHandlerRootView` (from
   * `react-native-gesture-handler`, a peer dependency); Jest suites that render one add
   * `react-native-gesture-handler/jestSetup` to `setupFiles`.
   */
  onHold?: () => void;
  /** Hold threshold in ms. */
  holdMs?: number;
  /** Fires when the finger lifts (or the system cancels the touch) after `onHold` fired. */
  onHoldEnd?: () => void;
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
  onHold,
  holdMs = motion.longPressCommit,
  onHoldEnd,
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

  const button = (
    <Pressable
      {...pressable}
      {...focusHandlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
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

  return onHold ? (
    <Hold
      onHold={onHold}
      holdMs={holdMs}
      onHoldEnd={onHoldEnd}
      enabled={!disabled}
      testID={pressable.testID ? `${pressable.testID}-hold` : undefined}
    >
      {button}
    </Hold>
  ) : (
    button
  );
}

interface HoldProps {
  onHold: () => void;
  holdMs: number;
  onHoldEnd?: () => void;
  enabled: boolean;
  testID?: string;
  children: ReactElement;
}

/**
 * Wraps the button in a native long press. When it activates, Gesture Handler cancels the
 * button's own touch, so the release after a hold doesn't also press it.
 */
function Hold({ onHold, holdMs, onHoldEnd, enabled, testID, children }: HoldProps) {
  const gesture = useLongPressGesture({
    minDuration: holdMs,
    maxDistance: holdSlop,
    // A finger that slides off the button after the hold still ends it normally.
    shouldCancelWhenOutside: false,
    disableReanimated: true,
    enabled,
    testID,
    onActivate: () => onHold(),
    onDeactivate: () => onHoldEnd?.(),
  });
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
