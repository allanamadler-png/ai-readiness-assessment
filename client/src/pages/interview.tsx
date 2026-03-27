import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { InterviewChat } from "@/components/InterviewChat";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function InterviewPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const { data: session, isLoading, error } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}`);
      return res.json();
    },
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-3">
        <p className="text-sm text-muted-foreground">Interview not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

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
        <div className="flex items-center gap-2.5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-label="AI Readiness logo"
          >
            <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <path d="M10 22 L16 10 L22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" fill="none" />
            <line x1="12" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground" />
          </svg>
          <h1 className="text-base font-semibold tracking-tight" data-testid="text-app-title">
            AI Readiness Assessment
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <InterviewChat session={session} />
      </main>

      <PerplexityAttribution />
    </div>
  );
}
