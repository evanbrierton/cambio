"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RetroButton } from "@/components/ui/RetroButton";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { loadMatchSettings } from "@/lib/match-settings";
import { storageKey } from "@/lib/party";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

export default function MatchPage() {
  const router = useRouter();
  const voice = useThemeVoice();
  useRehydrateUiPrefs();
  const { playerName } = useUiPrefs();
  const trimmedName = playerName.trim();
  const { findMatch, cancel, matching, error } = useMatchmaking(trimmedName);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!trimmedName) {
      router.replace("/");
      return;
    }
    if (!hydrated) return;

    let cancelled = false;
    const settings = loadMatchSettings();

    void findMatch(settings.targetSize, settings.fillWithBots).then(
      (result) => {
        if (cancelled || !result) return;
        // Seed the play-room player id so reconnects reclaim the same seat.
        const key = storageKey(result.roomId);
        localStorage.setItem(key, result.playerId);
        sessionStorage.setItem(key, result.playerId);
        const params = new URLSearchParams({
          name: trimmedName,
          match: "1",
          targetSize: String(result.targetSize),
          fillWithBots: result.fillWithBots ? "1" : "0",
          host: "1",
        });
        router.replace(`/play/${result.roomId}?${params.toString()}`);
      },
    );

    return () => {
      cancelled = true;
      cancel();
    };
  }, [cancel, findMatch, hydrated, router, trimmedName]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-theme animate-pulse text-sm">
        {matching ? voice.findingMatch : voice.loading}
      </p>
      {error ? (
        <p className="font-display text-sm text-red-400">{error}</p>
      ) : null}
      <RetroButton variant="secondary" onClick={() => router.push("/")}>
        {voice.cancelMatch}
      </RetroButton>
    </div>
  );
}
