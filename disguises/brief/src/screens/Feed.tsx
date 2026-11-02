import {
  EmptyState,
  HoldArea,
  layout,
  spacing,
  TextField,
  textStyle,
  useHostTheme,
  useTrigger,
} from '@inlay/disguise-sdk';
import { Text, View } from 'react-native';

import { feedStories, useStore } from '../state/store';
import { strings } from '../strings';
import { AppMark, StoryList, TopicTabs } from './parts';
import { Search } from './Search';
import { Shorts } from './Shorts';

/**
 * The app mark and the "Brief" title at the top of Feed. Holding it for `motion.longPressCommit`
 * (600 ms) with text in Search sends that text as typed; it looks like a plain title throughout.
 */
function Masthead() {
  const { colors, archivo } = useHostTheme();
  const { state } = useStore();
  const trigger = useTrigger();
  const send = () => {
    if (state.query.trim() !== '') trigger.submit(state.query);
  };
  return (
    <HoldArea onHold={send} testID="brief-masthead-hold">
      <View
        testID="brief-masthead"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[12] }}
      >
        <AppMark />
        <Text
          accessibilityRole="header"
          style={[textStyle('heading', 22, archivo), { color: colors.ink }]}
        >
          {strings.appName}
        </Text>
      </View>
    </HoldArea>
  );
}

/**
 * Feed: the masthead and Search on top in both layouts; under them the topic tabs and the
 * stories as cards (List) or one per page (Shorts), or the search results while Search has text.
 */
export function Feed() {
  const { state, setQuery, refresh } = useStore();
  const searching = state.query.trim() !== '';
  const stories = feedStories(state);
  const empty = (
    <EmptyState
      title={strings.feed.emptyTitle}
      body={strings.feed.emptyBody}
      testID="brief-feed-empty"
    />
  );
  return (
    <View testID="brief-feed" style={{ flex: 1 }}>
      <View
        style={{
          gap: spacing[12],
          paddingHorizontal: layout.gutter,
          paddingTop: spacing[8],
          paddingBottom: spacing[12],
        }}
      >
        <Masthead />
        <TextField
          value={state.query}
          onChangeText={setQuery}
          placeholder={strings.feed.search}
          accessibilityLabel={strings.feed.search}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          testID="brief-search"
        />
      </View>
      {searching ? (
        <Search />
      ) : (
        <>
          <TopicTabs />
          {state.layout === 'shorts' ? (
            <Shorts key={state.topic} stories={stories} empty={empty} />
          ) : (
            <StoryList
              key={state.topic}
              stories={stories}
              empty={empty}
              onRefresh={refresh}
              refreshing={state.refreshing}
              testID="brief-list"
            />
          )}
        </>
      )}
    </View>
  );
}
