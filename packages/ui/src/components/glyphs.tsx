// Line glyphs from the design source, drawn with views so the kit needs no SVG renderer. Each one is
// laid out on the source's 24-unit icon grid and scaled to `size`.
import { View } from 'react-native';

import { strokes } from '../tokens';

const GRID = 24;

interface GlyphProps {
  size: number;
  color: string;
}

// An open arrowhead pointing right: tip at (`tipX`, 12) on the grid, each leg reaching `reach`
// units back and up/down. Drawn as the top and right borders of a square turned 45°.
function Head({ size, color, tipX, reach }: GlyphProps & { tipX: number; reach: number }) {
  const unit = size / GRID;
  const side = reach * Math.SQRT2 * unit;
  return (
    <View
      style={{
        position: 'absolute',
        left: (tipX - reach) * unit - side / 2,
        top: (GRID / 2) * unit - side / 2,
        width: side,
        height: side,
        borderTopWidth: strokes.rule,
        borderRightWidth: strokes.rule,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}

/** "M5 12h14 m12 5 7 7-7 7": the trailing arrow on primary actions. */
export function Arrow({ size, color }: GlyphProps) {
  const unit = size / GRID;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: 5 * unit,
          top: (GRID / 2) * unit - strokes.rule / 2,
          width: 14 * unit,
          height: strokes.rule,
          borderRadius: strokes.rule / 2,
          backgroundColor: color,
        }}
      />
      <Head size={size} color={color} tipX={19} reach={7} />
    </View>
  );
}

/** "m9 18 6-6-6-6": the chevron at the end of a row that opens something. */
export function Chevron({ size, color }: GlyphProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Head size={size} color={color} tipX={15} reach={6} />
    </View>
  );
}
