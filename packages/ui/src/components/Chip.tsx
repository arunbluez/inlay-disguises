import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import {
  controls,
  fontStyle,
  layout,
  radii,
  states,
  strokes,
  tabularNums,
  textStyle,
} from '../tokens';
import { focusRing, useFocused } from './focus';

const chipSlop = (layout.minHit - controls.chip.height) / 2;
const segmentSlop = (layout.minHit - controls.segment.height) / 2;

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Tabular figures, for chips that show numbers. */
  numeric?: boolean;
  testID?: string;
}

/** Semibold caption text, the type of chips and segments. */
function chipText(size: number, archivo: boolean, color: string) {
  return { ...textStyle('caption', size, archivo), ...fontStyle(600, archivo), color };
}

/** A small outlined chip; the selected one fills with ink. Used for filters and quick picks. */
export function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  numeric = false,
  testID,
}: ChipProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  return (
    <Pressable
      {...focusHandlers}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={chipSlop}
      style={({ pressed }) => [
        {
          height: controls.chip.height,
          justifyContent: 'center',
          paddingHorizontal: controls.chip.inset,
          borderRadius: radii.button,
          borderWidth: strokes.hairline,
          borderColor: selected ? colors.ink : colors.rule,
          backgroundColor: selected ? colors.ink : pressed ? colors.press : 'transparent',
          opacity: disabled ? states.disabledOpacity : 1,
        },
        focused && focusRing(colors.ink),
      ]}
    >
      <Text
        style={{
          ...chipText(13, archivo, selected ? colors.bg : colors.ink),
          fontVariant: numeric ? [...tabularNums] : undefined,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export interface ChipRowOption<Value extends string> {
  value: Value;
  label: string;
}

export interface ChipRowProps<Value extends string> {
  options: readonly ChipRowOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  disabled?: boolean;
  testID?: string;
}

/** A segmented row of chips with one choice; the chosen segment fills with the accent. */
export function ChipRow<Value extends string>({
  options,
  value,
  onChange,
  disabled = false,
  testID,
}: ChipRowProps<Value>) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        borderRadius: radii.button,
        overflow: 'hidden',
        opacity: disabled ? states.disabledOpacity : 1,
      }}
    >
      {/* The outline sits above the segments: iOS paints children over a view's own border. */}
      <View
        style={{
          ...StyleSheet.absoluteFill,
          borderWidth: strokes.hairline,
          borderColor: colors.rule,
          borderRadius: radii.button,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {options.map((option, index) => (
        <Segment
          key={option.value}
          label={option.label}
          selected={option.value === value}
          first={index === 0}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          testID={testID ? `${testID}-${option.value}` : undefined}
        />
      ))}
    </View>
  );
}

interface SegmentProps {
  label: string;
  selected: boolean;
  first: boolean;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
}

function Segment({ label, selected, first, disabled, onPress, testID }: SegmentProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  return (
    <Pressable
      {...focusHandlers}
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: segmentSlop, bottom: segmentSlop }}
      style={({ pressed }) => [
        {
          flex: 1,
          height: controls.segment.height,
          justifyContent: 'center',
          paddingHorizontal: controls.segment.inset,
          borderLeftWidth: first ? 0 : strokes.hairline,
          borderLeftColor: colors.rule,
          backgroundColor: selected ? colors.accent : pressed ? colors.press : 'transparent',
        },
        focused && focusRing(colors.ink, true),
      ]}
    >
      <Text numberOfLines={1} style={chipText(12, archivo, selected ? colors.on : colors.ink)}>
        {label}
      </Text>
    </Pressable>
  );
}
