import {
  Button,
  layout,
  NumberField,
  ScreenHeader,
  spacing,
  textStyle,
  useLifecycle,
  useTheme,
  useTrigger,
  type DisguiseManifest,
} from '@inlay/disguise-sdk';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

/** Longest value the field takes. Codes are at least 4 characters; each disguise sets its maximum. */
const MAX_DIGITS = 8;

/**
 * One numeric field and one button. A tap runs the normal action. A hold hands the field value
 * to the host (when there is one) and runs the normal action on release, exactly as a tap would,
 * so a wrong code looks like any other press. Replace the field, the button and
 * `runNormalAction` with your disguise's own; keep the hold, submit and reset wiring.
 */
function Root() {
  const trigger = useTrigger();
  const lifecycle = useLifecycle();
  const { colors, archivo } = useTheme();
  const [value, setValue] = useState('');
  const [runs, setRuns] = useState(0);
  // A hold whose release is still to come. A reset clears it, so a release that arrives after
  // the host accepted a code does nothing behind the host's next screen.
  const releasePending = useRef(false);

  useEffect(
    () =>
      lifecycle.onReset(() => {
        releasePending.current = false;
        setValue('');
        setRuns(0);
      }),
    [lifecycle],
  );

  const runNormalAction = () => setRuns((count) => count + 1);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Template" />
      <View style={{ paddingHorizontal: layout.gutter, gap: spacing[24] }}>
        <NumberField
          label="Number"
          value={value}
          onChangeText={setValue}
          maxLength={MAX_DIGITS}
          testID="template-field"
        />
        <Button
          label="Apply"
          onPress={runNormalAction}
          onHold={() => {
            releasePending.current = true;
            if (value !== '') trigger.submit(value);
          }}
          onHoldEnd={() => {
            if (!releasePending.current) return;
            releasePending.current = false;
            runNormalAction();
          }}
          testID="template-apply"
        />
        <Text
          testID="template-runs"
          style={[textStyle('body', 15, archivo), { color: colors.muted }]}
        >
          Applied {runs} {runs === 1 ? 'time' : 'times'}
        </Text>
      </View>
    </View>
  );
}

// Neutral placeholders: replace each with your own 1024x1024 artwork (see docs/sdk-reference.md).
const manifest: DisguiseManifest = {
  id: 'template',
  name: 'Template',
  version: '0.0.0',
  minSdk: '0.0.0',
  icon: {
    ios: {
      light: require('../assets/icon/ios-light.png'),
      dark: require('../assets/icon/ios-dark.png'),
      tinted: require('../assets/icon/ios-tinted.png'),
    },
    android: {
      foreground: require('../assets/icon/android-foreground.png'),
      background: require('../assets/icon/android-background.png'),
      monochrome: require('../assets/icon/android-monochrome.png'),
    },
  },
  root: Root,
  triggerDescription: 'Type your code as the number, then hold Apply.',
  allowedHosts: [],
  tier: 'pro',
};

export default manifest;
