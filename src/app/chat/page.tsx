"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Source, ConfidenceLevel } from "@/lib/rag/answer";

const EXAMPLE_QUESTIONS = [
  "What are the maintenance intervals for the hydraulic pump?",
  "List all safety regulations mentioned in the compliance documents.",
  "What process parameters are required for the welding procedure?",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidence?: ConfidenceLevel;
  latencyMs?: number;
  abstained?: boolean;
  streaming?: boolean;
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  High: "bg-emerald-500 text-white border-transparent",
  Medium: "bg-yellow-500 text-white border-transparent",
  Low: "bg-destructive text-destructive-foreground border-transparent",
};

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <Badge className={`text-xs ${CONFIDENCE_STYLES[level]}`}>
      {level} confidence
    </Badge>
  );
}

function SourceChip({
  source,
  onClick,
}: {
  source: Source;
  onClick: (s: Source) => void;
}) {
  return (
    <button
      onClick={() => onClick(source)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-xs text-muted-foreground border border-border transition-colors"
    >
      <span className="font-mono font-semibold text-foreground">[{source.n}]</span>
      <span className="truncate max-w-[120px]">{source.fileName}</span>
      <span className="opacity-60">p.{source.page}</span>
    </button>
  );
}

function SourceDialog({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="font-mono text-primary">[{source?.n}]</span>
            {source?.fileName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Section / Page: <strong className="text-foreground">{source?.page}</strong></span>
            <span>Similarity: <strong className="text-foreground">{((source?.score ?? 0) * 100).toFixed(1)}%</strong></span>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-foreground border border-border">
            {source?.snippet}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = useCallback(
    async (query: string) => {
      if (!query.trim() || isStreaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Cached (non-streaming) response
        const ct = res.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: data.answer,
                    sources: data.sources,
                    confidence: data.confidence,
                    latencyMs: data.latencyMs,
                    abstained: data.abstained,
                    streaming: false,
                  }
                : m
            )
          );
          return;
        }

        // SSE streaming response
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let pendingSources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const eventBlock of events) {
            const lines = eventBlock.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event: "));
            const dataLine = lines.find((l) => l.startsWith("data: "));
            if (!eventLine || !dataLine) continue;

            const eventName = eventLine.slice(7).trim();
            const payload = JSON.parse(dataLine.slice(6));

            if (eventName === "meta") {
              pendingSources = payload.sources as Source[];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: pendingSources } : m
                )
              );
            } else if (eventName === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (payload.chunk as string) }
                    : m
                )
              );
            } else if (eventName === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        confidence: payload.confidence as ConfidenceLevel,
                        latencyMs: payload.latencyMs as number,
                        abstained: payload.abstained as boolean,
                        streaming: false,
                      }
                    : m
                )
              );
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "An error occurred. Please try again.",
                  streaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery(input);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← IKI
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold text-sm">Knowledge Copilot</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Ask anything</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Ask questions about your ingested industrial documents. Answers come
                with source citations and a confidence score.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuery(q)}
                  className="text-left px-4 py-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] space-y-2 ${
                msg.role === "user" ? "items-end" : "items-start"
              } flex flex-col`}
            >
              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm border border-border"
                }`}
              >
                {msg.role === "assistant" ? (
                  msg.streaming && !msg.content ? (
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  )
                ) : (
                  msg.content
                )}
              </div>

              {/* Metadata row */}
              {msg.role === "assistant" && !msg.streaming && msg.confidence && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <ConfidenceBadge level={msg.confidence} />
                  {msg.latencyMs && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {(msg.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              )}

              {/* Sources */}
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {msg.sources.map((s) => (
                    <SourceChip
                      key={s.n}
                      source={s}
                      onClick={setActiveSource}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex gap-2 items-end"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents…"
            className="resize-none min-h-[44px] max-h-32 flex-1 text-sm"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isStreaming}
            size="sm"
            className="h-11 px-5 shrink-0"
          >
            {isStreaming ? "…" : "Ask"}
          </Button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground mt-2 max-w-3xl mx-auto">
          Answers grounded in ingested documents only · Shift+Enter for newline
        </p>
      </div>

      <SourceDialog source={activeSource} onClose={() => setActiveSource(null)} />
    </div>
  );
}
