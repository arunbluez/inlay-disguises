import {
  layout,
  radii,
  ScreenHeader,
  spacing,
  strokes,
  textStyle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Dial } from '../Dial';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { dialThemes } from '../themes';

const COLUMNS = 2;
const GAP = spacing[12];

/** Every face as a live miniature; a tap applies it. */
export function Themes() {
  const store = useStore();
  const { colors, archivo } = useHostTheme();
  const { width } = useWindowDimensions();
  const tile = (width - 2 * layout.gutter - (COLUMNS - 1) * GAP) / COLUMNS;
  const dial = tile - 2 * spacing[20];

  return (
    <View testID="dial-themes" style={{ flex: 1 }}>
      <ScreenHeader title={strings.themes.title} />
      <ScrollView
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: GAP,
          paddingHorizontal: layout.gutter,
          paddingBottom: spacing[24],
        }}
      >
        {dialThemes.map((theme) => {
          const selected = theme.id === store.settings.theme;
          return (
            <Pressable
              key={theme.id}
              testID={`dial-theme-${theme.id}`}
              accessibilityRole="radio"
              accessibilityLabel={theme.name}
              accessibilityState={{ selected }}
              onPress={() => store.setTheme(theme.id)}
              style={({ pressed }) => ({
                width: tile,
                alignItems: 'center',
                gap: spacing[12],
                paddingVertical: spacing[16],
                borderRadius: radii.card,
                borderWidth: strokes.rule,
                borderColor: selected ? colors.accent : 'transparent',
                backgroundColor: pressed ? colors.press : colors.surface,
              })}
            >
              <Dial
                theme={theme}
                time={store.time}
                size={dial}
                showSeconds={store.settings.showSeconds}
              />
              <Text
                style={[
                  textStyle('action', 15, archivo),
                  { color: selected ? colors.deep : colors.ink },
                ]}
              >
                {theme.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
