"use client";

import { customAlphabet } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TutorialModal } from "@/components/tutorial/TutorialModal";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

const roomCode = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export default function HomePage() {
  const router = useRouter();
  const voice = useThemeVoice();
  useRehydrateUiPrefs();
  const [joinCode, setJoinCode] = useState("");
  const [nearbyEndpoint, setNearbyEndpoint] = useState("");
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const { playerName: name, setPlayerName } = useUiPrefs();

  const trimmedName = name.trim();
  const hasName = trimmedName.length > 0;

  const goToRoom = (code: string, mode: "host" | "join") => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    const params = new URLSearchParams({ name: trimmedName, [mode]: "1" });
    router.push(`/play/${code}?${params.toString()}`);
  };

  const goToNearbyHost = () => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    const params = new URLSearchParams({
      name: trimmedName,
      host: "1",
      network: "nearby",
    });
    router.push(`/play/${roomCode()}?${params.toString()}`);
  };

  const goToNearbyJoin = () => {
    if (!hasName || joinCode.trim().length < 4 || !nearbyEndpoint.trim()) {
      return;
    }
    setPlayerName(trimmedName);
    const params = new URLSearchParams({
      name: trimmedName,
      join: "1",
      network: "nearby",
      endpoint: nearbyEndpoint.trim(),
    });
    router.push(`/play/${joinCode.trim()}?${params.toString()}`);
  };

  const openTutorial = () => {
    setTutorialStep(0);
    setTutorialOpen(true);
  };

  const goToFindPublic = () => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    router.push("/match");
  };

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
          <p className="text-sm text-theme-muted max-w-sm mx-auto normal-case tracking-normal">
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
            {voice.createLobby}
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

          <button
            type="button"
            disabled={!hasName}
            onClick={goToFindPublic}
            className="w-full font-display text-[10px] text-accent hover:text-accent-soft transition-colors disabled:opacity-40"
          >
            {voice.findPublicGame}
          </button>
        </div>

        <div className="pixel-border p-4 space-y-3 bg-surface-elevated text-left">
          <button
            type="button"
            className="w-full flex items-center justify-between font-display text-[10px] text-theme-muted"
            onClick={() => setNearbyOpen((open) => !open)}
          >
            <span>{voice.networkNearby}</span>
            <span>{nearbyOpen ? "−" : "+"}</span>
          </button>

          {nearbyOpen ? (
            <div className="space-y-3">
              <RetroButton
                className="w-full"
                variant="secondary"
                disabled={!hasName}
                onClick={goToNearbyHost}
              >
                {voice.nearbyHost}
              </RetroButton>
              <label className="block">
                <span className="font-display text-[10px] text-theme-muted">
                  {voice.nearbyEndpointLabel}
                </span>
                <input
                  value={nearbyEndpoint}
                  onChange={(e) => setNearbyEndpoint(e.target.value)}
                  placeholder="192.168.1.10:9876"
                  className="mt-2 w-full input-theme px-3 py-2 font-mono normal-case"
                />
              </label>
              <RetroButton
                className="w-full"
                variant="secondary"
                disabled={
                  !hasName || joinCode.length < 4 || !nearbyEndpoint.trim()
                }
                onClick={goToNearbyJoin}
              >
                {voice.nearbyJoin}
              </RetroButton>
              <p className="font-display text-[8px] text-theme-muted normal-case tracking-normal">
                {voice.nearbyKeepAwake}
              </p>
            </div>
          ) : null}
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
