# Dial

An analog clock with themes: a large dial with hour, minute and seconds hands, the date in words, five faces in light and dark, and a second time you set by turning the hands, shown on a small sub-dial. It runs fully offline; `allowedHosts` is empty.

## Screens

- **Clock.** The dial fills the width (up to 380 pt) and ticks once a second. Under it: the date ("Monday 2 November") and, once one is pinned, "Second time 7:45". A tap on the sub-dial offers to clear it.
- **Themes.** Every face as a live miniature in a two-column grid. A tap applies it.
- **Settings.** 24-hour readout, show seconds hand, show date. About: name, version and licences.

## Themes

Faces are data (`src/themes.ts`): a `DialTheme` names its numerals, tick style, hour and minute hand shapes, seconds hand style and a palette per scheme (face, rim, ticks, numerals, each hand, cap). A face keeps its own colours; everything around the dial uses the host theme.

| Face    | Numerals | Ticks                        | Hands                       | Seconds          |
| ------- | -------- | ---------------------------- | --------------------------- | ---------------- |
| Classic | 1 to 12  | 60 fine, hours longer        | thin, round ends            | rust needle      |
| Minimal | none     | four markers                 | short, round, no tail       | blue needle      |
| Station | none     | railway: bold bars and ticks | square bars with long tails | red, with a disc |
| Night   | 1 to 12  | twelve dots                  | tapered, luminous green     | amber needle     |
| Roman   | I to XII | 60 fine, hours longer        | tapered, brass cap          | oxblood needle   |

Station and Night keep a light and a dark face respectively in both schemes, as real ones do; the dark variants dim the face and rim a step.

## Dial geometry

`src/Dial.tsx` draws one dial with views, no SVG. The home dial, the miniatures and the sub-dial are all `<Dial theme time size interactive />`.

- **Face.** A `View` with `borderRadius` half its size and a rim border.
- **Ticks.** Each tick is a small `View` centred on the dial, turned with `rotate` and pushed out along its own axis with `translateY` to just inside the rim (94% of the radius).
- **Numerals.** `Text` boxes centred at 72% of the radius: x = r · sin θ, y = −r · cos θ.
- **Hands.** A hand is a `View` as long as hand plus tail, centred on the dial. `transform: [{ rotate }, { translateY }]` turns it about the dial's centre, then slides it along its own axis so its foot sits on the centre. The angles come from `timeToAngles` (`src/time.ts`): the minute hand carries the seconds' fraction and the hour hand the minutes' fraction, so at 3:30 the hour hand is half way from 3 to 4.
- **Motion.** Core `Animated` with the native driver. The seconds hand steps once a second (120 ms ease-out); each hand takes the nearest way round, so it never spins back past 12. The one-second timer (`src/state/now.ts`) lands on whole seconds, and stops on unmount and while the app is in the background.
- **Sub-dial.** 28% of the dial, centred 42% of the radius below the centre, hour ticks only.

## Set mode

The centre of the dial (a 56 pt hit area drawn as the hands' cap) is a `Pressable` inside a `HoldArea`, the same composition as `Button`.

- A tap in live mode starts set mode: both hands sweep to 12:00 (500 ms, `motion.ease`), the seconds hand goes, and a readout shows `12:00`, dimmed until a hand is turned, with Cancel under it.
- A drag in the outer ring turns the minute hand (60 positions); passing 12 while the finger moves turns the hour on or back. A drag inside 55% of the radius turns the hour hand (12 positions) and keeps the minutes. `angleToTime` does the snapping.
- The readout is `H:MM`, or `HH:MM` on a 24-hour readout, where a tap on it adds or takes away 12 hours.
- A tap on the centre pins the readout as the second time and returns to live mode. A hold of 600 ms with a turned hand hands the readout's four digits to the host (`7:45` → `0745`); the release then does what a tap does. With no hand turned, either just leaves set mode.
- Only the offset from the current time is stored (`secondTimeOffsetMinutes`), when the pin happens. Other keys: `theme`, `twentyFourHour`, `showSeconds`, `showDate`.
- `onReset` voids a pending release, leaves set mode and returns to Clock; settings and a pinned second time stay.

## Icons

`assets/icon/` holds six 1024 px PNGs: a clock face with twelve ticks (the quarters longer) and hands at 10:08, with a thin seconds hand where the colour allows.

- **iOS light:** graphite ground `#2b2927`, paper face `#fbfaf7` 72% of the width, ink ticks and hands `#2a2724`, seconds hand `#d9531e`.
- **iOS dark:** transparent ground, face `#3a3734` with a `#55504b` rim, hands `#eeebe7`, seconds `#f08257`.
- **iOS tinted:** a rim, ticks and hands in greys on transparent; no face fill.
- **Android:** the background is the graphite. The foreground is the light face at 60% of the width, inside the 66% safe zone. The monochrome layer is the rim, ticks and hands in white.

The PNGs are written pixel by pixel with Node's `zlib`. Each shape (disc, ring, round-capped stroke) is a signed distance from the pixel centre; coverage is 0.5 minus that distance, clamped to 0 to 1, so every edge is anti-aliased over one pixel.
