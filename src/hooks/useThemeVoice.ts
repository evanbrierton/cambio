import { useTheme } from "@/context/useTheme";
import { getThemeVoice } from "@/lib/themes";

export function useThemeVoice() {
  const { theme } = useTheme();
  return getThemeVoice(theme);
}
