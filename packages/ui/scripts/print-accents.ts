// Prints each OKLCH accent from the design source next to its sRGB hex, for `src/tokens.ts`.
import { formatOklch, oklchSource, oklchToHex, type Oklch } from './oklch.ts';

for (const [theme, schemes] of Object.entries(oklchSource)) {
  for (const [scheme, roles] of Object.entries(schemes)) {
    for (const [role, value] of Object.entries(roles) as [string, Oklch][]) {
      console.log(`${theme}.${scheme}.${role}\t${oklchToHex(value)}\t${formatOklch(value)}`);
    }
  }
}
