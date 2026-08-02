"use client";

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

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (messages.length > prevCountRef.current) {
      list.scrollTop = list.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="pixel-border p-3 flex flex-col gap-2 bg-surface min-h-[140px] lg:min-h-[180px] w-full min-w-0">
      <p className="font-display text-[8px] text-theme-muted">
        {voice.chatLabel}
      </p>

      <div
        ref={listRef}
        className="flex-1 min-h-[72px] max-h-[160px] lg:max-h-[200px] overflow-y-auto space-y-1.5"
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
                className={`font-mono text-[10px] leading-relaxed break-words ${
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
          className="flex-1 min-w-0 px-2 py-1.5 font-mono text-base sm:text-[10px] bg-surface border border-theme-muted text-theme placeholder:text-theme-muted/60 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          aria-label={voice.chatPlaceholder}
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors disabled:opacity-40"
        >
          {voice.chatSend}
        </button>
      </form>
    </div>
  );
}
