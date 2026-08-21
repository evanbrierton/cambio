"use client";

import { hapticClick } from "@cambio/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SwipeToLeave } from "@/components/SwipeToLeave";
import { RetroButton } from "@/components/ui/RetroButton";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { loadMatchSettings, saveMatchSettings } from "@/lib/match-settings";
import { storageKey } from "@/lib/party";
import {
  clampMatchTargetSize,
  DEFAULT_MATCH_FILL_WITH_BOTS,
  DEFAULT_MATCH_TARGET_SIZE,
  MAX_MATCH_TARGET_SIZE,
  MIN_MATCH_TARGET_SIZE,
} from "@/matchmaking/types";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

const TARGET_SIZES = Array.from(
  { length: MAX_MATCH_TARGET_SIZE - MIN_MATCH_TARGET_SIZE + 1 },
  (_, index) => MIN_MATCH_TARGET_SIZE + index,
);

export default function MatchPage() {
  const router = useRouter();
  const voice = useThemeVoice();
  useRehydrateUiPrefs();
  const { playerName } = useUiPrefs();
  const trimmedName = playerName.trim();
  const { findMatch, cancel, matching, error } = useMatchmaking(trimmedName);
  const [targetSize, setTargetSize] = useState(DEFAULT_MATCH_TARGET_SIZE);
  const [fillWithBots, setFillWithBots] = useState(
    DEFAULT_MATCH_FILL_WITH_BOTS,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadMatchSettings();
    setTargetSize(saved.targetSize);
    setFillWithBots(saved.fillWithBots);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveMatchSettings({ targetSize, fillWithBots });
  }, [fillWithBots, hydrated, targetSize]);

  useEffect(() => {
    if (!trimmedName) {
      router.replace("/");
      return;
    }
    if (!hydrated) return;

    let cancelled = false;

    void findMatch(targetSize, fillWithBots).then((result) => {
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
    });

    return () => {
      cancelled = true;
      cancel();
    };
  }, [
    cancel,
    fillWithBots,
    findMatch,
    hydrated,
    router,
    targetSize,
    trimmedName,
  ]);

  return (
    <SwipeToLeave
      enabled
      label={voice.leaveGame}
      className="fixed inset-0 z-10 flex flex-col"
    >
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-full max-w-md space-y-4 pixel-border p-6 bg-surface-elevated text-left">
          <div className="space-y-2">
            <p className="font-display text-[10px] text-theme-muted">
              {voice.matchPlayersLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {TARGET_SIZES.map((size) => {
                const selected = size === targetSize;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      hapticClick("selection");
                      setTargetSize(clampMatchTargetSize(size));
                    }}
                    className={`chip-btn min-w-10 px-3 py-2 text-[10px] transition-colors ${
                      selected
                        ? "border-accent text-accent"
                        : "border-theme-muted text-theme hover:border-accent"
                    }`}
                    aria-pressed={selected}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-[10px] text-theme-muted">
              {voice.matchFillWithBotsLabel}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={fillWithBots}
              onClick={() => {
                hapticClick("selection");
                setFillWithBots((value) => !value);
              }}
              className={`chip-btn px-3 py-2 text-[10px] transition-colors ${
                fillWithBots
                  ? "border-accent text-accent"
                  : "border-theme-muted text-theme hover:border-accent"
              }`}
            >
              {fillWithBots ? voice.matchFillBotsOn : voice.matchFillBotsOff}
            </button>
          </div>
        </div>

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
    </SwipeToLeave>
  );
}
