// Shared frame for TextField and NumberField: label, the surface box with the input, an optional
// trailing unit, and helper text below.
import { Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme';
import { controls, fontStyle, radii, spacing, states, strokes, textStyle } from '../tokens';
import { focusRing, useFocused } from './focus';

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
  onFocus,
  onBlur,
  ...input
}: FrameProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  return (
    <View style={{ opacity: disabled ? states.disabledOpacity : 1 }}>
      {label ? (
        <Text
          style={{
            ...fontStyle(800, archivo),
            fontSize: controls.fieldLabel,
            color: colors.ink,
            marginBottom: controls.labelGap,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: controls.field,
            borderRadius: radii.field,
            borderWidth: strokes.hairline,
            borderColor: colors.rule,
            backgroundColor: colors.surface,
          },
          focused && focusRing(colors.ink),
        ]}
      >
        <TextInput
          {...input}
          editable={!disabled}
          onFocus={(event) => {
            focusHandlers.onFocus();
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focusHandlers.onBlur();
            onBlur?.(event);
          }}
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
            style={[
              textStyle('caption', 12, archivo),
              { color: colors.muted, paddingHorizontal: controls.fieldInset },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <Text
          style={[
            textStyle('caption', 12, archivo),
            { color: colors.muted, marginTop: spacing[8] },
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
