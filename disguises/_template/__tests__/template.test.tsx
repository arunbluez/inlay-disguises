import { renderDisguise } from '@inlay/testkit';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import manifest from '../src';

/** Holds Apply past the threshold, then lifts the finger. */
async function holdApply() {
  const hold = createGestureController('template-apply-hold');
  await act(() => hold.begin());
  await act(() => hold.activate());
  return { release: () => act(() => hold.end()) };
}

async function typeNumber(text: string) {
  await fireEvent.changeText(screen.getByTestId('template-field'), text);
}

describe('_template manifest', () => {
  it('is a pro disguise with a full icon set and no network hosts', () => {
    expect(manifest.tier).toBe('pro');
    expect(manifest.allowedHosts).toEqual([]);
    expect(Object.keys(manifest.icon.ios)).toEqual(['light', 'dark', 'tinted']);
    expect(Object.keys(manifest.icon.android)).toEqual(['foreground', 'background', 'monochrome']);
  });
});

describe('_template trigger', () => {
  it('a hold submits the field value once; the release runs the normal action', async () => {
    const { host } = await renderDisguise(manifest);
    await typeNumber('2468');

    const { release } = await holdApply();
    expect(host.submittedCodes).toEqual(['2468']);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent('Last code: 2468');
    expect(screen.getByTestId('template-runs')).toHaveTextContent('Applied 0 times');

    await release();
    expect(host.submittedCodes).toEqual(['2468']);
    expect(screen.getByTestId('template-runs')).toHaveTextContent('Applied 1 time');
  });

  it('a tap runs the normal action and submits nothing', async () => {
    const { host } = await renderDisguise(manifest);
    await typeNumber('2468');

    await fireEvent.press(screen.getByTestId('template-apply'));

    expect(host.submittedCodes).toEqual([]);
    expect(screen.getByTestId('template-runs')).toHaveTextContent('Applied 1 time');
  });

  it('a hold with an empty field submits nothing and still runs the normal action', async () => {
    const { host } = await renderDisguise(manifest);

    const { release } = await holdApply();
    await release();

    expect(host.submittedCodes).toEqual([]);
    expect(screen.getByTestId('template-runs')).toHaveTextContent('Applied 1 time');
  });

  it('the field takes digits only', async () => {
    await renderDisguise(manifest);
    await typeNumber('12a3-4');
    expect(screen.getByTestId('template-field')).toHaveDisplayValue('1234');
  });
});

describe('_template reset', () => {
  it('host.reset() clears the field and returns to the home state', async () => {
    const { host } = await renderDisguise(manifest);
    await typeNumber('2468');
    await fireEvent.press(screen.getByTestId('template-apply'));
    expect(screen.getByTestId('template-field')).toHaveDisplayValue('2468');

    await act(() => host.reset());

    expect(screen.getByTestId('template-field')).toHaveDisplayValue('');
    expect(screen.getByTestId('template-runs')).toHaveTextContent('Applied 0 times');
  });

  it('a release after a reset does nothing (the pending action is cancelled)', async () => {
    const { host } = await renderDisguise(manifest);
    await typeNumber('2468');

    const { release } = await holdApply();
    expect(host.submittedCodes).toEqual(['2468']);
    await act(() => host.reset());
    await release();

    expect(screen.getByTestId('template-field')).toHaveDisplayValue('');
    expect(screen.getByTestId('template-runs')).toHaveTextContent('Applied 0 times');
  });
});
