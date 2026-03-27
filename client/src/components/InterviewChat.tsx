import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Session, Message } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Square,
  CheckCircle2,
  FileText,
  ScrollText,
} from "lucide-react";
import { useLocation } from "wouter";

function formatMessage(text: string): string {
  return text
    .replace(/\[INTERVIEW_COMPLETE\]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .trim();
}

interface Props {
  session: Session;
}

export function InterviewChat({ session: initialSession }: Props) {
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialSession.status === "completed");

  // Re-fetch session to get live question count
  const { data: session } = useQuery<Session>({
    queryKey: ["/api/sessions", initialSession.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${initialSession.id}`);
      return res.json();
    },
    initialData: initialSession,
  });

  const currentSession = session || initialSession;

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/sessions", currentSession.id, "messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${currentSession.id}/messages`);
      return res.json();
    },
    refetchInterval: false,
  });

  // Start interview
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${currentSession.id}/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSession.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSession.id] });
    },
  });

  // Send user message
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/sessions/${currentSession.id}/messages`, { content });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSession.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSession.id] });
      setInput("");
      if (data.completed) {
        setIsCompleted(true);
      }
    },
  });

  // End interview manually
  const endMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${currentSession.id}/end`);
      return res.json();
    },
    onSuccess: () => {
      setIsCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSession.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  // Auto-start interview on mount
  useEffect(() => {
    if (!hasStarted && messages.length === 0 && !isLoading && !isCompleted) {
      setHasStarted(true);
      startMutation.mutate();
    }
  }, [messages, isLoading, hasStarted, isCompleted]);

  // Detect completion from session status
  useEffect(() => {
    if (currentSession.status === "completed") {
      setIsCompleted(true);
    }
  }, [currentSession.status]);

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
  const progressPct = currentSession.maxQuestions > 0
    ? Math.min(100, (currentSession.questionCount / currentSession.maxQuestions) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Session info bar */}
      <div className="border-b border-border px-4 py-2.5 bg-card/50 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-session-title">
              {currentSession.title}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentSession.intervieweeName}
              {currentSession.intervieweeRole && ` · ${currentSession.intervieweeRole}`}
              {" · Wave "}{currentSession.wave}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCompleted ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Badge>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => endMutation.mutate()}
                disabled={endMutation.isPending}
                data-testid="button-end-interview"
                className="text-xs"
              >
                <Square className="h-3 w-3 mr-1" />
                End Interview
              </Button>
            )}
          </div>
        </div>
        {/* Question progress bar */}
        <div className="mt-2 flex items-center gap-2">
          <Progress value={progressPct} className="flex-1 h-1.5" data-testid="progress-questions" />
          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
            {currentSession.questionCount}/{currentSession.maxQuestions}
          </span>
        </div>
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
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
              <p
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
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
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "400ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Completion banner */}
        {isCompleted && messages.length > 0 && (
          <div className="flex justify-center py-4" data-testid="status-completed">
            <div className="bg-muted/50 border border-border rounded-lg px-5 py-4 text-center max-w-sm">
              <CheckCircle2 className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Interview Complete</p>
              <p className="text-xs text-muted-foreground mb-3">
                {currentSession.completionReason === "agent_decided"
                  ? "The interviewer gathered sufficient information."
                  : currentSession.completionReason === "max_reached"
                  ? "The question limit was reached."
                  : "The interview was ended manually."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/transcript/${currentSession.id}`)}
                  className="text-xs"
                  data-testid="button-view-transcript"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Transcript
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/script/${currentSession.id}`)}
                  className="text-xs"
                  data-testid="button-view-script"
                >
                  <ScrollText className="h-3.5 w-3.5 mr-1" />
                  Script
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {!isCompleted && (
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
      )}
    </div>
  );
}
