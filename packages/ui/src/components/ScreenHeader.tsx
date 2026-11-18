import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, layout, radii, spacing, textStyle } from '../tokens';
import { Button } from './Button';
import { focusRing, useFocused } from './focus';
import { Back } from './glyphs';

export interface ScreenHeaderProps {
  title: string;
  /** Shows a back chevron before the title and a compact title; without it, the title is large. */
  onBack?: () => void;
  /** Defaults to "Back". */
  backLabel?: string;
  /** A text action at the end, such as "Clear". */
  action?: { label: string; onPress: () => void };
  testID?: string;
}

/**
 * The top of a screen, on the screen's ground, below the status bar (the host or screen pads for
 * the safe area). A pushed screen has a back chevron and a heading-size title ("New
 * compression"); a tab's root screen has a large title ("History", "Settings").
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Back',
  action,
  testID,
}: ScreenHeaderProps) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  return (
    <View
      testID={testID}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
        onBack
          ? { paddingHorizontal: spacing[8], paddingVertical: spacing[8] }
          : {
              paddingHorizontal: layout.gutter,
              paddingTop: spacing[8],
              paddingBottom: spacing[12],
            },
      ]}
    >
      {onBack ? (
        <Pressable
          {...focusHandlers}
          testID={testID ? `${testID}-back` : undefined}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={({ pressed }) => [
            {
              width: layout.minHit,
              height: layout.minHit,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: pressed ? colors.press : 'transparent',
            },
            focused && focusRing(colors.ink, true),
          ]}
        >
          <Back size={controls.icon} color={colors.ink} />
        </Pressable>
      ) : null}
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          onBack ? textStyle('heading', 18, archivo) : textStyle('title', 32, archivo),
          { flex: 1, color: colors.ink },
        ]}
      >
        {title}
      </Text>
      {action ? (
        <Button
          variant="text"
          label={action.label}
          onPress={action.onPress}
          testID={testID ? `${testID}-action` : undefined}
          // The source insets the action 20 from the edge, like the gutter.
          style={{ alignSelf: 'center', marginRight: layout.gutter - spacing[8] - spacing[4] }}
        />
      ) : null}
    </View>
  );
}
