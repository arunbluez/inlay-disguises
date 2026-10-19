import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, motion, radii, states } from '../tokens';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

const { width, height, knob, knobInset, border } = controls.toggle;
/** How far the knob travels between off and on. */
const travel = width - 2 * border - 2 * knobInset - knob;
const slop = (layout.minHit - height) / 2;

/** A pill switch: accent fill with an `on`-coloured knob when on, rule outline when off. */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: ToggleProps) {
  const { colors } = useTheme();
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    const slide = Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: motion.sheetToggle,
      easing: Easing.bezier(...motion.ease),
      useNativeDriver: true,
    });
    slide.start();
    return () => slide.stop();
  }, [position, value]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{ top: slop, bottom: slop, left: 0, right: 0 }}
      onPress={() => onValueChange(!value)}
      style={{
        width,
        height,
        borderRadius: radii.pill,
        borderWidth: border,
        borderColor: value ? colors.accent : colors.rule,
        backgroundColor: value ? colors.accent : 'transparent',
        opacity: disabled ? states.disabledOpacity : 1,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: knobInset,
          left: knobInset,
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: value ? colors.on : colors.rule,
          transform: [
            { translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
          ],
        }}
      />
    </Pressable>
  );
}
