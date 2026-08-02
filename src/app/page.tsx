"use client";

import { customAlphabet } from "nanoid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { PLAYER_NAME_KEY } from "@/lib/party";

const roomCode = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export default function HomePage() {
  const router = useRouter();
  const voice = useThemeVoice();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

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

        <ThemePicker />

        <p className="font-display text-[8px] text-theme-muted">
          {voice.footer}
        </p>
      </div>
    </div>
  );
}
