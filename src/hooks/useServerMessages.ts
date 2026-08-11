"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Card,
  PeekFlashKind,
  PlayerView,
  ServerMessage,
} from "@/game/types";
import { isAbilitySwapFlash, isHandTakeFlash } from "@/lib/swap-flash";

export const PEEK_FLASH_MS = 3500;
export const SWAP_FLASH_MS = 3000;
export const TAKE_FLASH_MS = 1500;
export const SNAP_FLASH_MS = 2000;
export const PENALTY_FLASH_MS = 2500;
export const CAMBIO_FLASH_MS = 3500;
export const RESHUFFLE_FLASH_MS = 3500;
export const DISCARD_DRAW_FLASH_MS = 3000;
export const DECK_DRAW_FLASH_MS = 3000;
export const PEEK_EFFECT_MS = PEEK_FLASH_MS;

export type FleetingPeek = {
  playerId: string;
  slot: number;
  card: Card;
};

export type PeekFlash = {
  kind: PeekFlashKind;
  actorId: string;
  playerId: string;
  slot: number;
};

export type SwapFlash = {
  slots: Array<{ playerId: string; slot: number }>;
};

export type TakeFlash = {
  playerId: string;
  slot: number;
};

export type SnapFlash = {
  actorId: string;
  playerId: string;
  slot: number;
};

export type PenaltyFlash = {
  playerId: string;
  slot: number;
};

export type CambioFlash = {
  playerId: string;
};

export type ReshuffleFlash = {
  id: number;
};

export type DiscardDrawFlash = {
  playerId: string;
};

export type DeckDrawFlash = {
  playerId: string;
};

export type ServerMessageState = {
  playerId: string | null;
  view: PlayerView | null;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  takeFlash: TakeFlash | null;
  snapFlash: SnapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  cambioFlash: CambioFlash | null;
  reshuffleFlash: ReshuffleFlash | null;
  discardDrawFlash: DiscardDrawFlash | null;
  deckDrawFlash: DeckDrawFlash | null;
};

export type RoomInfoHandler = (playerId: string) => void;

const initialMessageState = (): ServerMessageState => ({
  playerId: null,
  view: null,
  error: null,
  fleetingPeek: null,
  peekFlash: null,
  swapFlash: null,
  takeFlash: null,
  snapFlash: null,
  penaltyFlash: null,
  cambioFlash: null,
  reshuffleFlash: null,
  discardDrawFlash: null,
  deckDrawFlash: null,
});

export function useServerMessages(options?: {
  onRoomInfo?: RoomInfoHandler;
  onViewChange?: (view: PlayerView | null) => void;
  onCambioFlashChange?: (flash: CambioFlash | null) => void;
}) {
  const [messageState, setMessageState] =
    useState<ServerMessageState>(initialMessageState);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const takeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cambioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reshuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const deckDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMessage = useCallback(
    (data: ServerMessage) => {
      if (data.type === "room_info") {
        options?.onRoomInfo?.(data.playerId);
        setMessageState((s) => ({
          ...s,
          playerId: data.playerId,
          error: null,
        }));
      }

      if (data.type === "state") {
        options?.onViewChange?.(data.view);
        setMessageState((s) => ({ ...s, view: data.view, error: null }));
      }

      if (data.type === "secret_peek") {
        if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
        setMessageState((s) => ({
          ...s,
          fleetingPeek: {
            playerId: data.playerId,
            slot: data.slot,
            card: data.card,
          },
        }));
        peekTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, fleetingPeek: null }));
        }, PEEK_FLASH_MS);
      }

      if (data.type === "peek_flash") {
        if (peekEffectTimerRef.current)
          clearTimeout(peekEffectTimerRef.current);
        setMessageState((s) => ({
          ...s,
          peekFlash: {
            kind: data.kind,
            actorId: data.actorId,
            playerId: data.playerId,
            slot: data.slot,
          },
        }));
        peekEffectTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, peekFlash: null }));
        }, PEEK_FLASH_MS);
      }

      if (data.type === "swap_flash") {
        const slots = data.slots ?? [];
        if (isAbilitySwapFlash(slots)) {
          if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
          setMessageState((s) => ({
            ...s,
            swapFlash: { slots },
            takeFlash: null,
          }));
          swapTimerRef.current = setTimeout(() => {
            setMessageState((s) => ({ ...s, swapFlash: null }));
          }, SWAP_FLASH_MS);
        } else if (isHandTakeFlash(slots)) {
          if (takeTimerRef.current) clearTimeout(takeTimerRef.current);
          const [slot] = slots;
          setMessageState((s) => ({
            ...s,
            takeFlash: { playerId: slot.playerId, slot: slot.slot },
            swapFlash: null,
          }));
          takeTimerRef.current = setTimeout(() => {
            setMessageState((s) => ({ ...s, takeFlash: null }));
          }, TAKE_FLASH_MS);
        }
      }

      if (data.type === "snap_flash") {
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
        setMessageState((s) => ({
          ...s,
          snapFlash: {
            actorId: data.actorId,
            playerId: data.playerId,
            slot: data.slot,
          },
        }));
        snapTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, snapFlash: null }));
        }, SNAP_FLASH_MS);
      }

      if (data.type === "penalty_flash") {
        if (penaltyTimerRef.current) clearTimeout(penaltyTimerRef.current);
        setMessageState((s) => ({
          ...s,
          penaltyFlash: {
            playerId: data.playerId,
            slot: data.slot,
          },
        }));
        penaltyTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, penaltyFlash: null }));
        }, PENALTY_FLASH_MS);
      }

      if (data.type === "cambio_flash") {
        if (cambioTimerRef.current) clearTimeout(cambioTimerRef.current);
        const flash = { playerId: data.playerId };
        options?.onCambioFlashChange?.(flash);
        setMessageState((s) => ({
          ...s,
          cambioFlash: flash,
        }));
        cambioTimerRef.current = setTimeout(() => {
          options?.onCambioFlashChange?.(null);
          setMessageState((s) => ({ ...s, cambioFlash: null }));
        }, CAMBIO_FLASH_MS);
      }

      if (data.type === "reshuffle_flash") {
        if (reshuffleTimerRef.current) clearTimeout(reshuffleTimerRef.current);
        setMessageState((s) => ({
          ...s,
          reshuffleFlash: { id: (s.reshuffleFlash?.id ?? 0) + 1 },
        }));
        reshuffleTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, reshuffleFlash: null }));
        }, RESHUFFLE_FLASH_MS);
      }

      if (data.type === "discard_draw_flash") {
        if (discardDrawTimerRef.current)
          clearTimeout(discardDrawTimerRef.current);
        setMessageState((s) => ({
          ...s,
          discardDrawFlash: { playerId: data.playerId },
        }));
        discardDrawTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, discardDrawFlash: null }));
        }, DISCARD_DRAW_FLASH_MS);
      }

      if (data.type === "deck_draw_flash") {
        if (deckDrawTimerRef.current) clearTimeout(deckDrawTimerRef.current);
        setMessageState((s) => ({
          ...s,
          deckDrawFlash: { playerId: data.playerId },
        }));
        deckDrawTimerRef.current = setTimeout(() => {
          setMessageState((s) => ({ ...s, deckDrawFlash: null }));
        }, DECK_DRAW_FLASH_MS);
      }

      if (data.type === "error") {
        if (data.message.includes("Wrong snap")) {
          if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
          setMessageState((s) => ({
            ...s,
            error: data.message,
            snapFlash: null,
          }));
        } else {
          setMessageState((s) => ({ ...s, error: data.message }));
        }
      }
    },
    [options],
  );

  const reset = useCallback(() => {
    setMessageState(initialMessageState());
  }, []);

  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (peekEffectTimerRef.current) clearTimeout(peekEffectTimerRef.current);
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
      if (takeTimerRef.current) clearTimeout(takeTimerRef.current);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      if (penaltyTimerRef.current) clearTimeout(penaltyTimerRef.current);
      if (cambioTimerRef.current) clearTimeout(cambioTimerRef.current);
      if (reshuffleTimerRef.current) clearTimeout(reshuffleTimerRef.current);
      if (discardDrawTimerRef.current)
        clearTimeout(discardDrawTimerRef.current);
      if (deckDrawTimerRef.current) clearTimeout(deckDrawTimerRef.current);
    };
  }, []);

  return { messageState, applyMessage, reset };
}

export type UseServerMessagesReturn = ReturnType<typeof useServerMessages>;
