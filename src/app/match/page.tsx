"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RetroButton } from "@/components/ui/RetroButton";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

export default function MatchPage() {
  const router = useRouter();
  const voice = useThemeVoice();
  useRehydrateUiPrefs();
  const { playerName } = useUiPrefs();
  const trimmedName = playerName.trim();
  const { findMatch, cancel, matching, error } = useMatchmaking(trimmedName);

  useEffect(() => {
    if (!trimmedName) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    void findMatch().then((result) => {
      if (cancelled || !result) return;
      const params = new URLSearchParams({
        name: trimmedName,
        match: "1",
        targetSize: String(result.targetSize),
        fillWithBots: result.fillWithBots ? "1" : "0",
        host: "1",
      });
      router.replace(`/play/${result.roomId}?${params.toString()}`);
    });

    return () => {
      cancelled = true;
      cancel();
    };
  }, [cancel, findMatch, router, trimmedName]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
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
