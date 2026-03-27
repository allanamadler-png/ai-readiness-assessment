import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Download, Copy, ScrollText, Loader2, CheckCircle2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";

export default function ScriptPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const [copied, setCopied] = useState(false);

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}`);
      return res.json();
    },
    enabled: !!sessionId,
  });

  const handleCopy = async () => {
    if (!session?.script) return;
    try {
      await navigator.clipboard.writeText(session.script);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for sandboxed environments
      const textarea = document.createElement("textarea");
      textarea.value = session.script;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    const res = await apiRequest("GET", `/api/sessions/${sessionId}/script?format=text`);
    const text = await res.text();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invite-${session?.intervieweeName?.replace(/\s+/g, "-").toLowerCase() || "interview"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <ScrollText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h1 className="text-base font-semibold tracking-tight truncate" data-testid="text-page-title">
            Interview Script
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-testid="button-copy-script"
          >
            {copied ? (
              <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Copied</>
            ) : (
              <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            data-testid="button-download-script"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {/* Metadata */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold" data-testid="text-script-title">{session.title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>For: <strong className="text-foreground">{session.intervieweeName}</strong></span>
              {session.intervieweeEmail && <span>{session.intervieweeEmail}</span>}
              {session.intervieweeRole && <span>{session.intervieweeRole}</span>}
              <span>Wave {session.wave}</span>
            </div>
          </div>

          {/* Script content */}
          <Card className="p-5" data-testid="card-script-content">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Invitation Script
            </p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
              {session.script || "No script available."}
            </div>
          </Card>

          {/* Usage hints */}
          <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm">How to use this script</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Copy and paste it into an email or message to the interviewee</li>
              <li>Include the interview link (share the deployed URL with their session ID)</li>
              <li>Customize the script as needed before sending</li>
              <li>The estimated time and question count are already included</li>
            </ul>
          </div>
        </div>
      </main>

      <PerplexityAttribution />
    </div>
  );
}
