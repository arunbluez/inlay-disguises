import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { controls, fontStyle, layout, radii, spacing, tabularNums, textStyle } from '../tokens';
import { focusRing, useFocused } from './focus';
import { Cross } from './glyphs';

const removeSlop = (layout.minHit - controls.rowAction.size) / 2;

export interface FileRowProps {
  /** Short file type in the leading tile, e.g. "JPG". */
  badge: string;
  title: string;
  /** Muted line under the title: a date, a count, a size. */
  meta?: string;
  /** Deep-accent figure at the end, e.g. "−72%". */
  value?: string;
  /** Muted line under `value`, e.g. "61 MB → 17 MB". */
  subValue?: string;
  /** Shows a remove action at the end instead of `value`. */
  onRemove?: () => void;
  /** Defaults to "Remove" and the title. */
  removeLabel?: string;
  testID?: string;
}

/**
 * A 52-point file row: type tile, title and meta, then a figure or a remove action. Sits in a
 * `ListGroup` or straight on the ground.
 */
export function FileRow({
  badge,
  title,
  meta,
  value,
  subValue,
  onRemove,
  removeLabel,
  testID,
}: FileRowProps) {
  const { colors, archivo } = useTheme();
  const label = [title, meta, onRemove ? undefined : value, onRemove ? undefined : subValue]
    .filter(Boolean)
    .join(', ');
  return (
    <View
      testID={testID}
      accessible={onRemove === undefined}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[12],
        minHeight: layout.row,
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[4],
      }}
    >
      <View
        style={{
          width: controls.fileBadge.size,
          height: controls.fileBadge.size,
          justifyContent: 'flex-end',
          padding: controls.fileBadge.inset,
          borderRadius: radii.tile,
          backgroundColor: colors.press,
        }}
      >
        <Text numberOfLines={1} style={[textStyle('label', 10, archivo), { color: colors.ink }]}>
          {badge}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={[textStyle('body', 15, archivo), fontStyle(600, archivo), { color: colors.ink }]}
        >
          {title}
        </Text>
        {meta ? (
          <Text
            numberOfLines={1}
            style={[
              textStyle('caption', 12, archivo),
              { color: colors.muted, fontVariant: [...tabularNums] },
            ]}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {onRemove ? (
        <RemoveAction
          label={removeLabel ?? `Remove ${title}`}
          onPress={onRemove}
          testID={testID ? `${testID}-remove` : undefined}
        />
      ) : value || subValue ? (
        <View style={{ alignItems: 'flex-end' }}>
          {value ? (
            <Text
              style={[
                textStyle('action', 15, archivo),
                { color: colors.deep, fontVariant: [...tabularNums] },
              ]}
            >
              {value}
            </Text>
          ) : null}
          {subValue ? (
            <Text
              style={[
                textStyle('caption', 12, archivo),
                { color: colors.muted, fontVariant: [...tabularNums] },
              ]}
            >
              {subValue}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface RemoveActionProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

function RemoveAction({ label, onPress, testID }: RemoveActionProps) {
  const { colors } = useTheme();
  const [focused, focusHandlers] = useFocused();
  return (
    <Pressable
      {...focusHandlers}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={removeSlop}
      style={({ pressed }) => [
        {
          width: controls.rowAction.size,
          height: controls.rowAction.size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.tile,
          backgroundColor: pressed ? colors.press : 'transparent',
        },
        focused && focusRing(colors.ink),
      ]}
    >
      <Cross size={controls.rowAction.glyph} color={colors.muted} />
    </Pressable>
  );
}
