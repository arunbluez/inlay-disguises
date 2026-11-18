// Focus state for interactive controls: keyboard, D-pad and switch access move input focus, and the
// focused control draws an ink ring (`states.focusRing`). Screen readers draw their own cursor.
import { useState } from 'react';
import type { ViewStyle } from 'react-native';

import { states } from '../tokens';

/** Whether the control has input focus, and the handlers that track it. */
export function useFocused() {
  const [focused, setFocused] = useState(false);
  return [focused, { onFocus: () => setFocused(true), onBlur: () => setFocused(false) }] as const;
}

/** The focus ring: just outside the control's edge, or just inside it with `inset`. */
export function focusRing(color: string, inset = false): ViewStyle {
  const { width, offset } = states.focusRing;
  return {
    outlineColor: color,
    outlineStyle: 'solid',
    outlineWidth: width,
    outlineOffset: inset ? -width : offset,
  };
}
