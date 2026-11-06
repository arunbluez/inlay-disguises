// Dial's state: the screen, the settings, and set mode for the second time. The centre of the
// dial is the only control with a hold; its tap and its hold both end in the same action. Each
// time the hour hand comes to rest in set mode, the digit it points at is kept and shown, faintly,
// under the readout; a hold hands the digits kept so far to the host.
import { useDisguiseStorage, useLifecycle, useTrigger } from '@inlay/disguise-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { DialTime } from '../Dial';
import type { ThemeId } from '../themes';
import { hourDigit, minutesOf, mod, MINUTES_PER_DAY, offsetTo, SET_START } from '../time';
import { useNow } from './now';
import {
  loadSettings,
  saveSecondTime,
  saveSwitch,
  saveTheme,
  type Settings,
  type Switch,
} from './storage';

export type Screen = 'clock' | 'themes' | 'settings';

/** Set mode: the time on the hands and whether one has been turned yet. */
export interface SetState {
  minutes: number;
  moved: boolean;
}

export interface Store {
  now: Date;
  /** The current time as the dials take it. */
  time: DialTime;
  screen: Screen;
  go: (screen: Screen) => void;
  settings: Settings;
  setTheme: (theme: ThemeId) => void;
  setSwitch: (key: Switch, value: boolean) => void;
  /** The pinned second time, ticking with the current time; `null` when none is pinned. */
  secondTime: DialTime | null;
  clearSecondTime: () => void;
  /** `null` in live mode. */
  set: SetState | null;
  turnHands: (minutes: number) => void;
  /** The hour hand came to rest: keeps the digit it points at. */
  restHourHand: () => void;
  /** The digits kept this time in set mode; empty in live mode. */
  digits: string;
  /** Drops the last digit kept. */
  deleteDigit: () => void;
  /** 24-hour readout only: adds or takes away 12 hours. */
  toggleHalf: () => void;
  cancelSet: () => void;
  centrePress: () => void;
  centreHold: () => void;
  centreHoldEnd: () => void;
  clearOpen: boolean;
  setClearOpen: (open: boolean) => void;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore() must be used inside StoreProvider');
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const storage = useDisguiseStorage();
  const trigger = useTrigger();
  const lifecycle = useLifecycle();
  const now = useNow();

  const [screen, setScreen] = useState<Screen>('clock');
  const [settings, setSettings] = useState(() => loadSettings(storage));
  const [clearOpen, setClearOpen] = useState(false);

  // Set mode lives in a ref as well as in state, so the centre's callbacks always read the hands
  // as they are, whichever render the gesture last saw.
  const [set, setSetState] = useState<SetState | null>(null);
  const setRef = useRef<SetState | null>(null);
  // The hour hand's digits this time in set mode, in memory only; never stored.
  const [digits, setDigits] = useState('');
  const digitsRef = useRef('');
  const updateDigits = useCallback((next: string) => {
    digitsRef.current = next;
    setDigits(next);
  }, []);
  const updateSet = useCallback(
    (next: SetState | null) => {
      if (next === null || setRef.current === null) updateDigits('');
      setRef.current = next;
      setSetState(next);
    },
    [updateDigits],
  );
  const settingsRef = useRef(settings);
  const updateSettings = useCallback((change: Partial<Settings>) => {
    settingsRef.current = { ...settingsRef.current, ...change };
    setSettings(settingsRef.current);
  }, []);

  // A hold whose release is still to come. A reset clears it, so a release that arrives after
  // the host accepted a code pins nothing behind the host's next screen.
  const releasePending = useRef(false);

  useEffect(
    () =>
      lifecycle.onReset(() => {
        releasePending.current = false;
        updateSet(null);
        setClearOpen(false);
        setScreen('clock');
      }),
    [lifecycle, updateSet],
  );

  /** Pins the hands as the second time (if one was turned) and goes back to live mode. */
  const confirm = useCallback(() => {
    const current = setRef.current;
    if (current?.moved) {
      const offset = offsetTo(
        current.minutes,
        minutesOf(new Date()),
        settingsRef.current.twentyFourHour,
      );
      saveSecondTime(storage, offset);
      updateSettings({ secondTimeOffsetMinutes: offset });
    }
    updateSet(null);
  }, [storage, updateSet, updateSettings]);

  /** What a tap on the centre does, and what the release of a hold does. */
  const centreAction = useCallback(() => {
    if (setRef.current === null) updateSet({ minutes: SET_START, moved: false });
    else confirm();
  }, [confirm, updateSet]);

  const store = useMemo<Store>(() => {
    const seconds = now.getSeconds();
    const offset = settings.secondTimeOffsetMinutes;
    return {
      now,
      time: { minutes: minutesOf(now), seconds },
      screen,
      go: (next) => {
        updateSet(null);
        setScreen(next);
      },
      settings,
      setTheme: (theme) => {
        saveTheme(storage, theme);
        updateSettings({ theme });
      },
      setSwitch: (key, value) => {
        saveSwitch(storage, key, value);
        updateSettings({ [key]: value });
      },
      secondTime:
        offset === null
          ? null
          : { minutes: mod(minutesOf(now) + offset, MINUTES_PER_DAY), seconds },
      clearSecondTime: () => {
        saveSecondTime(storage, null);
        updateSettings({ secondTimeOffsetMinutes: null });
        setClearOpen(false);
      },
      set,
      turnHands: (minutes) => {
        if (setRef.current === null) return;
        updateSet({ minutes, moved: true });
      },
      restHourHand: () => {
        const current = setRef.current;
        if (current === null) return;
        const digit = hourDigit(current.minutes);
        if (digit !== null) updateDigits(digitsRef.current + digit);
      },
      digits,
      deleteDigit: () => updateDigits(digitsRef.current.slice(0, -1)),
      toggleHalf: () => {
        const current = setRef.current;
        if (current === null) return;
        updateSet({ minutes: mod(current.minutes + 12 * 60, MINUTES_PER_DAY), moved: true });
      },
      cancelSet: () => updateSet(null),
      centrePress: centreAction,
      centreHold: () => {
        releasePending.current = true;
        if (digitsRef.current !== '') trigger.submit(digitsRef.current);
      },
      centreHoldEnd: () => {
        if (!releasePending.current) return;
        releasePending.current = false;
        centreAction();
      },
      clearOpen,
      setClearOpen,
    };
  }, [
    now,
    screen,
    settings,
    set,
    digits,
    clearOpen,
    storage,
    trigger,
    updateSet,
    updateDigits,
    updateSettings,
    centreAction,
  ]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
