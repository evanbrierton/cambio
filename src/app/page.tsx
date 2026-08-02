"use client";

import { customAlphabet } from "nanoid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { BotDifficulty } from "@/game/types";
import { DEFAULT_BOT_COUNT, MAX_BOT_COUNT, MIN_BOT_COUNT } from "@/game/types";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { PLAYER_NAME_KEY } from "@/lib/party";

const roomCode = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export default function HomePage() {
  const router = useRouter();
  const voice = useThemeVoice();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [botCount, setBotCount] = useState(DEFAULT_BOT_COUNT);
  const [difficulty, setDifficulty] = useState<BotDifficulty>("easy");

  useEffect(() => {
    const stored = localStorage.getItem(PLAYER_NAME_KEY);
    if (stored) setName(stored);
  }, []);

  const goToRoom = (code: string, mode: "host" | "join") => {
    const trimmed = name.trim() || "Player";
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    const params = new URLSearchParams({ name: trimmed, [mode]: "1" });
    router.push(`/play/${code}?${params.toString()}`);
  };

  const goToPractice = () => {
    const trimmed = name.trim() || "Player";
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    const params = new URLSearchParams({
      name: trimmed,
      host: "1",
      solo: "1",
      bots: String(botCount),
      difficulty,
    });
    router.push(`/play/${roomCode()}?${params.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] sm:py-16">
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
              onChange={(e) => setName(e.target.value)}
              placeholder={voice.nicknamePlaceholder}
              maxLength={24}
              className="mt-2 w-full input-theme px-3 py-2 font-mono text-sm normal-case"
            />
          </label>

          <RetroButton
            className="w-full"
            onClick={() => goToRoom(roomCode(), "host")}
          >
            {voice.createGame}
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
                className="mt-2 w-full input-theme input-theme-accent px-3 py-2 font-mono text-sm uppercase"
              />
            </label>
            <RetroButton
              variant="secondary"
              disabled={joinCode.length < 4}
              onClick={() => goToRoom(joinCode.trim(), "join")}
            >
              {voice.join}
            </RetroButton>
          </div>
        </div>

        <div className="pixel-border p-6 space-y-4 bg-surface-elevated text-left">
          <p className="font-display text-[10px] text-theme-muted">
            {voice.practiceMode}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-display text-[10px] text-theme-muted">
                {voice.botCountLabel}
              </span>
              <select
                value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
                className="mt-2 w-full input-theme px-3 py-2 font-mono text-sm normal-case"
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
                onChange={(e) => setDifficulty(e.target.value as BotDifficulty)}
                className="mt-2 w-full input-theme px-3 py-2 font-mono text-sm normal-case"
              >
                <option value="easy">{voice.difficultyEasy}</option>
                <option value="medium">{voice.difficultyMedium}</option>
                <option value="hard">{voice.difficultyHard}</option>
              </select>
            </label>
          </div>

          <RetroButton className="w-full" onClick={goToPractice}>
            {voice.playVsBots}
          </RetroButton>
        </div>

        <ThemePicker />

        <p className="font-display text-[8px] text-theme-muted">
          {voice.footer}
        </p>
      </div>
    </div>
  );
}
