import {
  layout,
  ListGroup,
  ListRow,
  ScreenHeader,
  spacing,
  textStyle,
  Toggle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import packageJson from '../../package.json';
import type { Switch } from '../state/storage';
import { useStore } from '../state/store';
import { strings } from '../strings';

const switches: readonly { key: Switch; title: string }[] = [
  { key: 'twentyFourHour', title: strings.settings.twentyFourHour },
  { key: 'showSeconds', title: strings.settings.showSeconds },
  { key: 'showDate', title: strings.settings.showDate },
];

function SectionLabel({ children }: { children: string }) {
  const { colors, archivo } = useHostTheme();
  return (
    <Text
      style={[
        textStyle('label', 11, archivo),
        { color: colors.muted, paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
      ]}
    >
      {children}
    </Text>
  );
}

/** Three display switches; About shows the name, version and licences only. */
export function Settings() {
  const { settings, setSwitch } = useStore();
  return (
    <View testID="dial-settings" style={{ flex: 1 }}>
      <ScreenHeader title={strings.settings.title} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: spacing[8],
          paddingBottom: spacing[24],
          gap: spacing[24],
        }}
      >
        <View>
          <SectionLabel>{strings.settings.display}</SectionLabel>
          <ListGroup>
            {switches.map(({ key, title }) => (
              <ListRow
                key={key}
                title={title}
                trailing={
                  <Toggle
                    value={settings[key]}
                    onValueChange={(value) => setSwitch(key, value)}
                    accessibilityLabel={title}
                    testID={`dial-setting-${key}`}
                  />
                }
              />
            ))}
          </ListGroup>
        </View>
        <View testID="dial-about">
          <SectionLabel>{strings.settings.about}</SectionLabel>
          <ListGroup>
            <ListRow title={strings.settings.name} value={strings.appName} />
            <ListRow title={strings.settings.version} value={packageJson.version} />
            <ListRow title={strings.settings.licence} value={strings.settings.licenceValue} />
          </ListGroup>
        </View>
      </ScrollView>
    </View>
  );
}
