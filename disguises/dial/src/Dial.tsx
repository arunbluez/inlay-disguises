// One analog dial drawn with views: the face is a rounded view, ticks and numerals are placed by
// trigonometry, and each hand is a view turned about the dial's centre (rotate, then translateY
// so the hand's foot sits on the centre). The home dial, the Themes miniatures and the second-time
// sub-dial are all this component.
import { fontStyle, HoldArea, motion, tabularNums, useTheme } from '@inlay/disguise-sdk';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { paletteFor, type DialPalette, type DialTheme, type HandShape } from './themes';
import { angleToTime, numeral, pointToAngle, ringAt, timeToAngles, type Ring } from './time';

/** Diameter of the centre's hit area, drawn as the hands' cap. */
export const CENTRE_HIT = 56;
/** How long the hands take to sweep to 12:00 when set mode starts. */
export const SWEEP_MS = 500;
/** How long the seconds hand takes to step to the next second. */
const TICK_MS = 120;
/** The sub-dial's size, as a share of the main dial. */
export const SUB_SHARE = 0.28;
/** Where the sub-dial's centre sits below the main centre, as a share of the radius. */
const SUB_DROP = 0.42;

export interface DialTime {
  /** Minutes since midnight. */
  minutes: number;
  seconds: number;
}

/** What the home dial adds to a plain dial: the centre, set mode and the sub-dial. */
export interface DialInteraction {
  /** The time being set, while in set mode; `null` in live mode. */
  setTime: number | null;
  /** A drag turned a hand to a new time. */
  onSetTime: (minutes: number) => void;
  onCentrePress: () => void;
  onCentreHold: () => void;
  onCentreHoldEnd: () => void;
  /** The pinned second time, shown on the sub-dial in live mode. */
  secondTime: DialTime | null;
  onSubDialPress: () => void;
}

export interface DialProps {
  theme: DialTheme;
  time: DialTime;
  /** Diameter in points. */
  size: number;
  /** Present on the home dial only. */
  interactive?: DialInteraction;
  showSeconds?: boolean;
  /** `sub` draws hour ticks only and no numerals or seconds, for the small second-time dial. */
  detail?: 'full' | 'sub';
  testID?: string;
}

/** The value nearest `from` that shows the same angle as `to`, so a hand never spins backwards. */
function nearest(from: number, to: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta;
}

function rotation(value: Animated.Value) {
  return value.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
}

export function Dial({
  theme,
  time,
  size,
  interactive,
  showSeconds = true,
  detail = 'full',
  testID,
}: DialProps) {
  const { scheme, archivo } = useTheme();
  const palette = paletteFor(theme, scheme);
  const radius = size / 2;
  const setTime = interactive?.setTime ?? null;
  const setting = setTime !== null;

  const target = setting ? timeToAngles(setTime) : timeToAngles(time.minutes, time.seconds);
  const [hands] = useState(() => ({
    hour: new Animated.Value(target.hour),
    minute: new Animated.Value(target.minute),
    second: new Animated.Value(target.second),
  }));
  // Where each hand was last sent, unwrapped (it may pass 360).
  const at = useRef({ ...target });
  const sweep = useRef<Animated.CompositeAnimation | null>(null);
  const wasSetting = useRef(setting);

  useEffect(() => {
    const to = {
      hour: nearest(at.current.hour, target.hour),
      minute: nearest(at.current.minute, target.minute),
      second: nearest(at.current.second, target.second),
    };
    const entering = setting && !wasSetting.current;
    wasSetting.current = setting;
    at.current = to;

    if (entering) {
      // Set mode starts: both hands sweep to 12:00.
      sweep.current?.stop();
      const easing = Easing.bezier(...motion.ease);
      const run = Animated.parallel([
        Animated.timing(hands.hour, {
          toValue: to.hour,
          duration: SWEEP_MS,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(hands.minute, {
          toValue: to.minute,
          duration: SWEEP_MS,
          easing,
          useNativeDriver: true,
        }),
      ]);
      sweep.current = run;
      run.start(({ finished }) => {
        if (finished && sweep.current === run) sweep.current = null;
      });
      return;
    }
    if (setting && sweep.current) {
      // A drag during the sweep: the finger wins.
      sweep.current.stop();
      sweep.current = null;
    }
    if (!setting && sweep.current) {
      // Leaving set mode (confirm, cancel or a reset) stops a sweep that is still running.
      sweep.current.stop();
      sweep.current = null;
    }
    hands.hour.setValue(to.hour);
    hands.minute.setValue(to.minute);
    if (setting) return;
    const step = Animated.timing(hands.second, {
      toValue: to.second,
      duration: TICK_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    step.start();
    return () => step.stop();
  }, [hands, setting, target.hour, target.minute, target.second]);

  useEffect(
    () => () => {
      sweep.current?.stop();
    },
    [],
  );

  const sub = detail === 'sub';
  const rimWidth = Math.max(sub ? 1 : 2, radius * 0.025);

  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: palette.face,
        borderWidth: rimWidth,
        borderColor: palette.rim,
      }}
    >
      {/* Absolute children sit inside the rim; this layer puts them back on the outer edge. */}
      <View
        style={{ position: 'absolute', left: -rimWidth, top: -rimWidth, width: size, height: size }}
      >
        <Ticks theme={theme} palette={palette} radius={radius} sub={sub} />
        {!sub && theme.numerals !== 'none' ? (
          <Numerals
            theme={theme}
            palette={palette}
            radius={radius}
            archivo={archivo}
            // The sub-dial sits where 6 would be, as on a dual-time watch.
            skipSix={!!interactive?.secondTime && !setting}
          />
        ) : null}
        {interactive?.secondTime && !setting ? (
          <SubDial
            theme={theme}
            radius={radius}
            time={interactive.secondTime}
            onPress={interactive.onSubDialPress}
          />
        ) : null}
        <Hand shape={theme.hour} color={palette.hour} radius={radius} angle={hands.hour} />
        <Hand shape={theme.minute} color={palette.minute} radius={radius} angle={hands.minute} />
        {!sub && showSeconds && !setting ? (
          <SecondHand theme={theme} palette={palette} radius={radius} angle={hands.second} />
        ) : null}
        {interactive && setting ? (
          <DragSurface size={size} setTime={setTime} onSetTime={interactive.onSetTime} />
        ) : null}
        {interactive ? (
          <Centre radius={radius} palette={palette} interaction={interactive} />
        ) : (
          <Cap radius={radius} palette={palette} />
        )}
      </View>
    </View>
  );
}

/** A view of `width` × `length` turned to `angle` about the centre, its far end `distance` out. */
function radial(
  radius: number,
  width: number,
  length: number,
  angle: number,
  distance: number,
): ViewStyle {
  return {
    position: 'absolute',
    left: radius - width / 2,
    top: radius - length / 2,
    width,
    height: length,
    transform: [{ rotate: `${angle}deg` }, { translateY: -(distance - length / 2) }],
  };
}

function Ticks({
  theme,
  palette,
  radius,
  sub,
}: {
  theme: DialTheme;
  palette: DialPalette;
  radius: number;
  sub: boolean;
}) {
  const edge = radius * 0.94;
  const marks: { angle: number; width: number; length: number; round?: boolean }[] = [];
  const style = sub ? 'sub' : theme.ticks;
  for (let i = 0; i < 60; i += 1) {
    const hour = i % 5 === 0;
    const quarter = i % 15 === 0;
    switch (style) {
      case 'fine':
        marks.push(
          hour
            ? { angle: i * 6, width: Math.max(2, radius * 0.022), length: radius * 0.1 }
            : { angle: i * 6, width: Math.max(1, radius * 0.008), length: radius * 0.045 },
        );
        break;
      case 'bold':
        marks.push(
          hour
            ? { angle: i * 6, width: Math.max(3, radius * 0.055), length: radius * 0.2 }
            : { angle: i * 6, width: Math.max(1.5, radius * 0.022), length: radius * 0.07 },
        );
        break;
      case 'quarters':
        if (quarter)
          marks.push({ angle: i * 6, width: Math.max(2, radius * 0.045), length: radius * 0.13 });
        break;
      case 'hours':
        if (hour) {
          const dot = Math.max(3, radius * (quarter ? 0.075 : 0.05));
          marks.push({ angle: i * 6, width: dot, length: dot, round: true });
        }
        break;
      case 'sub':
        if (hour)
          marks.push({ angle: i * 6, width: Math.max(1, radius * 0.06), length: radius * 0.2 });
        break;
    }
  }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {marks.map(({ angle, width, length, round }) => (
        <View
          key={angle}
          style={[
            radial(radius, width, length, angle, edge),
            { backgroundColor: palette.ticks, borderRadius: round ? width / 2 : 0 },
          ]}
        />
      ))}
    </View>
  );
}

function Numerals({
  theme,
  palette,
  radius,
  archivo,
  skipSix,
}: {
  theme: DialTheme;
  palette: DialPalette;
  radius: number;
  archivo: boolean;
  skipSix: boolean;
}) {
  const roman = theme.numerals === 'roman';
  const fontSize = radius * (roman ? 0.13 : 0.16);
  const distance = radius * (theme.ticks === 'hours' ? 0.7 : 0.72);
  const box = { width: radius * 0.44, height: fontSize * 1.4 };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: 12 }, (_, i) => {
        if (skipSix && i === 6) return null;
        const angle = (i * Math.PI) / 6;
        return (
          <Text
            key={i}
            allowFontScaling={false}
            style={{
              position: 'absolute',
              left: radius + distance * Math.sin(angle) - box.width / 2,
              top: radius - distance * Math.cos(angle) - box.height / 2,
              width: box.width,
              height: box.height,
              lineHeight: box.height,
              textAlign: 'center',
              fontSize,
              color: palette.numerals,
              fontVariant: [...tabularNums],
              ...fontStyle(roman ? 500 : 600, archivo),
            }}
          >
            {numeral(i, roman)}
          </Text>
        );
      })}
    </View>
  );
}

function Hand({
  shape,
  color,
  radius,
  angle,
}: {
  shape: HandShape;
  color: string;
  radius: number;
  angle: Animated.Value;
}) {
  const width = Math.max(2, radius * shape.width);
  const length = radius * shape.length;
  const tail = radius * shape.tail;
  const total = length + tail;
  const round = shape.shape === 'round' ? width / 2 : shape.shape === 'taper' ? width / 4 : 0;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: radius - width / 2,
        top: radius - total / 2,
        width,
        height: total,
        alignItems: 'center',
        transform: [{ rotate: rotation(angle) }, { translateY: -(total / 2 - tail) }],
      }}
    >
      {shape.shape === 'taper' ? (
        <View
          style={{
            width: width * 0.3,
            height: 0,
            borderBottomWidth: length,
            borderLeftWidth: width * 0.35,
            borderRightWidth: width * 0.35,
            borderBottomColor: color,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />
      ) : (
        <View style={{ width, height: length, borderRadius: round, backgroundColor: color }} />
      )}
      {tail > 0 ? (
        <View
          style={{
            width: shape.shape === 'taper' ? width * 0.6 : width,
            height: tail,
            borderRadius: round,
            backgroundColor: color,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

function SecondHand({
  theme,
  palette,
  radius,
  angle,
}: {
  theme: DialTheme;
  palette: DialPalette;
  radius: number;
  angle: Animated.Value;
}) {
  const width = Math.max(1, radius * 0.012);
  const length = radius * (theme.second === 'disc' ? 0.66 : 0.86);
  const tail = radius * 0.2;
  const disc = radius * 0.16;
  const total = (theme.second === 'disc' ? length + disc / 2 : length) + tail;
  const lead = total - tail;
  return (
    <Animated.View
      pointerEvents="none"
      testID="dial-seconds-hand"
      style={{
        position: 'absolute',
        left: radius - disc / 2,
        top: radius - total / 2,
        width: disc,
        height: total,
        alignItems: 'center',
        transform: [{ rotate: rotation(angle) }, { translateY: -(total / 2 - tail) }],
      }}
    >
      {theme.second === 'disc' ? (
        <View
          style={{
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            backgroundColor: palette.second,
          }}
        />
      ) : null}
      <View
        style={{
          width,
          height: theme.second === 'disc' ? lead - disc : lead,
          backgroundColor: palette.second,
        }}
      />
      <View
        style={{
          width: width * 2.5,
          height: tail,
          borderRadius: width,
          backgroundColor: palette.second,
        }}
      />
    </Animated.View>
  );
}

function Cap({ radius, palette }: { radius: number; palette: DialPalette }) {
  const cap = Math.max(4, radius * 0.08);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: radius - cap / 2,
        top: radius - cap / 2,
        width: cap,
        height: cap,
        borderRadius: cap / 2,
        backgroundColor: palette.cap,
        borderWidth: Math.max(1, cap * 0.18),
        borderColor: palette.second,
      }}
    />
  );
}

/**
 * The centre: a tap (the `Pressable`) and a hold (the `HoldArea`), composed the way `Button`
 * composes itself. When the hold activates, Gesture Handler cancels the `Pressable`'s own touch,
 * so a hold never also taps.
 */
function Centre({
  radius,
  palette,
  interaction,
}: {
  radius: number;
  palette: DialPalette;
  interaction: DialInteraction;
}) {
  return (
    <HoldArea
      onHold={interaction.onCentreHold}
      onHoldEnd={interaction.onCentreHoldEnd}
      testID="dial-centre-hold"
    >
      <Pressable
        testID="dial-centre"
        accessibilityRole="button"
        accessibilityLabel={interaction.setTime === null ? 'Set second time' : 'Done'}
        onPress={interaction.onCentrePress}
        style={{
          position: 'absolute',
          left: radius - CENTRE_HIT / 2,
          top: radius - CENTRE_HIT / 2,
          width: CENTRE_HIT,
          height: CENTRE_HIT,
          borderRadius: CENTRE_HIT / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: Math.max(10, radius * 0.08),
            height: Math.max(10, radius * 0.08),
            borderRadius: radius,
            backgroundColor: palette.cap,
            borderWidth: Math.max(2, radius * 0.015),
            borderColor: palette.second,
          }}
        />
      </Pressable>
    </HoldArea>
  );
}

/**
 * Covers the face while setting. A touch in the outer ring turns the minute hand, in the inner
 * ring the hour hand; the ring is chosen on touch down and kept for the whole drag. The centre's
 * hit area sits above this surface, so the two never compete for a touch.
 */
function DragSurface({
  size,
  setTime,
  onSetTime,
}: {
  size: number;
  setTime: number;
  onSetTime: (minutes: number) => void;
}) {
  const radius = size / 2;
  const ring = useRef<Ring | null>(null);
  const current = useRef(setTime);
  useEffect(() => {
    current.current = setTime;
  }, [setTime]);

  const turn = (event: GestureResponderEvent, carry: boolean) => {
    const dx = event.nativeEvent.locationX - radius;
    const dy = event.nativeEvent.locationY - radius;
    if (!carry) {
      const distance = Math.hypot(dx, dy);
      ring.current = distance < CENTRE_HIT / 2 ? null : ringAt(distance, radius);
    }
    if (ring.current === null) return;
    const next = angleToTime(pointToAngle(dx, dy), ring.current, current.current, carry);
    // Touching down sets the hand where the finger is, even on the same position; a move only
    // reports a change.
    if (carry && next === current.current) return;
    current.current = next;
    onSetTime(next);
  };

  return (
    <View
      testID="dial-drag"
      style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => turn(event, false)}
      onResponderMove={(event) => turn(event, true)}
      onResponderRelease={() => {
        ring.current = null;
      }}
      onResponderTerminate={() => {
        ring.current = null;
      }}
    />
  );
}

function SubDial({
  theme,
  radius,
  time,
  onPress,
}: {
  theme: DialTheme;
  radius: number;
  time: DialTime;
  onPress: () => void;
}) {
  const size = radius * 2 * SUB_SHARE;
  return (
    <Pressable
      testID="dial-subdial"
      accessibilityRole="button"
      accessibilityLabel="Second time"
      onPress={onPress}
      style={{
        position: 'absolute',
        left: radius - size / 2,
        top: radius + radius * SUB_DROP - size / 2,
      }}
    >
      <Dial theme={theme} time={time} size={size} detail="sub" showSeconds={false} />
    </Pressable>
  );
}
