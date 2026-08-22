"use client";

import { hapticClick } from "@cambio/client";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/game/types";
import type { ThemeVoice } from "@/lib/themes";

type ChatPanelProps = {
  messages: ChatMessage[];
  playerId: string;
  connected: boolean;
  voice: ThemeVoice;
  onSend: (text: string) => void;
};

const NEAR_BOTTOM_PX = 48;

function isPinnedToBottom(list: HTMLElement): boolean {
  return (
    list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX
  );
}

export function ChatPanel({
  messages,
  playerId,
  connected,
  voice,
  onSend,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const onScroll = () => {
      pinnedRef.current = isPinnedToBottom(list);
    };

    pinnedRef.current = isPinnedToBottom(list);
    list.addEventListener("scroll", onScroll, { passive: true });
    return () => list.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (!grew) return;
    if (!pinnedRef.current) return;

    // Instant jump when already following the bottom — avoids fighting live appends
    // and preserves OS momentum when the user has scrolled up.
    list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text || !connected) return;
    hapticClick("selection");
    onSend(text);
    setDraft("");
  };

  return (
    <div className="pixel-border p-3 flex flex-col gap-2 bg-surface w-full min-w-0 overflow-hidden shrink-0">
      <p className="font-display text-[8px] text-theme-muted">
        {voice.chatLabel}
      </p>

      <div
        ref={listRef}
        className="native-panel-scroll min-h-18 max-h-40 lg:max-h-50 overflow-y-auto overflow-x-hidden space-y-1.5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="font-mono text-[10px] text-theme-muted/70">
            {voice.chatEmpty}
          </p>
        ) : (
          messages.slice(-50).map((message) => {
            const isOwn = message.playerId === playerId;
            return (
              <p
                key={message.id}
                className={`font-mono text-[10px] leading-relaxed wrap-break-word ${
                  isOwn ? "text-accent" : "text-theme-muted"
                }`}
              >
                <span className="font-display text-[8px] uppercase tracking-wide">
                  {message.playerName}
                </span>
                {": "}
                {message.text}
              </p>
            );
          })
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={voice.chatPlaceholder}
          maxLength={200}
          disabled={!connected}
          className="chat-input flex-1 min-w-0 px-2 py-1.5 font-mono text-base sm:text-[10px] bg-surface border border-theme-muted text-theme focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          aria-label={voice.chatPlaceholder}
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          {voice.chatSend}
        </button>
      </form>
    </div>
  );
}
