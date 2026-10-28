// Small pieces the Brief screens share. Generic controls come from `@inlay/ui`.
import {
  Button,
  Chip,
  controls,
  layout,
  radii,
  spacing,
  strokes,
  TabBar,
  textStyle,
  useHostTheme,
  type TabBarTab,
} from '@inlay/disguise-sdk';
import { Children, useCallback, useState, type ReactNode } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ListViewToken,
} from 'react-native';

import { sourceById } from '../feeds/defaults';
import type { Story } from '../feeds/parse';
import { useStoryImage } from '../images';
import { useStore, type Screen, type TopicFilter } from '../state/store';
import { strings } from '../strings';
import { FeedGlyph, SavedGlyph, SettingsGlyph } from './glyphs';

/** Stories whose images load before the list reports what is on screen. */
const FIRST_VISIBLE = 3;

/** An 11-point uppercase label over a section ("Layout", "About"). */
export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, archivo } = useHostTheme();
  return (
    <View style={style}>
      <Text style={[textStyle('label', 11, archivo), { color: colors.muted }]}>{children}</Text>
    </View>
  );
}

/** Rows on the screen's ground, each with a hairline above it. */
export function Rows({ children, inset = 0 }: { children: ReactNode; inset?: number }) {
  const { colors } = useHostTheme();
  return (
    <View>
      {Children.toArray(children).map((row, index) => (
        <View
          key={index}
          style={{
            paddingHorizontal: inset,
            borderTopWidth: strokes.hairline,
            borderTopColor: colors.hair2,
          }}
        >
          {row}
        </View>
      ))}
    </View>
  );
}

/** ListRow pads 16; rows on the ground sit at the 20 gutter. */
export const rowInset = layout.gutter - spacing[16];

/** The 26-point app mark beside the masthead: the icon's bars on the accent. */
export function AppMark() {
  const { colors } = useHostTheme();
  const bar = { height: 2, backgroundColor: colors.on };
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: colors.accent,
        paddingHorizontal: 5,
        paddingVertical: 6,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ height: 4, backgroundColor: colors.on }} />
      <View style={bar} />
      <View style={bar} />
      <View style={[bar, { width: '58%' }]} />
    </View>
  );
}

/** The story's source and age: "BBC World · 3h". */
export function storyMeta(story: Story): string {
  return strings.story.meta(sourceById(story.source)?.name ?? '', story.published, Date.now());
}

/**
 * The story's image, filling the width at `aspectRatio` (or `height`): a recess while it loads,
 * nothing at all when the story has none or it failed. Loads only while `active`.
 */
export function StoryImage({
  story,
  active,
  style,
}: {
  story: Story;
  active: boolean;
  style: { aspectRatio: number } | { height: number };
}) {
  const { colors } = useHostTheme();
  const { images } = useStore();
  const uri = useStoryImage(images, story.image, active);
  if (uri === null) return null;
  return uri === undefined ? (
    <View style={[{ width: '100%', backgroundColor: colors.press }, style]} />
  ) : (
    <Image
      testID={`brief-image-${story.id}`}
      source={{ uri }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
      style={[{ width: '100%' }, style]}
    />
  );
}

/** Save for later, or Saved (pressing it again takes the story out of Saved). */
export function SaveToggle({ story, testID }: { story: Story; testID?: string }) {
  const { isSaved, toggleSaved } = useStore();
  const saved = isSaved(story);
  return (
    <Button
      variant="text"
      label={saved ? strings.story.unsave : strings.story.save}
      onPress={() => toggleSaved(story)}
      testID={testID}
    />
  );
}

/** A story as a card: image (or none), headline, source and age, Save. Tapping it opens it. */
export function StoryCard({
  story,
  active,
  testID,
}: {
  story: Story;
  active: boolean;
  testID: string;
}) {
  const { colors, archivo } = useHostTheme();
  const { open } = useStore();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={story.title}
      onPress={() => open(story)}
      style={({ pressed }) => ({
        borderRadius: radii.card,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <StoryImage story={story} active={active} style={{ aspectRatio: 16 / 9 }} />
      <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12] }}>
        <Text numberOfLines={3} style={[textStyle('heading', 18, archivo), { color: colors.ink }]}>
          {story.title}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[8],
          }}
        >
          <Text
            numberOfLines={1}
            style={[textStyle('caption', 13, archivo), { flex: 1, color: colors.muted }]}
          >
            {storyMeta(story)}
          </Text>
          <SaveToggle story={story} testID={`${testID}-save`} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Tracks which items of a list are on screen, so only those and their neighbours load images.
 * `onViewableItemsChanged` is stable, as `FlatList` requires.
 */
export function useOnScreen(firstLast = FIRST_VISIBLE - 1) {
  const [range, setRange] = useState({ first: 0, last: firstLast });
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
      const indexes = viewableItems
        .map((item) => item.index)
        .filter((index): index is number => index !== null);
      if (indexes.length > 0) {
        setRange({ first: Math.min(...indexes), last: Math.max(...indexes) });
      }
    },
    [],
  );
  const isNear = (index: number) => index >= range.first - 1 && index <= range.last + 1;
  return { isNear, onViewableItemsChanged };
}

/** Stories as cards, with an empty state, and pull to refresh when `onRefresh` is given. */
export function StoryList({
  stories,
  empty,
  onRefresh,
  refreshing = false,
  testID,
}: {
  stories: readonly Story[];
  empty: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  testID: string;
}) {
  const { colors } = useHostTheme();
  const { isNear, onViewableItemsChanged } = useOnScreen();
  return (
    <FlatList
      testID={testID}
      data={stories}
      keyExtractor={(story) => story.id}
      renderItem={({ item, index }) => (
        <StoryCard story={item} active={isNear(index)} testID={`${testID}-${index}`} />
      )}
      onViewableItemsChanged={onViewableItemsChanged}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={<View>{empty}</View>}
      contentContainerStyle={{
        paddingHorizontal: layout.gutter,
        paddingTop: spacing[8],
        paddingBottom: spacing[24],
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    />
  );
}

function Separator() {
  return <View style={{ height: spacing[12] }} />;
}

const topics: readonly TopicFilter[] = ['all', 'news', 'tech', 'sport', 'science'];

/** Space above and below each chip, so its 44-point hit target lies inside the scroll. */
const topicInset = (layout.minHit - controls.chip.height) / 2;

/**
 * All / News / Tech / Sport / Science, over Feed in both layouts: chips from the gutter, the
 * chosen one filled; the row scrolls sideways when it doesn't fit.
 */
export function TopicTabs() {
  const { state, setTopic } = useStore();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="brief-topics"
      style={{ flexGrow: 0, flexShrink: 0, marginBottom: spacing[8] - topicInset }}
      contentContainerStyle={{ gap: spacing[12], paddingHorizontal: layout.gutter }}
    >
      {topics.map((topic) => (
        <View key={topic} style={{ paddingVertical: topicInset }}>
          <Chip
            label={strings.topics[topic]}
            selected={state.topic === topic}
            onPress={() => setTopic(topic)}
            testID={`brief-topics-${topic}`}
          />
        </View>
      ))}
    </ScrollView>
  );
}

type Tab = Extract<Screen, 'feed' | 'saved' | 'settings'>;

const tabs: readonly TabBarTab<Tab>[] = [
  {
    key: 'feed',
    label: strings.tabs.feed,
    icon: (color) => <FeedGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'saved',
    label: strings.tabs.saved,
    icon: (color) => <SavedGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'settings',
    label: strings.tabs.settings,
    icon: (color) => <SettingsGlyph size={controls.icon} color={color} />,
  },
];

export function isTab(screen: Screen): screen is Tab {
  return tabs.some((tab) => tab.key === screen);
}

export function Tabs({
  value,
  onChange,
  bottomInset,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
  bottomInset: number;
}) {
  return (
    <TabBar
      tabs={tabs}
      value={value}
      onChange={onChange}
      bottomInset={bottomInset}
      testID="brief-tabs"
    />
  );
}
