import "../global.css";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { initExpoPlatform } from "@/init-platform";
import { ExpoThemeProvider } from "@/theme/ExpoThemeProvider";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void initExpoPlatform().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#12061f",
        }}
      >
        <ActivityIndicator color="#c4b5fd" />
      </View>
    );
  }

  return (
    <ExpoThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </ExpoThemeProvider>
  );
}
