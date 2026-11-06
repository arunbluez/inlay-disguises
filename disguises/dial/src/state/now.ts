import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** One second. */
export const TICK = 1000;

/**
 * The current time, updated on every whole second while the app is in the foreground. The timer
 * stops when the app goes to the background and on unmount; coming back reads the clock at once.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let align: ReturnType<typeof setTimeout> | undefined;
    let tick: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (align !== undefined) clearTimeout(align);
      if (tick !== undefined) clearInterval(tick);
      align = undefined;
      tick = undefined;
    };
    const start = () => {
      stop();
      setNow(new Date());
      // Land on the next whole second, then step once a second.
      align = setTimeout(
        () => {
          align = undefined;
          setNow(new Date());
          tick = setInterval(() => setNow(new Date()), TICK);
        },
        TICK - (Date.now() % TICK),
      );
    };

    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      subscription.remove();
      stop();
    };
  }, []);

  return now;
}
