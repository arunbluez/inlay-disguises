import { ChipRow, layout, ListRow, ScreenHeader, spacing } from '@inlay/disguise-sdk';
import { ScrollView, View } from 'react-native';

import packageJson from '../../package.json';
import { sources } from '../feeds/defaults';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { rowInset, Rows, SectionLabel } from './parts';

const layoutOptions = [
  { value: 'list', label: strings.settings.list },
  { value: 'shorts', label: strings.settings.shorts },
] as const;

/** Layout (List or Shorts), the way into Sources, and About: name, version and licences only. */
export function Settings() {
  const { state, go, setLayout } = useStore();
  const label = { paddingHorizontal: layout.gutter, paddingBottom: spacing[8] };
  const on = sources.filter((source) => !state.off.includes(source.id)).length;
  return (
    <View testID="brief-settings" style={{ flex: 1 }}>
      <ScreenHeader title={strings.settings.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        <SectionLabel style={[label, { paddingTop: spacing[16] }]}>
          {strings.settings.layout}
        </SectionLabel>
        <View style={{ paddingHorizontal: layout.gutter }}>
          <ChipRow
            options={layoutOptions}
            value={state.layout}
            onChange={setLayout}
            testID="brief-layout"
          />
        </View>
        <SectionLabel style={[label, { paddingTop: spacing[24] }]}>
          {strings.settings.feeds}
        </SectionLabel>
        <Rows inset={rowInset}>
          <ListRow
            title={strings.settings.sources}
            value={strings.settings.sourcesOn(on, sources.length)}
            onPress={() => go('sources')}
            testID="brief-settings-sources"
          />
        </Rows>
        <SectionLabel style={[label, { paddingTop: spacing[24] }]}>
          {strings.settings.about}
        </SectionLabel>
        <View testID="brief-about">
          <Rows inset={rowInset}>
            <ListRow title={strings.settings.name} value={strings.appName} />
            <ListRow title={strings.settings.version} value={packageJson.version} />
            <ListRow title={strings.settings.licence} value={strings.settings.licenceValue} />
            <ListRow title={strings.settings.parser} value={strings.settings.parserLicence} />
          </Rows>
        </View>
      </ScrollView>
    </View>
  );
}
