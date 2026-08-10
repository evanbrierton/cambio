"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/game/types";
import type { ThemeVoice } from "@/lib/themes";

interface ChatPanelProps {
  messages: ChatMessage[];
  playerId: string;
  connected: boolean;
  voice: ThemeVoice;
  onSend: (text: string) => void;
}

export const ChatPanel = ({
  messages,
  playerId,
  connected,
  voice,
  onSend,
}: ChatPanelProps) => {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    if (messages.length > prevCountRef.current) {
      list.scrollTop = list.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!(text && connected)) {
      return;
    }
    onSend(text);
    setDraft("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleDraftChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  return (
    <div className="pixel-border p-3 flex flex-col gap-2 bg-surface w-full min-w-0 overflow-hidden shrink-0">
      <p className="font-display text-[8px] text-theme-muted">
        {voice.chatLabel}
      </p>

      <div
        ref={listRef}
        className="min-h-18 max-h-40 lg:max-h-50 overflow-y-auto overflow-x-hidden space-y-1.5"
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
                :{message.text}
              </p>
            );
          })
        )}
      </div>

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder={voice.chatPlaceholder}
          maxLength={200}
          disabled={!connected}
          className="chat-input flex-1 min-w-0 px-2 py-1.5 font-mono text-base sm:text-[10px] bg-surface border border-theme-muted text-theme focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          aria-label={voice.chatPlaceholder}
        />
        <button
          type="submit"
          disabled={!(connected && draft.trim())}
          className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors disabled:opacity-40"
        >
          {voice.chatSend}
        </button>
      </form>
    </div>
  );
};
