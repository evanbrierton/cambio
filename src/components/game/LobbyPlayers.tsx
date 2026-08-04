"use client";

import { motion } from "framer-motion";
import type { ClientMessage, PlayerView } from "@/game/types";
import { MAX_JOKER_COUNT, MIN_JOKER_COUNT } from "@/game/types";
import type { ThemeVoice } from "@/lib/themes";

const MAX_PLAYERS = 6;
const LOBBY_SLOTS = [0, 1, 2, 3, 4, 5] as const;

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

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between shrink-0 px-1">
        <p className="font-display text-[8px] text-theme-muted tracking-widest">
          {view.isSoloMode ? voice.soloMode : voice.playersInLobby}
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

          {LOBBY_SLOTS.filter((slot) => slot >= view.players.length).map(
            (slot) => (
              <li
                key={`empty-slot-${slot}`}
                className="flex items-center px-3 py-2.5 rounded-panel border border-dashed border-theme-muted/25"
              >
                <span className="font-display text-[10px] text-theme-muted/40">
                  ···
                </span>
              </li>
            ),
          )}
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

        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <span className="font-display text-[10px] text-theme-muted">
            {voice.jokerCountLabel}
          </span>
          {view.canSetJokerCount ? (
            <select
              value={view.jokerCount}
              onChange={(e) =>
                send({
                  type: "set_joker_count",
                  count: Number(e.target.value),
                })
              }
              className="input-theme px-2 py-1 font-mono text-[10px] normal-case"
            >
              {Array.from(
                { length: MAX_JOKER_COUNT - MIN_JOKER_COUNT + 1 },
                (_, index) => MIN_JOKER_COUNT + index,
              ).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-display text-[10px] text-theme tabular-nums">
              {view.jokerCount}
            </span>
          )}
        </div>

        {!view.canStartGame && !me?.isHost ? (
          <p className="font-display text-[10px] text-theme-muted text-center mt-4 animate-pulse">
            {voice.waitingForHost}
          </p>
        ) : null}
      </div>
    </div>
  );
}
