// Small pieces the Sudoku screens share. Generic controls come from `@inlay/ui`.
import {
  controls,
  layout,
  spacing,
  strokes,
  TabBar,
  tabularNums,
  textStyle,
  useHostTheme,
  type TabBarTab,
} from '@inlay/disguise-sdk';
import { Children, type ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Screen } from '../state/store';
import { strings } from '../strings';
import { SettingsGlyph, StatsGlyph, TodayGlyph } from './glyphs';

/** An uppercase label over a section ("This week", "Game", "About"); 11 points unless `size`. */
export function SectionLabel({
  children,
  size = 11,
  style,
}: {
  children: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, archivo } = useHostTheme();
  return (
    <View style={style}>
      <Text style={[textStyle('label', size, archivo), { color: colors.muted }]}>{children}</Text>
    </View>
  );
}

/** Rows on the screen's ground, each with a hairline above it. */
export function Rows({ children, inset = 0 }: { children: ReactNode; inset?: number }) {
  const { colors } = useHostTheme();
  return (
    <View>
      {Children.toArray(children).map((row, index) => (
        <View
          key={index}
          style={{
            paddingHorizontal: inset,
            borderTopWidth: strokes.hairline,
            borderTopColor: colors.hair2,
          }}
        >
          {row}
        </View>
      ))}
    </View>
  );
}

/** ListRow pads 16; the UI Source's rows on the ground sit at the 20 gutter. */
export const rowInset = layout.gutter - spacing[16];

/** A small label over a large tabular figure ("Solved 214"). */
export function Figure({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) {
  const { colors, archivo } = useHostTheme();
  return (
    <View testID={testID} style={{ gap: spacing[4] }}>
      <SectionLabel size={10}>{label}</SectionLabel>
      <Text
        style={[
          textStyle('heading', 22, archivo),
          { color: colors.ink, fontVariant: [...tabularNums] },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** The 26-point app mark beside the Today title: the icon's grid on the accent. */
export function AppMark() {
  const { colors } = useHostTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: colors.accent,
        padding: 5,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <View
          key={i}
          style={{ width: 4, height: 4, backgroundColor: colors.on, opacity: i === 2 ? 1 : 0.4 }}
        />
      ))}
    </View>
  );
}

type Tab = Extract<Screen, 'today' | 'stats' | 'settings'>;

const tabs: readonly TabBarTab<Tab>[] = [
  {
    key: 'today',
    label: strings.tabs.today,
    icon: (color) => <TodayGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'stats',
    label: strings.tabs.stats,
    icon: (color) => <StatsGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'settings',
    label: strings.tabs.settings,
    icon: (color) => <SettingsGlyph size={controls.icon} color={color} />,
  },
];

export function isTab(screen: Screen): screen is Tab {
  return tabs.some((tab) => tab.key === screen);
}

export function Tabs({
  value,
  onChange,
  bottomInset,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
  bottomInset: number;
}) {
  return (
    <TabBar
      tabs={tabs}
      value={value}
      onChange={onChange}
      bottomInset={bottomInset}
      testID="sudoku-tabs"
    />
  );
}
