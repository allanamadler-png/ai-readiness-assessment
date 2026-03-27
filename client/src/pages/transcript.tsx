import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session, Message } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Download, Loader2, FileText } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function TranscriptPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}`);
      return res.json();
    },
    enabled: !!sessionId,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["/api/sessions", sessionId, "messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}/messages`);
      return res.json();
    },
    enabled: !!sessionId,
  });

  const handleDownload = async () => {
    const res = await apiRequest("GET", `/api/sessions/${sessionId}/transcript?format=text`);
    const text = await res.text();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${session?.intervieweeName?.replace(/\s+/g, "-").toLowerCase() || "interview"}-wave${session?.wave || 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = sessionLoading || msgsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-3">
        <p className="text-sm text-muted-foreground">Interview not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Back to Dashboard</Button>
      </div>
    );
  }

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const cleanContent = (text: string) => text.replace(/\[INTERVIEW_COMPLETE\]/g, "").trim();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
          className="shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h1 className="text-base font-semibold tracking-tight truncate" data-testid="text-page-title">
            Transcript
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          data-testid="button-download-transcript"
          className="shrink-0"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Metadata */}
          <div className="space-y-1.5 pb-4 border-b border-border">
            <h2 className="text-lg font-semibold" data-testid="text-transcript-title">{session.title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Interviewee: <strong className="text-foreground">{session.intervieweeName}</strong></span>
              {session.intervieweeRole && <span>Role: {session.intervieweeRole}</span>}
              <span>Wave {session.wave}</span>
              <span>{formatDate(session.createdAt)}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant={session.status === "completed" ? "secondary" : "default"}>
                {session.status}
              </Badge>
              {session.completionReason && (
                <Badge variant="outline" className="text-xs">
                  {session.completionReason === "agent_decided"
                    ? "Agent decided"
                    : session.completionReason === "max_reached"
                    ? "Max questions reached"
                    : "Manually ended"}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono">
                {session.questionCount}/{session.maxQuestions} questions
              </Badge>
            </div>
          </div>

          {/* Objective */}
          <div className="text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
            <p className="text-foreground">{session.objective}</p>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversation</p>
            {messages.filter(m => m.role !== "system").map((msg) => (
              <div
                key={msg.id}
                className="flex gap-3"
                data-testid={`transcript-message-${msg.id}`}
              >
                <div className="shrink-0 pt-0.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${
                    msg.role === "agent"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "agent" ? "AI" : session.intervieweeName.charAt(0)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <p className="text-xs font-medium">
                      {msg.role === "agent" ? "Interviewer" : session.intervieweeName}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {cleanContent(msg.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PerplexityAttribution />
    </div>
  );
}
