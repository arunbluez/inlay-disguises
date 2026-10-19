import { useState } from 'react';
import { View, type AccessibilityActionEvent, type GestureResponderEvent } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, states, strokes } from '../tokens';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  /** Snaps to multiples of `step` from the minimum; continuous when unset. */
  step?: number;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

/** A thin rule track with an accent fill and an ink thumb; drag or tap anywhere on it. */
export function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step,
  disabled = false,
  accessibilityLabel,
  testID,
}: SliderProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const range = maximumValue - minimumValue;
  const ratio = range > 0 ? Math.min(1, Math.max(0, (value - minimumValue) / range)) : 0;
  const percent = `${ratio * 100}%` as const;

  const commit = (next: number) => {
    if (disabled) return;
    const snapped = step ? minimumValue + Math.round((next - minimumValue) / step) * step : next;
    const clamped = Math.min(maximumValue, Math.max(minimumValue, snapped));
    if (clamped !== value) onValueChange(clamped);
  };

  const track = (event: GestureResponderEvent) => {
    if (width > 0) commit(minimumValue + (event.nativeEvent.locationX / width) * range);
  };

  const adjust = (event: AccessibilityActionEvent) => {
    const delta = step ?? range / 10;
    if (event.nativeEvent.actionName === 'increment') commit(value + delta);
    if (event.nativeEvent.actionName === 'decrement') commit(value - delta);
  };

  const centered = (size: number) => (layout.minHit - size) / 2;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={adjust}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={track}
      onResponderMove={track}
      style={{ height: layout.minHit, opacity: disabled ? states.disabledOpacity : 1 }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: centered(strokes.rule),
          height: strokes.rule,
          backgroundColor: colors.rule,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: centered(controls.slider.fill),
          width: percent,
          height: controls.slider.fill,
          backgroundColor: colors.accent,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: percent,
          top: centered(controls.slider.thumb),
          marginLeft: -controls.slider.thumb / 2,
          width: controls.slider.thumb,
          height: controls.slider.thumb,
          borderRadius: controls.slider.thumb / 2,
          backgroundColor: colors.ink,
        }}
      />
    </View>
  );
}
