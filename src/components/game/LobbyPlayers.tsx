"use client";

import { hapticClick } from "@cambio/client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { CardPointValues, ClientMessage, PlayerView } from "@/game/types";
import {
  MAX_CARD_POINT_VALUE,
  MAX_JOKER_COUNT,
  MIN_CARD_POINT_VALUE,
  MIN_JOKER_COUNT,
} from "@/game/types";
import type { ThemeVoice } from "@/lib/themes";

const MAX_PLAYERS = 6;
const LOBBY_SLOTS = [0, 1, 2, 3, 4, 5] as const;
const CARD_POINT_OPTIONS = Array.from(
  { length: MAX_CARD_POINT_VALUE - MIN_CARD_POINT_VALUE + 1 },
  (_, index) => MIN_CARD_POINT_VALUE + index,
);

/** Fixed width fits "-5" through "25" at mobile input font size (16px) plus select chrome. */
const LOBBY_SETTING_FIELD_CLASS =
  "box-border w-20 min-w-20 shrink-0 px-2 py-1 font-mono text-[10px] sm:text-sm tabular-nums text-right";

const LOBBY_SETTING_SELECT_CLASS = `input-theme ${LOBBY_SETTING_FIELD_CLASS} normal-case`;

const LOBBY_SETTING_READOUT_CLASS = `font-display text-theme ${LOBBY_SETTING_FIELD_CLASS}`;

type CardPointField = keyof CardPointValues;

const CARD_POINT_FIELDS: Array<{
  key: CardPointField;
  labelKey:
    | "acePointsLabel"
    | "facePointsLabel"
    | "jokerPointsLabel"
    | "blackKingPointsLabel"
    | "redKingPointsLabel";
}> = [
  { key: "ace", labelKey: "acePointsLabel" },
  { key: "face", labelKey: "facePointsLabel" },
  { key: "joker", labelKey: "jokerPointsLabel" },
  { key: "blackKing", labelKey: "blackKingPointsLabel" },
  { key: "redKing", labelKey: "redKingPointsLabel" },
];

type LobbyPlayersProps = {
  view: PlayerView;
  voice: ThemeVoice;
  send: (message: ClientMessage) => void;
  lanEndpoint?: string | null;
};

export function LobbyPlayers({
  view,
  voice,
  send,
  lanEndpoint,
}: LobbyPlayersProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const me = view.players.find((player) => player.id === view.playerId);
  const readyCount = view.players.filter(
    (player) => (player.connected || player.isBot) && !player.isWaiting,
  ).length;
  const isPublic = view.network === "online" && view.visibility === "public";
  const lobbyLabel = isPublic
    ? voice.publicLobby
    : view.network === "nearby"
      ? voice.networkNearby
      : voice.playersInLobby;
  const lobbyCountLabel = isPublic
    ? voice.matchFillStatus(view.matchHumanCount, view.matchTargetSize)
    : `${readyCount}/${MAX_PLAYERS}`;

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between shrink-0 px-1">
        <p className="font-display text-[8px] text-theme-muted tracking-widest">
          {lobbyLabel}
        </p>
        <p className="font-display text-[8px] text-theme-muted tabular-nums">
          {lobbyCountLabel}
        </p>
      </div>

      {isPublic && view.matchStartingSoon ? (
        <p className="font-display text-[8px] text-theme-muted text-center animate-pulse">
          {voice.matchStartingSoon}
        </p>
      ) : null}

      {view.network === "nearby" && lanEndpoint ? (
        <p className="font-display text-[8px] text-theme-muted text-center normal-case tracking-normal">
          {voice.nearbyEndpointLabel}: {lanEndpoint}
        </p>
      ) : null}

      {view.network === "nearby" && me?.isHost ? (
        <p className="font-display text-[8px] text-theme-muted text-center normal-case tracking-normal">
          {voice.nearbyKeepAwake}
        </p>
      ) : null}

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
                  {me?.isHost && player.isBot && view.canAddBot && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticClick("selection");
                        send({ type: "remove_bot", playerId: player.id });
                      }}
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
            onClick={() => {
              hapticClick("selection");
              send({
                type: "add_bot",
                difficulty: view.botDifficulty ?? undefined,
              });
            }}
            className="mt-3 w-full chip-btn text-[10px] py-2 border-theme-muted text-theme hover:border-accent transition-colors"
          >
            {voice.addBot}
          </button>
        )}

        <div className="mt-3 border-t border-theme-muted/20 pt-3">
          <button
            type="button"
            onClick={() => {
              hapticClick("selection");
              setSettingsOpen((open) => !open);
            }}
            aria-expanded={settingsOpen}
            className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left transition-colors hover:text-accent"
          >
            <span className="font-display text-[10px] text-theme-muted">
              {voice.gameSettingsLabel}
            </span>
            <ChevronDown
              aria-hidden
              className={`h-3 w-3 shrink-0 text-theme-muted transition-transform duration-200 ${
                settingsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {settingsOpen ? (
              <motion.div
                key="lobby-game-settings"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {view.canSetLobbySettings ? (
                    <>
                      <div className="flex items-center justify-between gap-3 px-1">
                        <span className="font-display text-[10px] text-theme-muted">
                          {voice.networkLabel}
                        </span>
                        <span className={LOBBY_SETTING_READOUT_CLASS}>
                          {view.network === "nearby"
                            ? voice.networkNearby
                            : voice.networkOnline}
                        </span>
                      </div>
                      {view.network === "online" ? (
                        <div className="flex items-center justify-between gap-3 px-1">
                          <span className="font-display text-[10px] text-theme-muted">
                            {voice.visibilityLabel}
                          </span>
                          <select
                            value={view.visibility}
                            onChange={(e) => {
                              hapticClick("selection");
                              send({
                                type: "set_visibility",
                                visibility: e.target.value as
                                  | "private"
                                  | "public",
                              });
                            }}
                            className={LOBBY_SETTING_SELECT_CLASS}
                          >
                            <option value="private">
                              {voice.visibilityPrivate}
                            </option>
                            <option value="public">
                              {voice.visibilityPublic}
                            </option>
                          </select>
                        </div>
                      ) : null}
                      {isPublic ? (
                        <>
                          <div className="flex items-center justify-between gap-3 px-1">
                            <span className="font-display text-[10px] text-theme-muted">
                              {voice.matchPlayersLabel}
                            </span>
                            <select
                              value={view.matchTargetSize}
                              onChange={(e) => {
                                hapticClick("selection");
                                send({
                                  type: "set_match_config",
                                  targetSize: Number(e.target.value),
                                });
                              }}
                              className={LOBBY_SETTING_SELECT_CLASS}
                            >
                              {[2, 3, 4, 5, 6].map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-1">
                            <span className="font-display text-[10px] text-theme-muted">
                              {voice.matchFillWithBotsLabel}
                            </span>
                            <select
                              value={view.matchFillWithBots ? "1" : "0"}
                              onChange={(e) => {
                                hapticClick("selection");
                                send({
                                  type: "set_match_config",
                                  fillWithBots: e.target.value === "1",
                                });
                              }}
                              className={LOBBY_SETTING_SELECT_CLASS}
                            >
                              <option value="1">{voice.matchFillBotsOn}</option>
                              <option value="0">
                                {voice.matchFillBotsOff}
                              </option>
                            </select>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="font-display text-[10px] text-theme-muted">
                      {voice.jokerCountLabel}
                    </span>
                    {view.canSetJokerCount ? (
                      <select
                        value={view.jokerCount}
                        onChange={(e) => {
                          hapticClick("selection");
                          send({
                            type: "set_joker_count",
                            count: Number(e.target.value),
                          });
                        }}
                        className={LOBBY_SETTING_SELECT_CLASS}
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
                      <span className={LOBBY_SETTING_READOUT_CLASS}>
                        {view.jokerCount}
                      </span>
                    )}
                  </div>

                  {CARD_POINT_FIELDS.map(({ key, labelKey }) => (
                    <div
                      key={key}
                      className="mt-2 flex items-center justify-between gap-3 px-1"
                    >
                      <span className="font-display text-[10px] text-theme-muted">
                        {voice[labelKey]}
                      </span>
                      {view.canSetCardPoints ? (
                        <select
                          value={view.cardPoints[key]}
                          onChange={(e) => {
                            hapticClick("selection");
                            send({
                              type: "set_card_points",
                              values: { [key]: Number(e.target.value) },
                            });
                          }}
                          className={LOBBY_SETTING_SELECT_CLASS}
                        >
                          {CARD_POINT_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={LOBBY_SETTING_READOUT_CLASS}>
                          {view.cardPoints[key]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {!isPublic && !view.canStartGame && !me?.isHost ? (
          <p className="font-display text-[10px] text-theme-muted text-center mt-4 animate-pulse">
            {voice.waitingForHost}
          </p>
        ) : null}
      </div>
    </div>
  );
}
