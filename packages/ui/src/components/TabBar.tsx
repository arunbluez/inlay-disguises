import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, fontFamily, layout, strokes, typeScale } from '../tokens';

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

/** Bottom tabs on the surface colour; the active tab is accent with an inset bar along its top. */
export function TabBar<Key extends string>({ tabs, value, onChange, testID }: TabBarProps<Key>) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.surface }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        const color = selected ? colors.accent : colors.muted;
        return (
          <Pressable
            key={tab.key}
            testID={testID ? `${testID}-${tab.key}` : undefined}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              height: tab.icon ? controls.tab.height : controls.tab.heightNoIcon,
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: controls.tab.gap,
              paddingHorizontal: layout.gutter,
            }}
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
            <Text
              style={{ fontFamily: fontFamily[600], fontSize: typeScale.label.sizes[1], color }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
