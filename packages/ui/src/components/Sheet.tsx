import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, motion, radii, scrim, spacing, textStyle } from '../tokens';
import { Button } from './Button';

export interface SheetProps {
  visible: boolean;
  /** Called by the close action, a tap on the dimmed backdrop and the system back gesture. */
  onClose: () => void;
  title: string;
  /** A short muted paragraph under the title. */
  note?: string;
  closeLabel?: string;
  children?: ReactNode;
  testID?: string;
}

/** A bottom sheet that rises without bounce over a dimmed screen. */
export function Sheet({
  visible,
  onClose,
  title,
  note,
  closeLabel = 'Close',
  children,
  testID,
}: SheetProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));

  // Stay mounted while the sheet slides away; mount again as soon as it is asked to show.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    const slide = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: motion.sheetToggle,
      easing: Easing.bezier(...motion.ease),
      useNativeDriver: true,
    });
    slide.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => slide.stop();
  }, [mounted, progress, visible]);

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: scrim, opacity: progress }]}
      >
        {/* Screen readers use the close action; the backdrop is for touch only. */}
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        testID={testID}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: controls.sheet.top,
          paddingBottom: spacing[32],
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) },
          ],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: layout.gutter,
            paddingTop: controls.sheet.headerTop,
            paddingBottom: controls.sheet.headerBottom,
          }}
        >
          <Text
            accessibilityRole="header"
            style={[textStyle('heading', 18), { color: colors.ink, flexShrink: 1 }]}
          >
            {title}
          </Text>
          {/* Keeps the 44-point hit target without making the header taller than the source. */}
          <Button
            variant="text"
            label={closeLabel}
            onPress={onClose}
            style={{ marginVertical: -spacing[12], marginRight: -spacing[4] }}
          />
        </View>
        {note ? (
          <Text
            style={[
              textStyle('body', 14),
              { color: colors.muted, paddingHorizontal: layout.gutter, paddingBottom: spacing[16] },
            ]}
          >
            {note}
          </Text>
        ) : null}
        {children}
      </Animated.View>
    </Modal>
  );
}
