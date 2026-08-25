import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { initExpoPlatform } from "@/init-platform";

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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#12061f" },
        headerTintColor: "#f8fafc",
        contentStyle: { backgroundColor: "#12061f" },
      }}
    />
  );
}
