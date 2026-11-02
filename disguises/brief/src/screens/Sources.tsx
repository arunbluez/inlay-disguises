import {
  layout,
  ListRow,
  ScreenHeader,
  spacing,
  textStyle,
  Toggle,
  useBottomInset,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import { sources } from '../feeds/defaults';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { rowInset, Rows } from './parts';

/** The fixed feeds, each with its topic and an on/off switch. */
export function Sources() {
  const { state, go, setSourceOn } = useStore();
  const { colors, archivo } = useHostTheme();
  const bottomInset = useBottomInset();
  return (
    <View testID="brief-sources" style={{ flex: 1 }}>
      <ScreenHeader
        title={strings.sources.title}
        onBack={() => go('settings')}
        testID="brief-sources-header"
      />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] + bottomInset }}>
        <Text
          style={[
            textStyle('caption', 13, archivo),
            {
              color: colors.muted,
              paddingHorizontal: layout.gutter,
              paddingTop: spacing[8],
              paddingBottom: spacing[16],
            },
          ]}
        >
          {strings.sources.note}
        </Text>
        <Rows inset={rowInset}>
          {sources.map((source) => {
            const on = !state.off.includes(source.id);
            return (
              <ListRow
                key={source.id}
                title={source.name}
                value={strings.topics[source.topic]}
                trailing={
                  <Toggle
                    value={on}
                    onValueChange={(value) => setSourceOn(source.id, value)}
                    accessibilityLabel={source.name}
                    testID={`brief-source-${source.id}`}
                  />
                }
              />
            );
          })}
        </Rows>
      </ScrollView>
    </View>
  );
}
