"use client";

import { hapticClick } from "@cambio/client";
import { customAlphabet } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TutorialModal } from "@/components/tutorial/TutorialModal";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { BotDifficulty } from "@/game/types";
import { MAX_BOT_COUNT, MIN_BOT_COUNT } from "@/game/types";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

const roomCode = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

type NearbyMode = "host" | "join";

export default function HomePage() {
  const router = useRouter();
  const voice = useThemeVoice();
  const isMobile = useMobileViewport();
  useRehydrateUiPrefs();
  const [joinCode, setJoinCode] = useState("");
  const [nearbyModeOverride, setNearbyModeOverride] = useState<
    NearbyMode | null
  >(null);
  const [nearbyJoinCode, setNearbyJoinCode] = useState("");
  const [nearbyEndpoint, setNearbyEndpoint] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const {
    playerName: name,
    setPlayerName,
    botCount,
    setBotCount,
    botDifficulty: difficulty,
    setBotDifficulty,
  } = useUiPrefs();

  const trimmedName = name.trim();
  const hasName = trimmedName.length > 0;

  const goToRoom = (code: string, mode: "host" | "join") => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    const params = new URLSearchParams({ name: trimmedName, [mode]: "1" });
    router.push(`/play/${code}?${params.toString()}`);
  };

  const openTutorial = () => {
    setTutorialStep(0);
    setTutorialOpen(true);
  };

  const goToSolo = () => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    const params = new URLSearchParams({
      name: trimmedName,
      host: "1",
      solo: "1",
      bots: String(botCount),
      difficulty,
    });
    router.push(`/play/${roomCode()}?${params.toString()}`);
  };

  const goToMatch = () => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    router.push("/match");
  };

  const goToLocalHost = () => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    const code = roomCode();
    const params = new URLSearchParams({
      name: trimmedName,
      mode: "local",
      host: "1",
    });
    router.push(`/play/${code}?${params.toString()}`);
  };

  const goToLocalJoin = () => {
    if (!hasName) return;
    const code = nearbyJoinCode.trim();
    const endpoint = nearbyEndpoint.trim();
    if (code.length < 4 || !endpoint) return;
    setPlayerName(trimmedName);
    const params = new URLSearchParams({
      name: trimmedName,
      mode: "local",
      join: "1",
      endpoint,
    });
    router.push(`/play/${code}?${params.toString()}`);
  };

  const nearbyJoinReady =
    nearbyJoinCode.trim().length >= 4 && nearbyEndpoint.trim().length > 0;
  const nearbyMode = nearbyModeOverride ?? (isMobile ? "join" : "host");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pt-[max(2.5rem,env(safe-area-inset-top,0px))] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] sm:pt-[max(4rem,env(safe-area-inset-top,0px))] sm:pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <p className="font-display text-theme-muted text-xs">
            {voice.tagline}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl title-glow leading-tight">
            Cambio
          </h1>
          <p className="font-display text-sm text-theme-muted max-w-sm mx-auto normal-case tracking-normal">
            {voice.subtitle}
          </p>
        </div>

        <div className="pixel-border p-6 space-y-4 bg-surface-elevated">
          <label className="block text-left">
            <span className="font-display text-[10px] text-theme-muted">
              {voice.nicknameLabel}
            </span>
            <input
              value={name}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder={voice.nicknamePlaceholder}
              maxLength={24}
              className="mt-2 w-full input-theme px-3 py-2 font-mono normal-case"
            />
          </label>

          <RetroButton
            className="w-full"
            disabled={!hasName}
            onClick={() => goToRoom(roomCode(), "host")}
          >
            {voice.createGame}
          </RetroButton>

          <RetroButton
            className="w-full"
            variant="secondary"
            disabled={!hasName}
            onClick={goToMatch}
          >
            {voice.findMatch}
          </RetroButton>

          <div className="flex gap-2 items-end">
            <label className="flex-1 text-left">
              <span className="font-display text-[10px] text-theme-muted">
                {voice.roomCodeLabel}
              </span>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                placeholder="abc123"
                maxLength={6}
                className="mt-2 w-full input-theme input-theme-accent px-3 py-2 font-mono uppercase"
              />
            </label>
            <RetroButton
              variant="secondary"
              disabled={joinCode.length < 4 || !hasName}
              onClick={() => goToRoom(joinCode.trim(), "join")}
            >
              {voice.join}
            </RetroButton>
          </div>
        </div>

        <div className="pixel-border p-6 space-y-4 bg-surface-elevated text-left">
          <div className="space-y-1">
            <p className="font-display text-[10px] text-theme-muted">
              Play nearby
            </p>
            <p className="font-display text-[8px] text-theme-muted normal-case tracking-normal">
              Same Wi‑Fi — no internet required
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <RetroButton
              variant={nearbyMode === "host" ? "primary" : "secondary"}
              className="w-full"
              onClick={() => setNearbyModeOverride("host")}
            >
              Host
            </RetroButton>
            <RetroButton
              variant={nearbyMode === "join" ? "primary" : "secondary"}
              className="w-full"
              onClick={() => setNearbyModeOverride("join")}
            >
              Join
            </RetroButton>
          </div>

          {nearbyMode === "host" ? (
            <div className="space-y-3">
              {isMobile ? (
                <p className="font-display text-[8px] text-amber-300/90 normal-case tracking-normal">
                  Phones make weak hosts. A laptop or tablet on Wi‑Fi works
                  best.
                </p>
              ) : null}
              <RetroButton
                className="w-full"
                disabled={!hasName}
                onClick={goToLocalHost}
              >
                Host nearby game
              </RetroButton>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="font-display text-[10px] text-theme-muted">
                  {voice.roomCodeLabel}
                </span>
                <input
                  value={nearbyJoinCode}
                  onChange={(e) =>
                    setNearbyJoinCode(e.target.value.toLowerCase())
                  }
                  placeholder="abc123"
                  maxLength={6}
                  className="mt-2 w-full input-theme input-theme-accent px-3 py-2 font-mono uppercase"
                />
              </label>
              <label className="block">
                <span className="font-display text-[10px] text-theme-muted">
                  Host endpoint
                </span>
                <input
                  value={nearbyEndpoint}
                  onChange={(e) => setNearbyEndpoint(e.target.value.trim())}
                  placeholder="192.168.1.42:9876"
                  className="mt-2 w-full input-theme px-3 py-2 font-mono normal-case"
                />
              </label>
              <RetroButton
                className="w-full"
                disabled={!hasName || !nearbyJoinReady}
                onClick={goToLocalJoin}
              >
                Join nearby game
              </RetroButton>
            </div>
          )}
        </div>

        <div className="pixel-border p-6 space-y-4 bg-surface-elevated text-left">
          <p className="font-display text-[10px] text-theme-muted">
            {voice.soloMode}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-display text-[10px] text-theme-muted">
                {voice.botCountLabel}
              </span>
              <select
                value={botCount}
                onChange={(e) => {
                  hapticClick("selection");
                  setBotCount(Number(e.target.value));
                }}
                className="mt-2 w-full input-theme px-3 py-2 font-mono normal-case"
              >
                {Array.from(
                  { length: MAX_BOT_COUNT - MIN_BOT_COUNT + 1 },
                  (_, index) => MIN_BOT_COUNT + index,
                ).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-display text-[10px] text-theme-muted">
                {voice.difficultyLabel}
              </span>
              <select
                value={difficulty}
                onChange={(e) => {
                  hapticClick("selection");
                  setBotDifficulty(e.target.value as BotDifficulty);
                }}
                className="mt-2 w-full input-theme px-3 py-2 font-mono normal-case"
              >
                <option value="easy">{voice.difficultyEasy}</option>
                <option value="medium">{voice.difficultyMedium}</option>
                <option value="hard">{voice.difficultyHard}</option>
              </select>
            </label>
          </div>

          <RetroButton
            className="w-full"
            disabled={!hasName}
            onClick={goToSolo}
          >
            {voice.playVsBots}
          </RetroButton>
        </div>

        <ThemePicker />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <RetroButton variant="secondary" onClick={openTutorial}>
            How to play
          </RetroButton>
          <Link
            href="/rules"
            className="font-display text-[10px] text-accent hover:text-accent-soft transition-colors"
          >
            Full rules
          </Link>
        </div>

        <p className="font-display text-[8px] text-theme-muted">
          {voice.footer}
        </p>
      </div>

      <TutorialModal
        open={tutorialOpen}
        stepIndex={tutorialStep}
        onStepIndexChange={setTutorialStep}
        onClose={() => setTutorialOpen(false)}
      />
    </div>
  );
}
