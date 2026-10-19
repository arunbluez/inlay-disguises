// Shared frame for TextField and NumberField: label, the surface box with the input, an optional
// trailing unit, and helper text below.
import { Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme';
import {
  controls,
  fontFamily,
  layout,
  radii,
  spacing,
  states,
  strokes,
  textStyle,
} from '../tokens';

export interface FieldProps extends Omit<TextInputProps, 'style' | 'editable'> {
  /** Shown above the box; also the default accessibility label. */
  label?: string;
  /** One line of guidance under the box. */
  helper?: string;
  disabled?: boolean;
}

interface FrameProps extends FieldProps {
  inputStyle: TextStyle;
  unit?: string;
}

export function Field({
  label,
  helper,
  disabled = false,
  inputStyle,
  unit,
  accessibilityLabel,
  ...input
}: FrameProps) {
  const { colors } = useTheme();
  return (
    <View style={{ opacity: disabled ? states.disabledOpacity : 1 }}>
      {label ? (
        <Text
          style={[textStyle('action', 15), { color: colors.ink, marginBottom: controls.labelGap }]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: layout.row,
          borderRadius: radii.field,
          borderWidth: strokes.hairline,
          borderColor: colors.rule,
          backgroundColor: colors.surface,
        }}
      >
        <TextInput
          {...input}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          style={[
            {
              flex: 1,
              minWidth: 0,
              height: '100%',
              paddingHorizontal: controls.fieldInset,
              paddingVertical: 0,
              color: colors.ink,
            },
            inputStyle,
          ]}
        />
        {unit ? (
          <Text
            style={{
              ...textStyle('caption', 13),
              fontFamily: fontFamily[600],
              color: colors.muted,
              paddingHorizontal: controls.fieldInset,
            }}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <Text style={[textStyle('caption', 12), { color: colors.muted, marginTop: spacing[8] }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
