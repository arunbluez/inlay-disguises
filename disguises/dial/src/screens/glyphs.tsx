// Tab glyphs drawn with views on a 24-unit grid (no SVG renderer). Each takes a size and a colour.
import { View } from 'react-native';

interface GlyphProps {
  size: number;
  color: string;
}

const STROKE = 2;

/** A ring with two hands at 10:08. */
export function ClockGlyph({ size, color }: GlyphProps) {
  const u = size / 24;
  const ring = 18 * u;
  const hand = (length: number, angle: number) => (
    <View
      style={{
        position: 'absolute',
        left: 12 * u - (STROKE * u) / 2,
        top: 12 * u - length / 2,
        width: STROKE * u,
        height: length,
        borderRadius: u,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }, { translateY: -length / 2 + u }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: 3 * u,
          top: 3 * u,
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: STROKE * u,
          borderColor: color,
        }}
      />
      {hand(6 * u, -60)}
      {hand(8 * u, 48)}
    </View>
  );
}

/** Four rounded squares, the top-left filled. */
export function ThemesGlyph({ size, color }: GlyphProps) {
  const u = size / 24;
  const cell = 8 * u;
  return (
    <View
      style={{
        width: size,
        height: size,
        padding: 3 * u,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2 * u,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: 2.5 * u,
            borderWidth: STROKE * u,
            borderColor: color,
            backgroundColor: i === 0 ? color : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

/** Three sliders. */
export function SettingsGlyph({ size, color }: GlyphProps) {
  const u = size / 24;
  const knob = 6 * u;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap: 4 * u }}>
      {[14, 7, 11].map((at, i) => (
        <View key={i} style={{ height: knob, justifyContent: 'center', marginHorizontal: 3 * u }}>
          <View style={{ height: STROKE * u, borderRadius: u, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              left: (at - 3 - 3) * u,
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              backgroundColor: color,
            }}
          />
        </View>
      ))}
    </View>
  );
}
