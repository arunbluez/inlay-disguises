import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, fontStyle, layout, strokes, typeScale } from '../tokens';
import { focusRing, useFocused } from './focus';

export interface TabBarTab<Key extends string> {
  key: Key;
  label: string;
  /** Draws the tab's glyph in the given colour (accent when active, muted otherwise). */
  icon?: (color: string) => ReactNode;
}

export interface TabBarProps<Key extends string> {
  tabs: readonly TabBarTab<Key>[];
  value: Key;
  onChange: (key: Key) => void;
  testID?: string;
}

/**
 * Bottom tabs on the bar colour; the active tab is accent with an inset bar along its top. Tabs
 * switch on release with no pressed tint: a tint under the 11-point label would drop it below AA.
 */
export function TabBar<Key extends string>({ tabs, value, onChange, testID }: TabBarProps<Key>) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.bar }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          selected={tab.key === value}
          onPress={() => onChange(tab.key)}
          testID={testID ? `${testID}-${tab.key}` : undefined}
        />
      ))}
    </View>
  );
}

interface TabProps<Key extends string> {
  tab: TabBarTab<Key>;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

function Tab<Key extends string>({ tab, selected, onPress, testID }: TabProps<Key>) {
  const { colors, archivo } = useTheme();
  const [focused, focusHandlers] = useFocused();
  const color = selected ? colors.accent : colors.muted;
  return (
    <Pressable
      {...focusHandlers}
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        {
          flex: 1,
          height: tab.icon ? controls.tab.height : controls.tab.heightNoIcon,
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: controls.tab.gap,
          paddingHorizontal: layout.gutter,
        },
        focused && focusRing(colors.ink, true),
      ]}
    >
      {selected ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: strokes.rule,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}
      {tab.icon?.(color)}
      <Text style={{ ...fontStyle(600, archivo), fontSize: typeScale.label.sizes[1], color }}>
        {tab.label}
      </Text>
    </Pressable>
  );
}
