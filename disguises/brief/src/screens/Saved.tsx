import { EmptyState, ScreenHeader } from '@inlay/disguise-sdk';
import { View } from 'react-native';

import { useStore } from '../state/store';
import { strings } from '../strings';
import { StoryList } from './parts';

/** Saved for later: the stories saved from Feed or Shorts, newest save first. */
export function Saved() {
  const { state } = useStore();
  return (
    <View testID="brief-saved" style={{ flex: 1 }}>
      <ScreenHeader title={strings.saved.title} />
      <StoryList
        stories={state.saved}
        empty={
          <EmptyState
            title={strings.saved.emptyTitle}
            body={strings.saved.emptyBody}
            testID="brief-saved-empty"
          />
        }
        testID="brief-saved-list"
      />
    </View>
  );
}
