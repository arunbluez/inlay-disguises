// Line glyphs from the UI Source's Compress screens, drawn with views on the source's 24-unit grid
// (no SVG renderer). Each takes the size in points and a colour.
import { View } from 'react-native';

const GRID = 24;

interface GlyphProps {
  size: number;
  color: string;
  /** Stroke width on the 24-unit grid. */
  stroke?: number;
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

/** Draws polylines and circles on the 24-unit grid. */
function Glyph({
  size,
  color,
  stroke = 2,
  lines = [],
  rings = [],
}: GlyphProps & { lines?: readonly Point[][]; rings?: readonly { c: Point; r: number }[] }) {
  const unit = size / GRID;
  const width = Math.max(1, stroke * unit);
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

/** Two arrows pointing in: the Compress tab and the Compress button. */
export function CompressGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [4, 14],
          [10, 14],
          [10, 20],
        ],
        [
          [20, 10],
          [14, 10],
          [14, 4],
        ],
        [
          [14, 10],
          [21, 3],
        ],
        [
          [3, 21],
          [10, 14],
        ],
      ]}
    />
  );
}

/** A clock: the History tab. */
export function HistoryGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      rings={[{ c: [12, 12], r: 10 }]}
      lines={[
        [
          [12, 6],
          [12, 12],
          [16, 14],
        ],
      ]}
    />
  );
}

/** Two sliders: the Settings tab. */
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

/** A plus: the Add action. */
export function PlusGlyph(props: GlyphProps) {
  return (
    <Glyph
      stroke={2.5}
      {...props}
      lines={[
        [
          [5, 12],
          [19, 12],
        ],
        [
          [12, 5],
          [12, 19],
        ],
      ]}
    />
  );
}

/** An arrow pointing down: Save to Photos. */
export function SaveGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [12, 5],
          [12, 19],
        ],
        [
          [19, 12],
          [12, 19],
          [5, 12],
        ],
      ]}
    />
  );
}

/** A tray with an arrow out of it: Share. */
export function ShareGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [4, 12],
          [4, 22],
          [20, 22],
          [20, 12],
        ],
        [
          [16, 6],
          [12, 2],
          [8, 6],
        ],
        [
          [12, 2],
          [12, 15],
        ],
      ]}
    />
  );
}
