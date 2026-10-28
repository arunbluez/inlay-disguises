// Line glyphs for Brief's tabs, drawn with views on a 24-unit grid like Compress's and Sudoku's
// (no SVG renderer). Each takes the size in points and a colour.
import { View } from 'react-native';

const GRID = 24;

interface GlyphProps {
  size: number;
  color: string;
}

type Point = readonly [number, number];

/** A round-capped stroke from `a` to `b` (grid units). */
function Line({
  a,
  b,
  unit,
  color,
  width,
}: {
  a: Point;
  b: Point;
  unit: number;
  color: string;
  width: number;
}) {
  const dx = (b[0] - a[0]) * unit;
  const dy = (b[1] - a[1]) * unit;
  const length = Math.hypot(dx, dy) + width;
  return (
    <View
      style={{
        position: 'absolute',
        left: ((a[0] + b[0]) / 2) * unit - length / 2,
        top: ((a[1] + b[1]) / 2) * unit - width / 2,
        width: length,
        height: width,
        borderRadius: width / 2,
        backgroundColor: color,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
      }}
    />
  );
}

/** A circle outline centred on `c` with radius `r` (grid units). */
function Ring({
  c,
  r,
  unit,
  color,
  width,
}: {
  c: Point;
  r: number;
  unit: number;
  color: string;
  width: number;
}) {
  const side = 2 * r * unit + width;
  return (
    <View
      style={{
        position: 'absolute',
        left: c[0] * unit - side / 2,
        top: c[1] * unit - side / 2,
        width: side,
        height: side,
        borderRadius: side / 2,
        borderWidth: width,
        borderColor: color,
      }}
    />
  );
}

/** Draws polylines and circles on the 24-unit grid with the source's stroke of 2. */
function Glyph({
  size,
  color,
  lines = [],
  rings = [],
}: GlyphProps & { lines?: readonly Point[][]; rings?: readonly { c: Point; r: number }[] }) {
  const unit = size / GRID;
  const width = Math.max(1, 2 * unit);
  return (
    <View style={{ width: size, height: size }}>
      {rings.map((ring, i) => (
        <Ring key={`r${i}`} {...ring} unit={unit} color={color} width={width} />
      ))}
      {lines.flatMap((points, i) =>
        points
          .slice(1)
          .map((point, j) => (
            <Line
              key={`l${i}-${j}`}
              a={points[j]!}
              b={point}
              unit={unit}
              color={color}
              width={width}
            />
          )),
      )}
    </View>
  );
}

/** A page with three lines of text: the Feed tab, the masthead mark as an outline. */
export function FeedGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [4, 4],
          [20, 4],
          [20, 20],
          [4, 20],
          [4, 4],
        ],
        [
          [8, 9],
          [16, 9],
        ],
        [
          [8, 13],
          [16, 13],
        ],
        [
          [8, 16],
          [12, 16],
        ],
      ]}
    />
  );
}

/** A bookmark: the Saved tab. */
export function SavedGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [6, 3],
          [18, 3],
          [18, 21],
          [12, 16],
          [6, 21],
          [6, 3],
        ],
      ]}
    />
  );
}

/** Two sliders, as on Compress's Settings tab: the Settings tab. */
export function SettingsGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      rings={[
        { c: [17, 17], r: 3 },
        { c: [7, 7], r: 3 },
      ]}
      lines={[
        [
          [20, 7],
          [11, 7],
        ],
        [
          [14, 17],
          [5, 17],
        ],
      ]}
    />
  );
}
