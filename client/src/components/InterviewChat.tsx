import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Session, Message } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Square } from "lucide-react";

// Simple markdown formatting for agent messages
function formatMessage(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

interface Props {
  session: Session;
}

export function InterviewChat({ session }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Fetch messages
  const {
    data: messages = [],
    isLoading,
  } = useQuery<Message[]>({
    queryKey: ["/api/sessions", session.id, "messages"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/sessions/${session.id}/messages`
      );
      return res.json();
    },
    refetchInterval: false,
  });

  // Start interview (agent sends first message)
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/sessions/${session.id}/start`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/sessions", session.id, "messages"],
      });
    },
  });

  // Send user message
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(
        "POST",
        `/api/sessions/${session.id}/messages`,
        { content }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/sessions", session.id, "messages"],
      });
      setInput("");
    },
  });

  // Auto-start interview on mount
  useEffect(() => {
    if (!hasStarted && messages.length === 0 && !isLoading) {
      setHasStarted(true);
      startMutation.mutate();
    }
  }, [messages, isLoading, hasStarted]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAgentThinking = startMutation.isPending || sendMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Session info bar */}
      <div className="border-b border-border px-4 py-2 bg-card/50 shrink-0">
        <p
          className="text-sm font-medium truncate"
          data-testid="text-session-title"
        >
          {session.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Objective: {session.objective}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        data-testid="chat-messages"
      >
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
            data-testid={`message-${msg.role}-${msg.id}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              {msg.role === "agent" && (
                <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Interviewer
                </p>
              )}
              <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
            </div>
          </div>
        ))}

        {isAgentThinking && (
          <div className="flex justify-start" data-testid="status-thinking">
            <div className="bg-card border border-border rounded-lg px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                Interviewer
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
                <span
                  className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                  style={{ animationDelay: "200ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
                  style={{ animationDelay: "400ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response..."
            rows={1}
            disabled={isAgentThinking}
            className="resize-none min-h-[42px] max-h-[120px]"
            data-testid="input-message"
          />
          <Button
            size="icon"
            disabled={!input.trim() || isAgentThinking}
            onClick={handleSend}
            className="shrink-0 h-[42px] w-[42px]"
            data-testid="button-send"
          >
            {isAgentThinking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
