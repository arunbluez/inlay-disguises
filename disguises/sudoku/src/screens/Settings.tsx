import { layout, ListRow, ScreenHeader, Sheet, spacing, Toggle } from '@inlay/disguise-sdk';
import { ScrollView, View } from 'react-native';

import packageJson from '../../package.json';
import type { Settings as SettingsValues } from '../state/storage';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { rowInset, Rows, SectionLabel } from './parts';

const toggles: readonly { key: keyof SettingsValues; title: string }[] = [
  { key: 'showTimer', title: strings.settings.showTimer },
  { key: 'matching', title: strings.settings.matching },
  { key: 'mistakes', title: strings.settings.mistakes },
];

/** Game options and How to play; About shows the name, version and licence only. */
export function Settings() {
  const { state, setSetting, setRulesOpen } = useStore();
  const label = { paddingHorizontal: layout.gutter, paddingBottom: spacing[8] };
  return (
    <View testID="sudoku-settings" style={{ flex: 1 }}>
      <ScreenHeader title={strings.settings.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        <SectionLabel style={[label, { paddingTop: spacing[16] }]}>
          {strings.settings.game}
        </SectionLabel>
        <Rows inset={rowInset}>
          {toggles.map(({ key, title }) => (
            <ListRow
              key={key}
              title={title}
              trailing={
                <Toggle
                  value={state.settings[key]}
                  onValueChange={(value) => setSetting(key, value)}
                  accessibilityLabel={title}
                  testID={`sudoku-setting-${key}`}
                />
              }
            />
          ))}
          <ListRow
            title={strings.settings.rules}
            onPress={() => setRulesOpen(true)}
            testID="sudoku-rules"
          />
        </Rows>
        <SectionLabel style={[label, { paddingTop: spacing[24] }]}>
          {strings.settings.about}
        </SectionLabel>
        <View testID="sudoku-about">
          <Rows inset={rowInset}>
            <ListRow title={strings.settings.name} value={strings.appName} />
            <ListRow title={strings.settings.version} value={packageJson.version} />
            <ListRow title={strings.settings.licence} value={strings.settings.licenceValue} />
          </Rows>
        </View>
      </ScrollView>
      <Sheet
        visible={state.rulesOpen}
        onClose={() => setRulesOpen(false)}
        title={strings.settings.rules}
        note={strings.settings.rulesBody}
        testID="sudoku-rules-sheet"
      />
    </View>
  );
}
