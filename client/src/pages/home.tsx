import { useState } from "react";
import { SetupPanel } from "@/components/SetupPanel";
import { SessionDashboard } from "@/components/SessionDashboard";
import type { Session } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const [showSetup, setShowSetup] = useState(false);

  const handleSessionCreated = (session: Session) => {
    navigate(`/interview/${session.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        {showSetup && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSetup(false)}
            data-testid="button-back"
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2.5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-label="Interview Agent logo"
          >
            <rect
              x="2"
              y="2"
              width="28"
              height="28"
              rx="6"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            <circle cx="12" cy="13" r="2" fill="currentColor" className="text-foreground" />
            <circle cx="20" cy="13" r="2" fill="currentColor" className="text-foreground" />
            <path
              d="M10 20 C10 22 13 25 16 25 C19 25 22 22 22 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-foreground"
              fill="none"
            />
          </svg>
          <h1 className="text-base font-semibold tracking-tight" data-testid="text-app-title">
            Interview Agent
          </h1>
        </div>
        {!showSetup && (
          <Button
            variant="default"
            size="sm"
            className="ml-auto"
            onClick={() => setShowSetup(true)}
            data-testid="button-new-session"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Interview
          </Button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {showSetup ? (
          <SetupPanel onSessionCreated={handleSessionCreated} />
        ) : (
          <SessionDashboard />
        )}
      </main>

      <PerplexityAttribution />
    </div>
  );
}
