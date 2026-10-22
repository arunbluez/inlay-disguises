import {
  ActionCard,
  Button,
  ChipRow,
  controls,
  FileRow,
  layout,
  NumberField,
  ScreenHeader,
  Slider,
  spacing,
  strokes,
  tabularNums,
  textStyle,
  useBottomInset,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View, type HostInstance } from 'react-native';

import { QUALITY_FLOOR, type OutputFormat } from '../engine/compress';
import { estimateBytes, formatBytes, targetBytes } from '../state/format';
import { useKeyboardHeight } from '../state/keyboard';
import { TARGET_SIZE_MAX_DIGITS, useStore } from '../state/store';
import { strings } from '../strings';
import { CompressGlyph, PlusGlyph } from './glyphs';
import { rowInset, Rows, SectionLabel } from './parts';

const formats = [
  { value: 'original', label: strings.setup.formatOriginal },
  { value: 'jpeg', label: strings.setup.formatJpeg },
] as const satisfies readonly { value: OutputFormat; label: string }[];

/** A titled block between hairlines, padded to the gutter. */
function Block({ children }: { children: ReactNode }) {
  const { colors } = useHostTheme();
  return (
    <View
      style={{
        paddingVertical: spacing[16],
        paddingHorizontal: layout.gutter,
        borderTopWidth: strokes.hairline,
        borderTopColor: colors.hair2,
      }}
    >
      {children}
    </View>
  );
}

/** One half of the Original / Estimated row. */
function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors, archivo } = useHostTheme();
  return (
    <View style={{ flex: 1, paddingVertical: spacing[12], paddingHorizontal: layout.gutter }}>
      <Text style={[textStyle('label', 10, archivo), { color: colors.muted }]}>{label}</Text>
      <Text
        style={[
          textStyle('heading', 20, archivo),
          {
            marginTop: spacing[4],
            color: accent ? colors.deep : colors.ink,
            fontVariant: [...tabularNums],
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function Setup() {
  const store = useStore();
  const { state } = store;
  const { colors, archivo } = useHostTheme();
  const count = state.photos.length;
  const original = state.photos.reduce((sum, photo) => sum + photo.bytes, 0);
  const estimate = estimateBytes(
    state.photos.map((photo) => photo.bytes),
    state.quality,
    targetBytes(state.targetSize),
  );
  const heading = [textStyle('action', 15, archivo), { color: colors.ink }];
  // Keep the Compress button above the keyboard on both platforms (Android draws edge to edge, so
  // the window no longer resizes for it). KeyboardAvoidingView measures itself against its parent,
  // not the window, so wherever the host places this screen below the top (a safe area, a banner),
  // the keyboard would still cover the button by that much: tell it where the screen starts.
  const frame = useRef<HostInstance>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  // The button bar reaches the bottom edge; a keyboard that covers more than the system area there
  // lifts the bar, which then sits on it with no extra space. A floating keyboard toolbar covers
  // nothing, so the screen stays as it is.
  const bottomInset = useBottomInset();
  const keyboardOpen = useKeyboardHeight() > bottomInset;

  return (
    <View
      ref={frame}
      style={{ flex: 1 }}
      onLayout={() => frame.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}
    >
      <KeyboardAvoidingView
        testID="compress-setup"
        behavior="padding"
        enabled={keyboardOpen}
        keyboardVerticalOffset={keyboardOffset}
        style={{ flex: 1 }}
      >
        <ScreenHeader
          title={strings.setup.title}
          onBack={() => store.go('home')}
          action={
            count > 0 ? { label: strings.setup.clear, onPress: store.clearPhotos } : undefined
          }
          testID="compress-setup-header"
        />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: layout.gutter,
              paddingRight: layout.gutter - spacing[4],
              paddingTop: spacing[8],
            }}
          >
            <SectionLabel>{strings.setup.files(count)}</SectionLabel>
            {count > 0 ? (
              <Button
                variant="text"
                label={strings.setup.add}
                trailing={<PlusGlyph size={16} color={colors.deep} />}
                onPress={store.addPhotos}
                testID="compress-add"
              />
            ) : null}
          </View>
          {count === 0 ? (
            <View
              style={{
                marginHorizontal: spacing[16],
                marginTop: spacing[12],
                marginBottom: spacing[16],
              }}
            >
              <ActionCard
                compact
                title={strings.setup.addTitle}
                subtitle={strings.setup.addSubtitle}
                onPress={store.addPhotos}
                testID="compress-add-files"
              />
            </View>
          ) : (
            <Rows inset={rowInset}>
              {state.photos.map((photo, index) => (
                <FileRow
                  key={photo.uri}
                  badge={photo.ext}
                  title={photo.name}
                  meta={formatBytes(photo.bytes)}
                  onRemove={() => store.removePhoto(photo.uri)}
                  testID={`compress-file-${index}`}
                />
              ))}
            </Rows>
          )}
          <Block>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={heading}>{strings.setup.quality}</Text>
              <Text
                style={[heading, { fontVariant: [...tabularNums] }]}
              >{`${state.quality}%`}</Text>
            </View>
            <Slider
              value={state.quality}
              onValueChange={store.setQuality}
              minimumValue={QUALITY_FLOOR}
              maximumValue={100}
              step={5}
              accessibilityLabel={strings.setup.quality}
              testID="compress-quality"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[textStyle('caption', 12, archivo), { color: colors.muted }]}>
                {strings.setup.smaller}
              </Text>
              <Text style={[textStyle('caption', 12, archivo), { color: colors.muted }]}>
                {strings.setup.sharper}
              </Text>
            </View>
          </Block>
          <Block>
            <Text style={[heading, { marginBottom: spacing[12] }]}>{strings.setup.format}</Text>
            <ChipRow
              options={formats}
              value={state.format}
              onChange={store.setFormat}
              testID="compress-format"
            />
          </Block>
          <Block>
            <NumberField
              label={strings.setup.targetSize}
              placeholder={strings.setup.targetPlaceholder}
              unit={strings.setup.targetUnit}
              helper={strings.setup.targetHelp}
              value={state.targetSize}
              onChangeText={store.setTargetSize}
              maxLength={TARGET_SIZE_MAX_DIGITS}
              testID="compress-target-size"
            />
          </Block>
          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: strokes.hairline,
              borderTopColor: colors.hair2,
            }}
          >
            <Figure
              label={strings.setup.original}
              value={count > 0 ? formatBytes(original) : strings.setup.none}
            />
            <View style={{ width: strokes.hairline, backgroundColor: colors.hair2 }} />
            <Figure
              label={strings.setup.estimated}
              value={count > 0 ? strings.setup.estimate(formatBytes(estimate)) : strings.setup.none}
              accent
            />
          </View>
        </ScrollView>
        <View
          style={{
            paddingHorizontal: layout.gutter,
            paddingTop: spacing[12],
            paddingBottom: spacing[12] + (keyboardOpen ? 0 : bottomInset),
            backgroundColor: colors.bar,
          }}
        >
          <Button
            label={strings.setup.run(count)}
            trailing={<CompressGlyph size={controls.icon} color={colors.on} />}
            onPress={store.compress}
            onHold={store.hold}
            onHoldEnd={store.release}
            testID="compress-run"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
