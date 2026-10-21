import { useBottomInset } from '@inlay/disguise-sdk';
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS reports the keyboard before it animates, Android only once it has moved.
export const keyboardEvents =
  Platform.OS === 'ios'
    ? ({ open: 'keyboardWillShow', close: 'keyboardWillHide' } as const)
    : ({ open: 'keyboardDidShow', close: 'keyboardDidHide' } as const);

/**
 * How far the keyboard reaches up from the screen's bottom edge; 0 while it is closed. iOS reports
 * that height; Android reports it less the navigation bar (negative for a floating keyboard
 * toolbar), so the bar's height, the bottom inset, is added back.
 */
export function useKeyboardHeight(): number {
  const bottomInset = useBottomInset();
  const [reported, setReported] = useState<number | null>(null);
  useEffect(() => {
    const opened = Keyboard.addListener(keyboardEvents.open, (event) =>
      setReported(event.endCoordinates.height),
    );
    const closed = Keyboard.addListener(keyboardEvents.close, () => setReported(null));
    return () => {
      opened.remove();
      closed.remove();
    };
  }, []);
  if (reported === null) return 0;
  return Math.max(0, Platform.OS === 'android' ? reported + bottomInset : reported);
}
