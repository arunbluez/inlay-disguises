import { View } from 'react-native';

import { useTheme } from '../theme';
import { controls } from '../tokens';

export interface ProgressBarProps {
  /** Fraction done, 0 to 1. */
  progress: number;
  accessibilityLabel: string;
  testID?: string;
}

/** A 4-point accent bar on a hairline-coloured track. */
export function ProgressBar({ progress, accessibilityLabel, testID }: ProgressBarProps) {
  const { colors } = useTheme();
  const done = Math.min(1, Math.max(0, progress));
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(done * 100) }}
      style={{ height: controls.progress, backgroundColor: colors.hair2 }}
    >
      <View style={{ height: '100%', width: `${done * 100}%`, backgroundColor: colors.accent }} />
    </View>
  );
}
