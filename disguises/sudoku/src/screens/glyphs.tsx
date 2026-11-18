// Line glyphs from the UI Source's Sudoku screens, drawn with views on the source's 24-unit grid
// (no SVG renderer); curves are traced as short straight runs. Each takes the size in points and a
// colour.
import { View } from 'react-native';

const GRID = 24;

interface GlyphProps {
  size: number;
  color: string;
}

type Point = readonly [number, number];

/** Points along a circle around `c` from `from` to `to` degrees (0 = right, 90 = down). */
function arc(c: Point, r: number, from: number, to: number, steps = 6): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [c[0] + r * Math.cos(angle), c[1] + r * Math.sin(angle)] as const;
  });
}

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

/** A 3 × 3 grid: the Today tab. */
export function TodayGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [3, 3],
          [21, 3],
          [21, 21],
          [3, 21],
          [3, 3],
        ],
        [
          [3, 9],
          [21, 9],
        ],
        [
          [3, 15],
          [21, 15],
        ],
        [
          [9, 3],
          [9, 21],
        ],
        [
          [15, 3],
          [15, 21],
        ],
      ]}
    />
  );
}

/** Bars on an axis: the Stats tab. */
export function StatsGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [3, 3],
          [3, 21],
          [21, 21],
        ],
        [
          [18, 17],
          [18, 9],
        ],
        [
          [13, 17],
          [13, 5],
        ],
        [
          [8, 17],
          [8, 14],
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

/** A chevron pointing left: back to Today. */
export function BackGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [15, 18],
          [9, 12],
          [15, 6],
        ],
      ]}
    />
  );
}

/** A chevron pointing right: a row that opens a screen. */
export function ChevronGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [9, 18],
          [15, 12],
          [9, 6],
        ],
      ]}
    />
  );
}

const undoLines: Point[][] = [
  [
    [9, 14],
    [4, 9],
    [9, 4],
  ],
  [[4, 9], ...arc([14.5, 14.5], 5.5, -90, 90), [11, 20]],
];

/** A hooked arrow back. */
export function UndoGlyph(props: GlyphProps) {
  return <Glyph {...props} lines={undoLines} />;
}

/** The undo arrow, mirrored. */
export function RedoGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={undoLines.map((points) => points.map(([x, y]) => [GRID - x, y] as const))}
    />
  );
}

/** A backspace key. */
export function EraseGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [10, 5],
          [21, 5],
          [21, 19],
          [10, 19],
          [3, 12],
          [10, 5],
        ],
        [
          [18, 9],
          [12, 15],
        ],
        [
          [12, 9],
          [18, 15],
        ],
      ]}
    />
  );
}

/** A pencil. */
export function NotesGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [17.2, 2.8],
          [21.2, 6.8],
          [7.2, 20.8],
          [2.5, 21.5],
          [3.2, 16.8],
          [17.2, 2.8],
        ],
      ]}
    />
  );
}

/** A light bulb. */
export function HintGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [[9, 14], [7.5, 11.5], ...arc([12, 8], 6, 180, 360), [16.5, 11.5], [15, 14]],
        [
          [9, 18],
          [15, 18],
        ],
        [
          [10, 22],
          [14, 22],
        ],
      ]}
    />
  );
}

/** Two bars. */
export function PauseGlyph(props: GlyphProps) {
  return (
    <Glyph
      {...props}
      lines={[
        [
          [9, 5],
          [9, 19],
        ],
        [
          [15, 5],
          [15, 19],
        ],
      ]}
    />
  );
}

/** A filled triangle pointing right ("6 3 20 12 6 21"): Play. */
export function PlayGlyph({ size, color }: GlyphProps) {
  const unit = size / GRID;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: 6 * unit,
          top: 3 * unit,
          borderLeftWidth: 14 * unit,
          borderLeftColor: color,
          borderTopWidth: 9 * unit,
          borderTopColor: 'transparent',
          borderBottomWidth: 9 * unit,
          borderBottomColor: 'transparent',
        }}
      />
    </View>
  );
}
