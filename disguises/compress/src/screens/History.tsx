import { EmptyState, layout, ScreenHeader, spacing } from '@inlay/disguise-sdk';
import { ScrollView, View } from 'react-native';

import { useStore } from '../state/store';
import { strings } from '../strings';
import { RunRow } from './Home';
import { rowInset, Rows } from './parts';

export function History() {
  const { state } = useStore();
  const { runs } = state.history;
  return (
    <View testID="compress-history" style={{ flex: 1 }}>
      <ScreenHeader title={strings.history.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        {runs.length === 0 ? (
          <View style={{ marginHorizontal: layout.gutter }}>
            <EmptyState
              title={strings.history.emptyTitle}
              body={strings.history.emptyBody}
              testID="compress-history-empty"
            />
          </View>
        ) : (
          <Rows inset={rowInset}>
            {runs.map((run, index) => (
              <RunRow key={`${run.at}-${index}`} run={run} testID={`compress-run-${index}`} />
            ))}
          </Rows>
        )}
      </ScrollView>
    </View>
  );
}
