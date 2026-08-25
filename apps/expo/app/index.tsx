import { deckSize } from "@cambio/game";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { PartySmokeTest } from "@/PartySmokeTest";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Cambio</Text>
      <Text style={styles.subtitle}>
        Expo scaffold · deck size {deckSize()} cards
      </Text>
      <PartySmokeTest />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#12061f",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    color: "#f8fafc",
    fontSize: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 8,
  },
});
