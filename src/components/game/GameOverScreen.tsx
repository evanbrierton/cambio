"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { ClientMessage, PlayerView, RoundResult } from "@/game/types";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { playSound } from "@/lib/sounds";

type GameOverScreenProps = {
  view: PlayerView;
  connected: boolean;
  send: (message: ClientMessage) => void;
};

function sortedRoundEntries(round: RoundResult) {
  return Object.entries(round.scores).sort(([, a], [, b]) => a - b);
}

function latestRoundNumber(view: PlayerView): number {
  return view.roundHistory.at(-1)?.roundNumber ?? view.roundNumber;
}

function defaultSelectedRound(view: PlayerView): number | "total" {
  const latest = latestRoundNumber(view);
  return latest > 0 ? latest : "total";
}

function sortedCumulative(view: PlayerView) {
  const names = new Map(view.players.map((p) => [p.id, p.name]));
  for (const round of view.roundHistory) {
    for (const [id, name] of Object.entries(round.playerNames)) {
      names.set(id, name);
    }
  }
  return Object.entries(view.cumulativeScores)
    .map(([id, score]) => ({ id, name: names.get(id) ?? "Player", score }))
    .sort((a, b) => a.score - b.score);
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export function GameOverScreen({ view, connected, send }: GameOverScreenProps) {
  const voice = useThemeVoice();
  const latestRound = latestRoundNumber(view);
  const latestRoundTabRef = useRef<HTMLButtonElement>(null);
  const [selectedRound, setSelectedRound] = useState<number | "total">(() =>
    defaultSelectedRound(view),
  );

  useEffect(() => {
    setSelectedRound(defaultSelectedRound(view));
  }, [view]);

  useEffect(() => {
    if (selectedRound !== latestRound) return;
    latestRoundTabRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "end",
      block: "nearest",
    });
  }, [latestRound, selectedRound]);

  const winners = view.players.filter((p) => view.winnerIds.includes(p.id));
  const cumulative = sortedCumulative(view);
  const selected =
    selectedRound === "total"
      ? null
      : view.roundHistory.find((r) => r.roundNumber === selectedRound);

  const handlePlayAgain = () => {
    playSound("click");
    send({ type: "start_game" });
  };

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto flex flex-col gap-5 py-6 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.header
        className="text-center"
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <p className="font-display text-theme-muted text-[10px]">
          {voice.roomPrefix} {view.roomId.toUpperCase()} ·{" "}
          {voice.roundLabel(view.roundNumber)}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl title-glow mt-2">
          {voice.gameOverTitle}
        </h1>
        {winners.length > 0 && (
          <motion.p
            className="text-sm text-theme mt-2 normal-case tracking-normal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 22,
              delay: 0.2,
            }}
          >
            {voice.winnerLabel}{" "}
            <span className="player-name">
              {winners.map((w) => w.name).join(", ")}
            </span>
            {" ★"}
          </motion.p>
        )}
        <p className="font-display text-[10px] text-theme-muted mt-2">
          {connected ? voice.online : voice.reconnecting}
        </p>
      </motion.header>

      <motion.div
        className="pixel-border p-4 bg-surface-elevated"
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <div className="flex flex-nowrap gap-2 mb-4 overflow-x-auto pb-1 scroll-stable">
          <button
            type="button"
            onClick={() => setSelectedRound("total")}
            className={`chip-btn shrink-0 text-[8px] px-2 py-1 transition-colors ${
              selectedRound === "total"
                ? "border-accent text-accent"
                : "border-theme-muted text-theme-muted"
            }`}
          >
            {voice.cumulativeScores}
          </button>
          {view.roundHistory.map((round) => (
            <button
              key={round.roundNumber}
              ref={
                round.roundNumber === latestRound
                  ? latestRoundTabRef
                  : undefined
              }
              type="button"
              onClick={() => setSelectedRound(round.roundNumber)}
              className={`chip-btn shrink-0 text-[8px] px-2 py-1 transition-colors ${
                selectedRound === round.roundNumber
                  ? "border-accent text-accent"
                  : "border-theme-muted text-theme-muted"
              }`}
            >
              {voice.roundLabel(round.roundNumber)}
            </button>
          ))}
        </div>

        {selectedRound === "total" ? (
          <ul className="space-y-2 text-xs">
            {cumulative.map((entry, index) => (
              <motion.li
                key={entry.id}
                className="flex justify-between gap-4 font-display text-theme"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.04 }}
              >
                <span>
                  <span className="text-theme-muted mr-2">#{index + 1}</span>
                  <span className="player-name text-xs">{entry.name}</span>
                </span>
                <span>{entry.score}</span>
              </motion.li>
            ))}
          </ul>
        ) : selected ? (
          <ul className="space-y-2 text-xs">
            {sortedRoundEntries(selected).map(([id, score], index) => (
              <li
                key={id}
                className="flex justify-between gap-4 font-display text-theme"
              >
                <span>
                  <span className="text-theme-muted mr-2">#{index + 1}</span>
                  <span className="player-name text-xs">
                    {selected.playerNames[id] ?? "Player"}
                    {selected.winnerIds.includes(id) ? " ★" : ""}
                  </span>
                </span>
                <span>{score}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </motion.div>

      <motion.div
        className="pixel-border p-4 bg-surface"
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <p className="font-display text-[8px] text-theme-muted mb-2">
          {voice.playersInLobby}
        </p>
        <ul className="space-y-1 text-xs text-theme">
          {view.players.map((p) => (
            <li key={p.id} className="player-name text-xs">
              {p.name}
              {p.isHost ? ` (${voice.host.toLowerCase()})` : ""}
              {p.isWaiting ? ` — ${voice.waitingBadge}` : ""}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 items-center"
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.28 }}
      >
        {view.canStartGame ? (
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2.2,
              ease: "easeInOut",
            }}
          >
            <RetroButton onClick={handlePlayAgain}>{voice.newGame}</RetroButton>
          </motion.div>
        ) : (
          <p className="font-display text-[10px] text-theme-muted text-center animate-pulse px-4">
            {voice.waitingForHost}
          </p>
        )}
        <Link
          href="/"
          className="chip-btn text-center text-[10px] px-4 py-3 border-theme-muted text-theme hover:border-accent transition-colors"
        >
          {voice.leaveGame}
        </Link>
      </motion.div>

      <ThemePicker compact />
    </motion.div>
  );
}
