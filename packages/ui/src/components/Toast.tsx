import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, fontStyle, motion, radii } from '../tokens';

export interface ToastProps {
  message: string;
  visible: boolean;
  /** Called once the toast has been up for `motion.toastHold`; the host then removes it. */
  onDismiss?: () => void;
  testID?: string;
}

/** A short confirmation in ground-coloured text on an ink block. The host positions it. */
export function Toast({ message, visible, onDismiss, testID }: ToastProps) {
  const { colors, archivo } = useTheme();

  useEffect(() => {
    if (!visible || !onDismiss) return;
    const timer = setTimeout(onDismiss, motion.toastHold);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, message]);

  if (!visible) return null;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        borderRadius: radii.button,
        backgroundColor: colors.ink,
        paddingVertical: controls.toast.vertical,
        paddingHorizontal: controls.toast.horizontal,
      }}
    >
      <Text style={{ ...fontStyle(600, archivo), fontSize: controls.toast.text, color: colors.bg }}>
        {message}
      </Text>
    </View>
  );
}
