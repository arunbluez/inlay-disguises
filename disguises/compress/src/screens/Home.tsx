import {
  ActionCard,
  Button,
  FileRow,
  layout,
  ListGroup,
  radii,
  spacing,
  tabularNums,
  textStyle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { ScrollView, Text, View } from 'react-native';

import { formatBytes, formatDay, formatSaving } from '../state/format';
import type { Run } from '../state/history';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { AppMark, SectionLabel } from './parts';

/** Rows of the Recent list on Home. */
const RECENT = 3;

/** One history entry as a file row: tile, name, day and count, saving and sizes. */
export function RunRow({ run, testID }: { run: Run; testID?: string }) {
  return (
    <FileRow
      badge={run.ext}
      title={run.name}
      meta={`${formatDay(run.at)} · ${strings.history.photos(run.photos)}`}
      value={formatSaving(run.before, run.after)}
      subValue={`${formatBytes(run.before)} → ${formatBytes(run.after)}`}
      testID={testID}
    />
  );
}

export function Home() {
  const { state, addPhotos, go } = useStore();
  const { colors, archivo } = useHostTheme();
  const recent = state.history.runs.slice(0, RECENT);
  return (
    <View testID="compress-home" style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[12],
          paddingHorizontal: layout.gutter,
          paddingTop: spacing[8],
          paddingBottom: spacing[12],
        }}
      >
        <AppMark />
        <Text
          accessibilityRole="header"
          style={[textStyle('heading', 22, archivo), { color: colors.ink }]}
        >
          {strings.appName}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[24] }}>
        <View
          testID="compress-saved"
          style={{
            marginTop: spacing[16],
            marginHorizontal: spacing[16],
            paddingTop: spacing[20],
            paddingHorizontal: spacing[20],
            paddingBottom: spacing[24],
            borderRadius: radii.card,
            backgroundColor: colors.surface,
          }}
        >
          <SectionLabel>{strings.home.savedLabel}</SectionLabel>
          <Text
            style={[
              textStyle('display', 60, archivo),
              { color: colors.ink, marginTop: spacing[8], fontVariant: [...tabularNums] },
            ]}
          >
            {formatBytes(state.history.savedBytes)}
          </Text>
          <Text
            style={[textStyle('body', 14, archivo), { color: colors.muted, marginTop: spacing[8] }]}
          >
            {strings.home.across(state.history.count)}
          </Text>
        </View>
        <View style={{ paddingHorizontal: spacing[16], paddingTop: spacing[12] }}>
          <ActionCard
            title={strings.home.addTitle}
            subtitle={strings.home.addSubtitle}
            onPress={addPhotos}
            testID="compress-add-files"
          />
        </View>
        {recent.length > 0 ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: layout.gutter,
                paddingRight: layout.gutter - spacing[4],
                paddingTop: spacing[12],
              }}
            >
              <SectionLabel>{strings.home.recent}</SectionLabel>
              <Button
                variant="text"
                label={strings.home.seeAll}
                onPress={() => go('history')}
                testID="compress-see-all"
              />
            </View>
            <View style={{ marginHorizontal: spacing[16] }}>
              <ListGroup testID="compress-recent">
                {recent.map((run, index) => (
                  <RunRow key={`${run.at}-${index}`} run={run} />
                ))}
              </ListGroup>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
