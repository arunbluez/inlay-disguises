import { Button, layout, spacing, textStyle, useHostTheme } from '@inlay/disguise-sdk';
import { useState, type ReactNode } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import type { Story } from '../feeds/parse';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { SaveToggle, StoryImage, storyMeta, useOnScreen } from './parts';

/** Share of a page the image takes. */
const IMAGE_SHARE = 0.45;

/** A page counts as on screen once most of it shows (`FlatList` needs one stable object). */
const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

/** One story filling the page: image on top (or none), headline, gist, then the actions. */
function Page({
  story,
  height,
  active,
  testID,
}: {
  story: Story;
  height: number;
  active: boolean;
  testID: string;
}) {
  const { colors, archivo } = useHostTheme();
  const { open } = useStore();
  return (
    <View testID={testID} style={{ height, overflow: 'hidden' }}>
      <StoryImage story={story} active={active} style={{ height: height * IMAGE_SHARE }} />
      <View
        style={{
          flex: 1,
          gap: spacing[8],
          paddingHorizontal: layout.gutter,
          paddingTop: spacing[16],
          overflow: 'hidden',
        }}
      >
        <Text
          numberOfLines={1}
          style={[textStyle('caption', 13, archivo), { color: colors.muted }]}
        >
          {storyMeta(story)}
        </Text>
        <Text numberOfLines={4} style={[textStyle('heading', 22, archivo), { color: colors.ink }]}>
          {story.title}
        </Text>
        <Text style={[textStyle('body', 15, archivo), { flexShrink: 1, color: colors.ink }]}>
          {story.gist}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: layout.gutter - spacing[4],
          paddingVertical: spacing[4],
        }}
      >
        <Button
          variant="text"
          label={strings.story.more}
          onPress={() => open(story)}
          testID={`${testID}-more`}
        />
        <SaveToggle story={story} testID={`${testID}-save`} />
      </View>
    </View>
  );
}

/**
 * Shorts: the stories as a vertical pager, one per page; a swipe up snaps to the next. Images
 * load for the page on screen and the ones on either side.
 */
export function Shorts({ stories, empty }: { stories: readonly Story[]; empty: ReactNode }) {
  const { colors } = useHostTheme();
  const { state, refresh } = useStore();
  const [height, setHeight] = useState(0);
  const { isNear, onViewableItemsChanged } = useOnScreen(0);
  return (
    <View
      testID="brief-shorts-frame"
      style={{ flex: 1 }}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {stories.length === 0 ? (
        <View style={{ paddingHorizontal: layout.gutter, paddingTop: spacing[8] }}>{empty}</View>
      ) : height > 0 ? (
        <FlatList
          testID="brief-shorts"
          data={stories}
          keyExtractor={(story) => story.id}
          renderItem={({ item, index }) => (
            <Page
              story={item}
              height={height}
              active={isNear(index)}
              testID={`brief-shorts-${index}`}
            />
          )}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          initialNumToRender={2}
          windowSize={3}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={refresh}
              tintColor={colors.muted}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      ) : null}
    </View>
  );
}
