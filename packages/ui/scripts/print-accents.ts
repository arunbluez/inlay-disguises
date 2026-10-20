// Prints each OKLCH colour next to its sRGB hex, for `src/tokens.ts`.
import { formatOklch, oklchGrounds, oklchSource, oklchToHex, type Oklch } from './oklch.ts';

const print = (name: string, value: Oklch) =>
  console.log(`${name}\t${oklchToHex(value)}\t${formatOklch(value)}`);

for (const [theme, schemes] of Object.entries(oklchSource)) {
  for (const [scheme, roles] of Object.entries(schemes)) {
    for (const [role, value] of Object.entries(roles) as [string, Oklch][]) {
      print(`${theme}.${scheme}.${role}`, value);
    }
  }
}
for (const [scheme, roles] of Object.entries(oklchGrounds)) {
  for (const [role, value] of Object.entries(roles) as [string, Oklch][]) {
    print(`${scheme === 'light' ? 'LIGHT' : 'DARK'}.${role}`, value);
  }
}
