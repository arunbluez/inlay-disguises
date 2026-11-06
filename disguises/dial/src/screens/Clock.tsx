import {
  Button,
  controls,
  layout,
  ScreenHeader,
  Sheet,
  spacing,
  tabularNums,
  textStyle,
  useHostTheme,
} from '@inlay/disguise-sdk';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Dial } from '../Dial';
import { BackspaceGlyph } from './glyphs';
import { useStore } from '../state/store';
import { strings } from '../strings';
import { themeById } from '../themes';
import { formatTime } from '../time';

/** The home dial never grows past this, so it stays a clock on a large phone. */
const MAX_DIAL = 380;
/** The set-mode readout before a hand is turned. */
const DIMMED = 0.4;
/** The digits kept in set mode: there for the one setting the hands, faint to anyone else. */
const FAINT = 0.28;

/** Home: the dial, the date and the second time; set mode for the second time. */
export function Clock() {
  const store = useStore();
  const { colors, archivo } = useHostTheme();
  const { width } = useWindowDimensions();
  const { settings, set, secondTime } = store;
  const size = Math.min(width - 2 * layout.gutter, MAX_DIAL);

  return (
    <View testID="dial-clock" style={{ flex: 1 }}>
      <ScreenHeader title={strings.clock.title} />
      <View
        style={{ alignItems: 'center', paddingHorizontal: layout.gutter, paddingTop: spacing[8] }}
      >
        <Dial
          testID="dial-home"
          theme={themeById(settings.theme)}
          time={store.time}
          size={size}
          showSeconds={settings.showSeconds}
          interactive={{
            setTime: set?.minutes ?? null,
            onSetTime: store.turnHands,
            onHourRest: store.restHourHand,
            onCentrePress: store.centrePress,
            onCentreHold: store.centreHold,
            onCentreHoldEnd: store.centreHoldEnd,
            secondTime,
            onSubDialPress: () => store.setClearOpen(true),
          }}
        />
        <View style={{ alignItems: 'center', paddingTop: spacing[24], gap: spacing[8] }}>
          {set ? (
            <>
              <Pressable
                testID="dial-readout"
                accessibilityRole={settings.twentyFourHour ? 'button' : 'text'}
                disabled={!settings.twentyFourHour}
                onPress={store.toggleHalf}
                hitSlop={spacing[8]}
              >
                <Text
                  testID="dial-readout-text"
                  style={[
                    textStyle('display', 56, archivo),
                    {
                      color: colors.ink,
                      opacity: set.moved ? 1 : DIMMED,
                      fontVariant: [...tabularNums],
                    },
                  ]}
                >
                  {formatTime(set.minutes, settings.twentyFourHour)}
                </Text>
              </Pressable>
              <View
                testID="dial-digits"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[8],
                  minHeight: layout.minHit,
                  opacity: FAINT,
                }}
              >
                <Text
                  testID="dial-digits-text"
                  style={[
                    textStyle('heading', 22, archivo),
                    { color: colors.ink, letterSpacing: 4, fontVariant: [...tabularNums] },
                  ]}
                >
                  {store.digits}
                </Text>
                {store.digits ? (
                  <Pressable
                    testID="dial-delete"
                    accessibilityRole="button"
                    accessibilityLabel={strings.clock.deleteDigit}
                    onPress={store.deleteDigit}
                    hitSlop={spacing[8]}
                    style={{
                      minWidth: layout.minHit,
                      minHeight: layout.minHit,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BackspaceGlyph size={controls.icon} color={colors.ink} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={[textStyle('caption', 13, archivo), { color: colors.muted }]}>
                {strings.clock.setHint}
              </Text>
              <Button
                variant="text"
                label={strings.clock.cancel}
                onPress={store.cancelSet}
                testID="dial-cancel"
                style={{ alignSelf: 'center' }}
              />
            </>
          ) : (
            <>
              {settings.showDate ? (
                <Text
                  testID="dial-date"
                  style={[textStyle('heading', 20, archivo), { color: colors.ink }]}
                >
                  {strings.clock.date(store.now)}
                </Text>
              ) : null}
              {secondTime ? (
                <Text
                  testID="dial-second-time"
                  style={[
                    textStyle('body', 15, archivo),
                    { color: colors.muted, fontVariant: [...tabularNums] },
                  ]}
                >
                  {strings.clock.secondTime(
                    formatTime(secondTime.minutes, settings.twentyFourHour),
                  )}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
      <Sheet
        visible={store.clearOpen}
        onClose={() => store.setClearOpen(false)}
        title={strings.clock.clearTitle}
        note={strings.clock.clearNote}
        closeLabel={strings.clock.keep}
        testID="dial-clear-sheet"
      >
        <Button
          variant="destructive"
          label={strings.clock.clear}
          onPress={store.clearSecondTime}
          testID="dial-clear"
        />
      </Sheet>
    </View>
  );
}
