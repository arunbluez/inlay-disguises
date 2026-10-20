import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import {
  accents,
  Button,
  Chip,
  ChipRow,
  controls,
  EmptyState,
  layout,
  LIGHT,
  ListGroup,
  ListRow,
  motion,
  NumberField,
  ProgressBar,
  Sheet,
  Slider,
  states,
  TabBar,
  TextField,
  ThemeProvider,
  Toast,
  Toggle,
} from '../src';

const compress = { ...LIGHT, ...accents.compress.light };

function renderThemed(ui: ReactElement) {
  return render(
    <ThemeProvider theme="compress" scheme="light">
      {ui}
    </ThemeProvider>,
  );
}

// The resolved style of a rendered host element.
const flat = (element: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(element.props.style as StyleProp<TextStyle>) ?? {}) as TextStyle;

describe('Button', () => {
  it('renders a primary action with the accent fill and the action height, and fires onPress', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button label="Continue" onPress={onPress} testID="cta" />);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(flat(screen.getByTestId('cta'))).toMatchObject({
      height: layout.primaryAction,
      backgroundColor: compress.accent,
    });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['secondary', { borderColor: compress.rule, height: controls.secondary.height }],
    ['text', { height: layout.minHit }],
    ['destructive', { backgroundColor: compress.danger, height: layout.row }],
  ] as const)('renders the %s variant from the theme', async (variant, expected) => {
    await renderThemed(<Button label="Go" variant={variant} testID="b" />);
    expect(flat(screen.getByTestId('b'))).toMatchObject(expected);
  });

  it('does not fire and reports disabled at 45% opacity when disabled', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button label="Save" onPress={onPress} disabled testID="b" />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(flat(screen.getByTestId('b')).opacity).toBe(states.disabledOpacity);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('fires onLongPress for a hold', async () => {
    const onLongPress = jest.fn();
    await renderThemed(<Button label="Play" onLongPress={onLongPress} />);
    await fireEvent(screen.getByRole('button', { name: 'Play' }), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe('TextField', () => {
  it('is labelled by its label and passes typed text through', async () => {
    const onChangeText = jest.fn();
    await renderThemed(
      <TextField label="Name" helper="Shown on the cover" onChangeText={onChangeText} testID="f" />,
    );

    expect(screen.getByLabelText('Name')).toBe(screen.getByTestId('f'));
    expect(screen.getByText('Shown on the cover')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('f'), 'Lisbon');
    expect(onChangeText).toHaveBeenCalledWith('Lisbon');
  });

  it('is not editable when disabled', async () => {
    await renderThemed(<TextField label="Name" disabled testID="f" />);
    expect(screen.getByTestId('f').props.editable).toBe(false);
    expect(screen.getByTestId('f')).toBeDisabled();
  });
});

describe('NumberField', () => {
  it('keeps digits only, shows the unit and uses tabular figures', async () => {
    const onChangeText = jest.fn();
    await renderThemed(
      <NumberField label="Target size (KB)" unit="KB" onChangeText={onChangeText} testID="n" />,
    );

    const input = screen.getByTestId('n');
    expect(input.props.keyboardType).toBe('number-pad');
    expect(flat(input).fontVariant).toEqual(['tabular-nums']);
    expect(screen.getByText('KB')).toBeOnTheScreen();
    await fireEvent.changeText(input, '2,048 kb');
    expect(onChangeText).toHaveBeenCalledWith('2048');
  });
});

describe('Slider', () => {
  it('sets the value from where the track is touched, snapped to the step', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <Slider
        value={0.7}
        step={0.05}
        onValueChange={onValueChange}
        accessibilityLabel="Quality"
        testID="s"
      />,
    );

    const slider = screen.getByRole('adjustable', { name: 'Quality' });
    expect(slider.props.accessibilityValue).toEqual({ min: 0, max: 1, now: 0.7 });
    await fireEvent.layout(slider, { width: 200, height: layout.minHit });
    await fireEvent(slider, 'responderGrant', { nativeEvent: { locationX: 51 } });
    expect(onValueChange).toHaveBeenLastCalledWith(0.25);
    await fireEvent(slider, 'responderMove', { nativeEvent: { locationX: 500 } });
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it('steps with the increment and decrement accessibility actions', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <Slider
        value={50}
        minimumValue={0}
        maximumValue={100}
        step={10}
        onValueChange={onValueChange}
        accessibilityLabel="Level"
      />,
    );
    const slider = screen.getByRole('adjustable', { name: 'Level' });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onValueChange).toHaveBeenLastCalledWith(60);
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onValueChange).toHaveBeenLastCalledWith(40);
  });

  it('ignores touches and actions when disabled', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <Slider value={0.5} onValueChange={onValueChange} disabled accessibilityLabel="Quality" />,
    );
    const slider = screen.getByRole('adjustable', { name: 'Quality' });
    expect(slider).toBeDisabled();
    await fireEvent.layout(slider, { width: 200, height: layout.minHit });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Toggle', () => {
  it('is a switch that reports checked and flips on press', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <Toggle value={false} onValueChange={onValueChange} accessibilityLabel="Show timer" />,
    );

    const toggle = screen.getByRole('switch', { name: 'Show timer' });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('fills with the accent when on', async () => {
    await renderThemed(
      <Toggle value onValueChange={() => {}} accessibilityLabel="Show timer" testID="t" />,
    );
    expect(screen.getByRole('switch', { name: 'Show timer' })).toBeChecked();
    expect(flat(screen.getByTestId('t'))).toMatchObject({ backgroundColor: compress.accent });
  });

  it('does not flip when disabled', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <Toggle value onValueChange={onValueChange} disabled accessibilityLabel="Show timer" />,
    );
    const toggle = screen.getByRole('switch', { name: 'Show timer' });
    expect(toggle).toBeDisabled();
    await fireEvent.press(toggle);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Chip and ChipRow', () => {
  it('a chip reports selected and fires onPress', async () => {
    const onPress = jest.fn();
    await renderThemed(<Chip label="Photos" selected onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Photos' });
    expect(chip).toBeSelected();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a disabled chip does not fire', async () => {
    const onPress = jest.fn();
    await renderThemed(<Chip label="Videos" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Videos' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('a chip row checks the current option and reports the pressed one', async () => {
    const onChange = jest.fn();
    await renderThemed(
      <ChipRow
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'hard', label: 'Hard' },
        ]}
        value="easy"
        onChange={onChange}
        testID="row"
      />,
    );

    expect(screen.getByRole('radio', { name: 'Easy' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Hard' })).not.toBeChecked();
    expect(flat(screen.getByTestId('row-easy'))).toMatchObject({
      backgroundColor: compress.accent,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Hard' }));
    expect(onChange).toHaveBeenCalledWith('hard');
  });
});

describe('ListGroup and ListRow', () => {
  it('renders rows in a surface card, with a value, a pressable row and a trailing control', async () => {
    const onPress = jest.fn();
    await renderThemed(
      <ListGroup testID="group">
        <ListRow title="Default quality" value="70%" />
        <ListRow title="Help" onPress={onPress} />
        <ListRow
          title="Show timer"
          trailing={<Toggle value onValueChange={() => {}} accessibilityLabel="Show timer" />}
        />
      </ListGroup>,
    );

    expect(flat(screen.getByTestId('group'))).toMatchObject({ backgroundColor: compress.surface });
    expect(screen.getByLabelText('Default quality, 70%')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Show timer' })).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Help' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a disabled row does not fire', async () => {
    const onPress = jest.fn();
    await renderThemed(<ListRow title="Help" onPress={onPress} disabled />);
    const row = screen.getByRole('button', { name: 'Help' });
    expect(row).toBeDisabled();
    await fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Sheet', () => {
  it('shows its title, note and content when visible and closes from the close action', async () => {
    const onClose = jest.fn();
    await renderThemed(
      <Sheet
        visible
        onClose={onClose}
        title="Sort by"
        note="Newest first by default."
        testID="sheet"
      >
        <Text>Date added</Text>
      </Sheet>,
    );

    expect(screen.getByRole('header', { name: 'Sort by' })).toBeOnTheScreen();
    expect(screen.getByText('Newest first by default.')).toBeOnTheScreen();
    expect(screen.getByText('Date added')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders nothing while not visible', async () => {
    await renderThemed(
      <Sheet visible={false} onClose={() => {}} title="Sort by">
        <Text>Date added</Text>
      </Sheet>,
    );
    expect(screen.queryByText('Date added')).toBeNull();
  });
});

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the message as an alert and dismisses itself after the hold time', async () => {
    const onDismiss = jest.fn();
    await renderThemed(
      <Toast message="Saved to Photos" visible onDismiss={onDismiss} testID="toast" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Saved to Photos');
    expect(flat(screen.getByTestId('toast'))).toMatchObject({ backgroundColor: compress.ink });
    await act(async () => jest.advanceTimersByTime(motion.toastHold - 1));
    expect(onDismiss).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while not visible', async () => {
    await renderThemed(<Toast message="Saved to Photos" visible={false} />);
    expect(screen.queryByText('Saved to Photos')).toBeNull();
  });
});

describe('TabBar', () => {
  it('marks the active tab selected and reports the pressed one', async () => {
    const onChange = jest.fn();
    await renderThemed(
      <TabBar
        tabs={[
          { key: 'today', label: 'Today' },
          { key: 'stats', label: 'Stats' },
          { key: 'settings', label: 'Settings' },
        ]}
        value="today"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Today' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Stats' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Stats' }));
    expect(onChange).toHaveBeenCalledWith('stats');
  });
});

describe('EmptyState', () => {
  it('reads title and body as one element and renders its action', async () => {
    const onPress = jest.fn();
    await renderThemed(
      <EmptyState
        title="No files selected"
        body="Add photos, videos or documents to begin."
        action={<Button label="Add files" variant="secondary" onPress={onPress} />}
      />,
    );

    expect(
      screen.getByLabelText('No files selected. Add photos, videos or documents to begin.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Add files' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressBar', () => {
  it('exposes progress as a percentage and clamps out-of-range values', async () => {
    const { rerender } = await renderThemed(
      <ProgressBar progress={0.42} accessibilityLabel="Compressing" />,
    );
    expect(
      screen.getByRole('progressbar', { name: 'Compressing' }).props.accessibilityValue,
    ).toEqual({
      min: 0,
      max: 100,
      now: 42,
    });

    await rerender(
      <ThemeProvider theme="compress" scheme="light">
        <ProgressBar progress={3} accessibilityLabel="Compressing" />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('progressbar', { name: 'Compressing' }).props.accessibilityValue.now,
    ).toBe(100);
  });
});

describe('interaction states', () => {
  const ring = {
    outlineColor: compress.ink,
    outlineStyle: 'solid',
    outlineWidth: states.focusRing.width,
  };

  it.each([
    ['Button', <Button key="b" label="Go" testID="c" />, states.focusRing.offset],
    [
      'Toggle',
      <Toggle key="t" value onValueChange={() => {}} accessibilityLabel="On" testID="c" />,
      states.focusRing.offset,
    ],
    [
      'Chip',
      <Chip key="c" label="Photos" onPress={() => {}} testID="c" />,
      states.focusRing.offset,
    ],
    [
      'ListRow',
      <ListRow key="r" title="Help" onPress={() => {}} testID="c" />,
      -states.focusRing.width,
    ],
    [
      'ChipRow segment',
      <ChipRow
        key="s"
        options={[{ value: 'a', label: 'A' }]}
        value="a"
        onChange={() => {}}
        testID="row"
      />,
      -states.focusRing.width,
    ],
    [
      'TabBar tab',
      <TabBar
        key="tb"
        tabs={[{ key: 'a', label: 'A' }]}
        value="a"
        onChange={() => {}}
        testID="tabs"
      />,
      -states.focusRing.width,
    ],
  ] as const)(
    '%s draws the ink focus ring while focused, and drops it on blur',
    async (_, ui, offset) => {
      await renderThemed(ui);
      const id = screen.queryByTestId('c')
        ? 'c'
        : screen.queryByTestId('row-a')
          ? 'row-a'
          : 'tabs-a';
      expect(flat(screen.getByTestId(id)).outlineWidth).toBeUndefined();
      await fireEvent(screen.getByTestId(id), 'focus');
      expect(flat(screen.getByTestId(id))).toMatchObject({ ...ring, outlineOffset: offset });
      await fireEvent(screen.getByTestId(id), 'blur');
      expect(flat(screen.getByTestId(id)).outlineWidth).toBeUndefined();
    },
  );

  it('a field rings its box while the input has focus and still calls the caller', async () => {
    const onFocus = jest.fn();
    await renderThemed(<TextField label="Name" onFocus={onFocus} testID="f" />);
    const box = screen.getByTestId('f').parent!;
    await fireEvent(screen.getByTestId('f'), 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(flat(box)).toMatchObject({ ...ring, outlineOffset: states.focusRing.offset });
    await fireEvent(screen.getByTestId('f'), 'blur');
    expect(flat(box).outlineWidth).toBeUndefined();
  });

  it('every disabled control reports disabled and drops to the shared opacity', async () => {
    await renderThemed(
      <>
        <Button label="Button" disabled testID="button" />
        <Toggle
          value
          disabled
          onValueChange={() => {}}
          accessibilityLabel="Toggle"
          testID="toggle"
        />
        <Chip label="Chip" disabled testID="chip" />
        <ChipRow
          options={[{ value: 'a', label: 'Seg' }]}
          value="a"
          onChange={() => {}}
          disabled
          testID="row"
        />
        <ListRow title="Row" onPress={() => {}} disabled testID="listrow" />
        <Slider
          value={0}
          onValueChange={() => {}}
          disabled
          accessibilityLabel="Slider"
          testID="slider"
        />
      </>,
    );
    for (const name of ['Button', 'Toggle', 'Chip', 'Seg', 'Row', 'Slider']) {
      expect(screen.getByLabelText(name)).toBeDisabled();
    }
    for (const id of ['button', 'toggle', 'chip', 'row', 'listrow', 'slider']) {
      expect(flat(screen.getByTestId(id)).opacity).toBe(states.disabledOpacity);
    }
  });

  it('uses the system font at the role weight when the host says Archivo is not loaded', async () => {
    await render(
      <ThemeProvider theme="compress" scheme="light" fontsLoaded={false}>
        <ThemeProvider theme="sudoku">
          <Button label="Continue" />
        </ThemeProvider>
      </ThemeProvider>,
    );
    const label = flat(screen.getByText('Continue'));
    expect(label.fontFamily).toBeUndefined();
    expect(label.fontWeight).toBe('800');
  });
});
