// Small pieces the Compress screens share. Generic controls come from `@inlay/ui`.
import {
  controls,
  layout,
  spacing,
  strokes,
  TabBar,
  textStyle,
  useHostTheme,
  type TabBarTab,
} from '@inlay/disguise-sdk';
import { Children, type ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Screen } from '../state/store';
import { strings } from '../strings';
import { CompressGlyph, HistoryGlyph, SettingsGlyph } from './glyphs';

/** An 11-point uppercase label over a section ("Saved so far", "Recent", "Defaults"). */
export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, archivo } = useHostTheme();
  return (
    <View style={style}>
      <Text style={[textStyle('label', 11, archivo), { color: colors.muted }]}>{children}</Text>
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

/** FileRow and ListRow pad 16; the UI Source's rows on the ground sit at the 20 gutter. */
export const rowInset = layout.gutter - spacing[16];

/** The 26-point app mark beside the Home title: the icon's squares on the accent. */
export function AppMark() {
  const { colors } = useHostTheme();
  return (
    <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: colors.accent }}>
      <View
        style={{
          position: 'absolute',
          right: 5,
          top: 5,
          width: 12,
          height: 12,
          borderWidth: strokes.rule,
          borderColor: colors.on,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 5,
          bottom: 5,
          width: 6,
          height: 6,
          backgroundColor: colors.on,
        }}
      />
    </View>
  );
}

type Tab = Extract<Screen, 'home' | 'history' | 'settings'>;

const tabs: readonly TabBarTab<Tab>[] = [
  {
    key: 'home',
    label: strings.tabs.home,
    icon: (color) => <CompressGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'history',
    label: strings.tabs.history,
    icon: (color) => <HistoryGlyph size={controls.icon} color={color} />,
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
      testID="compress-tabs"
    />
  );
}
