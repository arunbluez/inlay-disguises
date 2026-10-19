import { useTheme } from '../theme';
import { controls, fontStyle, tabularNums } from '../tokens';
import { Field, type FieldProps } from './Field';

export interface NumberFieldProps extends Omit<FieldProps, 'keyboardType' | 'inputMode'> {
  /** Shown at the end of the box, e.g. "KB". */
  unit?: string;
}

/** A labelled digits-only input in tabular figures, with an optional unit. */
export function NumberField({ onChangeText, ...props }: NumberFieldProps) {
  const { archivo } = useTheme();
  return (
    <Field
      {...props}
      keyboardType="number-pad"
      inputMode="numeric"
      onChangeText={(text) => onChangeText?.(text.replace(/\D/g, ''))}
      inputStyle={{
        ...fontStyle(600, archivo),
        fontSize: controls.numberText,
        fontVariant: [...tabularNums],
      }}
    />
  );
}
