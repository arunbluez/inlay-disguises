import { layout, ListRow, ScreenHeader, spacing } from '@inlay/disguise-sdk';
import { ScrollView, View } from 'react-native';

import packageJson from '../../package.json';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { rowInset, Rows, SectionLabel } from './parts';

/**
 * Defaults (what a new compression starts with: the last quality and format used) and About,
 * which shows the name and version only.
 */
export function Settings() {
  const { state } = useStore();
  const { quality, format } = state.defaults;
  const label = { paddingHorizontal: layout.gutter, paddingBottom: spacing[8] };
  return (
    <View testID="compress-settings" style={{ flex: 1 }}>
      <ScreenHeader title={strings.settings.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        <SectionLabel style={[label, { paddingTop: spacing[16] }]}>
          {strings.settings.defaults}
        </SectionLabel>
        <Rows inset={rowInset}>
          <ListRow
            title={strings.settings.quality}
            value={`${quality}%`}
            testID="compress-default-quality"
          />
          <ListRow
            title={strings.settings.format}
            value={format === 'jpeg' ? strings.setup.formatJpeg : strings.setup.formatOriginal}
            testID="compress-default-format"
          />
        </Rows>
        <SectionLabel style={[label, { paddingTop: spacing[24] }]}>
          {strings.settings.about}
        </SectionLabel>
        <View testID="compress-about">
          <Rows inset={rowInset}>
            <ListRow title={strings.settings.name} value={strings.appName} />
            <ListRow title={strings.settings.version} value={packageJson.version} />
          </Rows>
        </View>
      </ScrollView>
    </View>
  );
}
