import { useTheme } from "@/context/ThemeProvider";
import { getThemeVoice } from "@/lib/themes";

export function useThemeVoice() {
  const { theme } = useTheme();
  return getThemeVoice(theme);
}
