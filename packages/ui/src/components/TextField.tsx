import { useTheme } from '../theme';
import { controls, fontStyle } from '../tokens';
import { Field, type FieldProps } from './Field';

export type TextFieldProps = FieldProps;

/** A labelled single-line text input on the surface colour. */
export function TextField(props: TextFieldProps) {
  const { archivo } = useTheme();
  return (
    <Field {...props} inputStyle={{ ...fontStyle(400, archivo), fontSize: controls.fieldText }} />
  );
}
