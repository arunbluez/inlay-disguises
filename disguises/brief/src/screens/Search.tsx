import { EmptyState } from '@inlay/disguise-sdk';

import { searchStories, useStore } from '../state/store';
import { strings } from '../strings';
import { StoryList } from './parts';

/** Search results over the cached stories, as cards; "No results" when nothing matches. */
export function Search() {
  const { state } = useStore();
  return (
    <StoryList
      stories={searchStories(state)}
      empty={
        <EmptyState
          title={strings.search.emptyTitle}
          body={strings.search.emptyBody}
          testID="brief-search-empty"
        />
      }
      testID="brief-results"
    />
  );
}
