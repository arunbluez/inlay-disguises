// Every piece of copy Dial shows, in one place. `pnpm check-words` scans this file.
import { longDate } from './time';

export const strings = {
  appName: 'Dial',
  tabs: { clock: 'Clock', themes: 'Themes', settings: 'Settings' },
  clock: {
    title: 'Clock',
    date: (date: Date) => longDate(date),
    secondTime: (time: string) => `Second time ${time}`,
    cancel: 'Cancel',
    setHint: 'Turn the hands to the second time',
    clearTitle: 'Clear second time?',
    clearNote: 'The small dial goes away. You can set it again from the centre of the dial.',
    clear: 'Clear',
    keep: 'Keep',
  },
  themes: { title: 'Themes' },
  settings: {
    title: 'Settings',
    display: 'Display',
    twentyFourHour: '24-hour readout',
    showSeconds: 'Show seconds hand',
    showDate: 'Show date',
    about: 'About',
    name: 'Name',
    version: 'Version',
    licence: 'Licences',
    licenceValue: 'Apache-2.0',
  },
};
