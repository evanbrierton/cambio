"use client";

import { motion } from "framer-motion";
import type { ClientMessage, PlayerView } from "@/game/types";
import type { ThemeVoice } from "@/lib/themes";

const MAX_PLAYERS = 6;

type LobbyPlayersProps = {
  view: PlayerView;
  voice: ThemeVoice;
  send: (message: ClientMessage) => void;
};

export function LobbyPlayers({ view, voice, send }: LobbyPlayersProps) {
  const me = view.players.find((player) => player.id === view.playerId);
  const readyCount = view.players.filter(
    (player) => (player.connected || player.isBot) && !player.isWaiting,
  ).length;
  const emptySlots = Math.max(0, MAX_PLAYERS - view.players.length);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between shrink-0 px-1">
        <p className="font-display text-[8px] text-theme-muted tracking-widest">
          {view.isSoloMode ? voice.practiceMode : voice.playersInLobby}
        </p>
        <p className="font-display text-[8px] text-theme-muted tabular-nums">
          {readyCount}/{MAX_PLAYERS}
        </p>
      </div>

      <div className="pixel-border bg-surface p-3 sm:p-4">
        <ul className="space-y-2">
          {view.players.map((player, index) => {
            const isSelf = player.id === view.playerId;

            return (
              <motion.li
                key={player.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.06 }}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-panel ${
                  isSelf
                    ? "bg-surface-elevated ring-1 ring-accent/50"
                    : "bg-surface-elevated/60"
                }`}
              >
                <span className="player-name text-xs sm:text-sm truncate min-w-0">
                  {player.name}
                  {isSelf ? " (you)" : ""}
                </span>

                <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                  {player.isBot && (
                    <span className="ui-badge text-accent-alt">
                      {voice.botBadge}
                    </span>
                  )}
                  {player.isHost && (
                    <span className="ui-badge text-accent">{voice.host}</span>
                  )}
                  {!player.connected && !player.isBot && (
                    <span className="ui-badge text-theme-muted">
                      {voice.away}
                    </span>
                  )}
                  {player.isWaiting && (
                    <span className="ui-badge text-theme-muted">
                      {voice.waitingBadge}
                    </span>
                  )}
                  {view.isSoloMode &&
                    me?.isHost &&
                    player.isBot &&
                    view.canAddBot && (
                      <button
                        type="button"
                        onClick={() =>
                          send({ type: "remove_bot", playerId: player.id })
                        }
                        className="ui-badge text-theme-muted hover:text-accent transition-colors"
                      >
                        {voice.removeBot}
                      </button>
                    )}
                </div>
              </motion.li>
            );
          })}

          {Array.from({ length: emptySlots }, (_, slotIndex) => (
            <li
              key={`empty-slot-${view.players.length + slotIndex}`}
              className="flex items-center px-3 py-2.5 rounded-panel border border-dashed border-theme-muted/25"
            >
              <span className="font-display text-[10px] text-theme-muted/40">
                ···
              </span>
            </li>
          ))}
        </ul>

        {view.canAddBot && (
          <button
            type="button"
            onClick={() => send({ type: "add_bot" })}
            className="mt-3 w-full chip-btn text-[10px] py-2 border-theme-muted text-theme hover:border-accent transition-colors"
          >
            {voice.addBot}
          </button>
        )}

        {!view.canStartGame && !me?.isHost ? (
          <p className="font-display text-[10px] text-theme-muted text-center mt-4 animate-pulse">
            {voice.waitingForHost}
          </p>
        ) : null}
      </div>
    </div>
  );
}
