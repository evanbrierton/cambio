import { vars } from "nativewind";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useExpoTheme } from "./ExpoThemeProvider";

export function ThemedScreen({ children }: { children: ReactNode }) {
  const { nativeWindVars } = useExpoTheme();

  return (
    <View style={vars(nativeWindVars)} className="flex-1 bg-background">
      {children}
    </View>
  );
}
