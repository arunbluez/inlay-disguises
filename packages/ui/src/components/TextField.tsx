import { controls, fontFamily } from '../tokens';
import { Field, type FieldProps } from './Field';

export type TextFieldProps = FieldProps;

/** A labelled single-line text input on the surface colour. */
export function TextField(props: TextFieldProps) {
  return (
    <Field {...props} inputStyle={{ fontFamily: fontFamily[400], fontSize: controls.fieldText }} />
  );
}
