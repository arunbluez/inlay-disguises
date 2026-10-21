import {
  layout,
  ListGroup,
  ListRow,
  ScreenHeader,
  useTheme,
  type DisguiseManifest,
} from '@inlay/disguise-sdk';
import { ScrollView, View } from 'react-native';

export interface DisguiseListProps {
  disguises: readonly DisguiseManifest[];
  onOpen: (manifest: DisguiseManifest) => void;
}

/** One row per installed disguise: name, id and tier. Tapping a row runs it. */
export function DisguiseList({ disguises, onOpen }: DisguiseListProps) {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Playground" />
      <View style={{ paddingHorizontal: layout.gutter }}>
        <ListGroup testID="playground-list">
          {disguises.map((manifest) => (
            <ListRow
              key={manifest.id}
              title={manifest.name}
              value={`${manifest.id} · ${manifest.tier}`}
              onPress={() => onOpen(manifest)}
              testID={`playground-row-${manifest.id}`}
            />
          ))}
        </ListGroup>
      </View>
    </ScrollView>
  );
}
