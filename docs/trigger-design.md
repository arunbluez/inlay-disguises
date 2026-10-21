# Trigger design

The trigger is how a disguise takes a code: the user types it into something the disguise would ask for anyway, then makes a deliberate gesture, and the disguise hands the value to the host with `useTrigger().submit(code)`. Everything else about a disguise is ordinary app design. The trigger is the part reviewers read most closely, because a trigger that behaves differently for a right and a wrong code gives the disguise away.

## 1. Pick a field with an alibi

The code goes into a field that already makes sense in your app, one a user would fill in with a number (or a word) anyway:

- a photo compressor asks for a **target size** in KB;
- a unit converter asks for an **amount**;
- a timer asks for **minutes**;
- a calculator has a **display**.

Good alibi fields:

- belong to the disguise's main task, on a screen people open often;
- take values of the right shape: codes are at least 4 characters, so a field that holds 4 to 8 digits naturally is ideal. Set your own maximum with `maxLength` and keep it plausible for the field (nobody types a 12-digit target size);
- show the typed value like any other input. No masking, no dots, no special keyboard.

Avoid a dedicated "code" field, a field that exists only on an extra screen, or one whose valid range makes a 4-digit value look odd.

## 2. Commit with a deliberate gesture

A tap must never submit. The user commits a code by **holding** the screen's main button for at least 600 ms, which `Button` does for you:

```tsx
<Button
  label="Compress"
  onPress={runNormalAction}
  onHold={submitField}
  onHoldEnd={runNormalActionOnRelease}
/>
```

- `onHold` fires once, when the hold reaches `motion.longPressCommit` (600 ms). Don't lower `holdMs`.
- A tap fires only `onPress`; a hold never fires `onPress`; a scroll or a finger that drifts off before 600 ms fires neither.
- `onHoldEnd` fires when the finger lifts after a hold. Run the button's normal action there, so a hold ends exactly like a tap would, just later.
- Submit only when the field has a value. A hold with an empty field is an ordinary press.

A hold works on any button whose normal action is safe to repeat: Compress, Convert, Start, Calculate. Avoid buttons that delete, send or pay.

## 3. A wrong code does exactly the normal thing

After `submit`, the disguise carries on as if nothing was submitted. `submit` returns nothing, and nothing in the SDK ever reports whether a code was right. A wrong code (which is almost every code: a typo, a real target size, a curious friend) must produce:

- no error, message, toast or dialog that a plain press would not produce;
- no haptic, sound or animation of its own;
- no delay: the normal action starts on release, as fast as after a tap;
- no log line, analytics event or storage write that contains the value or records that a hold happened;
- no change to the field: leave the value in place, as a tap would.

If the code was right, the host takes over and resets the disguise; the disguise never finds out which case it was in.

## 4. Clear and cancel in `onReset`

The host calls your `onReset` handlers after it accepts a code, before the disguise is shown again, and whenever the app returns to the disguise. Each handler:

- clears every field that may hold a code;
- cancels pending work: timers, queued actions and, above all, the release of a hold that is still to come. If the host accepted a code at 600 ms, the finger lifts afterwards; that release must not start the normal action behind the host's screen;
- returns to the home screen in its default state.

```tsx
const lifecycle = useLifecycle();
const releasePending = useRef(false);

useEffect(
  () =>
    lifecycle.onReset(() => {
      releasePending.current = false;
      setValue('');
      goHome();
    }),
  [lifecycle],
);
```

## Worked example: Compress

Compress is a photo compressor. Its setup screen has a **Target size (KB)** number field and a **Compress** button.

- **Alibi.** A target size is a number people type into a compressor. The field takes digits only, up to 8, so any 4 to 8-digit code fits without looking odd.
- **Gesture.** A tap on Compress compresses the selected photos (or, with none selected, shows the "Add files to compress" toast). A hold of 600 ms with a non-empty Target size calls `submit(targetSize)` once, at the 600 ms mark, with the value exactly as typed. On release, Compress does what a tap does: compresses, or shows the toast.
- **Wrong code.** Nothing distinguishes a hold from a tap but the moment the action starts: the same Progress screen, the same toast, no vibration, nothing stored. The typed target size is never written to history.
- **Reset.** `onReset` clears Target size, drops the selected photos and the current run, returns to Home, and marks any pending release as void, so an accepted code never starts a compression in the background.
- **Description.** `triggerDescription: 'Type your code as the target size, then hold Compress.'`

In code, the wiring looks like the template's:

```tsx
const trigger = useTrigger();
const [targetSize, setTargetSize] = useState('');
const releasePending = useRef(false);

return (
  <>
    <NumberField
      label="Target size"
      unit="KB"
      value={targetSize}
      onChangeText={setTargetSize}
      maxLength={8}
    />
    <Button
      label="Compress"
      onPress={compressOrHint}
      onHold={() => {
        releasePending.current = true;
        if (targetSize !== '') trigger.submit(targetSize);
      }}
      onHoldEnd={() => {
        if (!releasePending.current) return;
        releasePending.current = false;
        compressOrHint();
      }}
    />
  </>
);
```

## Checklist

Reviewers check each of these, and your tests should too (see `disguises/_template/__tests__/template.test.tsx`):

- [ ] The code goes into a field the disguise would have anyway, and the field takes at least 4 characters, up to a maximum you set.
- [ ] A tap never calls `submit`.
- [ ] A hold of 600 ms with a value calls `submit(value)` exactly once; with an empty field it calls nothing.
- [ ] After a hold, the release runs the same normal action as a tap, with no extra feedback.
- [ ] The submitted value is never stored, logged or sent anywhere.
- [ ] `onReset` clears the field, cancels pending work (including a pending release) and returns home.
- [ ] `triggerDescription` says, in one sentence, where to type and what to hold.
