import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import {
  controls,
  fontFamily,
  layout,
  radii,
  spacing,
  states,
  strokes,
  tabularNums,
  textStyle,
} from '../tokens';

const chipSlop = (layout.minHit - controls.chip.height) / 2;
/** Corner radius just inside the row's hairline border. */
const inner = radii.button - strokes.hairline;

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Tabular figures, for chips that show numbers. */
  numeric?: boolean;
  testID?: string;
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
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={chipSlop}
      style={({ pressed }) => ({
        height: controls.chip.height,
        justifyContent: 'center',
        paddingHorizontal: controls.chip.inset,
        borderRadius: radii.button,
        borderWidth: strokes.hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: selected ? colors.ink : pressed ? colors.surface : 'transparent',
        opacity: disabled ? states.disabledOpacity : 1,
      })}
    >
      <Text
        style={{
          ...textStyle('caption', 13),
          fontFamily: fontFamily[600],
          color: selected ? colors.bg : colors.ink,
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
        borderWidth: strokes.hairline,
        borderColor: colors.rule,
        borderRadius: radii.button,
        opacity: disabled ? states.disabledOpacity : 1,
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              height: layout.minHit,
              justifyContent: 'center',
              paddingHorizontal: spacing[12],
              borderLeftWidth: index === 0 ? 0 : strokes.hairline,
              borderLeftColor: colors.rule,
              // The end segments round with the row so the selected fill follows its corners.
              ...(index === 0 && { borderTopLeftRadius: inner, borderBottomLeftRadius: inner }),
              ...(index === options.length - 1 && {
                borderTopRightRadius: inner,
                borderBottomRightRadius: inner,
              }),
              backgroundColor: selected ? colors.accent : pressed ? colors.surface : 'transparent',
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                ...textStyle('caption', 13),
                fontFamily: fontFamily[600],
                color: selected ? colors.on : colors.ink,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
