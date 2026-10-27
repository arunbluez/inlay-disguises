import {
  Button,
  Chip,
  controls,
  layout,
  NumberField,
  ScreenHeader,
  spacing,
  strokes,
  textStyle,
  useBottomInset,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View, type HostInstance } from 'react-native';

import { MAX_PUZZLE } from '../engine/generator';
import { PUZZLE_NUMBER_MAX_DIGITS, puzzleNumber, useStore } from '../state/store';
import { strings } from '../strings';
import { PlayGlyph } from './glyphs';

/** Quick picks: the latest puzzles solved, newest first. */
const RECENT_PICKS = 3;

/** Play puzzle #: type a number, then Play opens that puzzle. */
export function PlayNumber() {
  const store = useStore();
  const { colors, archivo } = useHostTheme();
  const bottomInset = useBottomInset();
  const [text, setText] = useState('');
  const recent = [...new Set(store.state.stats.recent.map((solve) => solve.n).reverse())].slice(
    0,
    RECENT_PICKS,
  );
  // Keep Play above the keyboard: KeyboardAvoidingView measures against its parent, so tell it
  // where the screen starts below the host's safe area or banner.
  const frame = useRef<HostInstance>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  return (
    <View
      ref={frame}
      style={{ flex: 1 }}
      onLayout={() => frame.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}
    >
      <KeyboardAvoidingView
        testID="sudoku-play-number"
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
        style={{ flex: 1 }}
      >
        <View style={{ borderBottomWidth: strokes.rule, borderBottomColor: colors.rule }}>
          <ScreenHeader
            title={strings.playNumber.title}
            onBack={() => store.go('today')}
            testID="sudoku-play-number-header"
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 28,
            paddingHorizontal: layout.gutter,
            gap: spacing[12],
          }}
        >
          <NumberField
            label={strings.playNumber.label}
            placeholder={strings.playNumber.placeholder}
            value={text}
            onChangeText={setText}
            maxLength={PUZZLE_NUMBER_MAX_DIGITS}
            testID="sudoku-puzzle-number"
          />
          <Text
            style={[textStyle('caption', 13, archivo), { lineHeight: 19, color: colors.muted }]}
          >
            {strings.playNumber.help(MAX_PUZZLE)}
          </Text>
          {recent.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {recent.map((n) => (
                <Chip
                  key={n}
                  label={strings.number(n)}
                  numeric
                  onPress={() => setText(String(n))}
                  testID={`sudoku-recent-${n}`}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View
          style={{
            paddingHorizontal: layout.gutter,
            paddingTop: spacing[12],
            paddingBottom: spacing[12] + bottomInset,
            borderTopWidth: strokes.rule,
            borderTopColor: colors.rule,
          }}
        >
          <Button
            label={strings.playNumber.play}
            trailing={<PlayGlyph size={controls.icon} color={colors.on} />}
            disabled={text === ''}
            onPress={() => store.play(puzzleNumber(text))}
            onHold={() => store.hold(text)}
            onHoldEnd={() => store.release(text)}
            testID="sudoku-play-number-play"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
