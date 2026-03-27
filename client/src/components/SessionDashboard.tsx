import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  MessageSquare,
  FileText,
  ScrollText,
  Loader2,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

export function SessionDashboard() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeWave, setActiveWave] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch sessions
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions", search, statusFilter, activeWave],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (activeWave !== "all") params.set("wave", activeWave);
      const res = await apiRequest("GET", `/api/sessions?${params.toString()}`);
      return res.json();
    },
  });

  // Fetch available waves
  const { data: waves = [] } = useQuery<number[]>({
    queryKey: ["/api/waves"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/waves");
      return res.json();
    },
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Top bar: search + status filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, title, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-1.5">
            {["all", "active", "completed"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "secondary"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                data-testid={`button-status-${s}`}
                className="capitalize text-xs"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* Wave tabs */}
        {waves.length > 0 && (
          <div className="flex gap-1.5 items-center">
            <span className="text-xs font-medium text-muted-foreground mr-1.5">Wave:</span>
            <Button
              variant={activeWave === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveWave("all")}
              className="text-xs h-7 px-2.5"
              data-testid="button-wave-all"
            >
              All
            </Button>
            {waves.map((w) => (
              <Button
                key={w}
                variant={activeWave === String(w) ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveWave(String(w))}
                className="text-xs h-7 px-2.5"
                data-testid={`button-wave-${w}`}
              >
                Wave {w}
              </Button>
            ))}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1" data-testid="text-empty-heading">
              No interviews yet
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm">
              Create your first interview by clicking the "New Interview" button above.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm" data-testid="table-sessions">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">Title</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden sm:table-cell">Wave</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">Questions</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="py-2.5 px-3 w-[100px]"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      if (s.status === "completed") {
                        navigate(`/transcript/${s.id}`);
                      } else {
                        navigate(`/interview/${s.id}`);
                      }
                    }}
                    data-testid={`row-session-${s.id}`}
                  >
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[180px]">{s.intervieweeName}</p>
                        {s.intervieweeRole && (
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{s.intervieweeRole}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <p className="truncate max-w-[200px] text-muted-foreground">{s.title}</p>
                    </td>
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {s.wave}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={s.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 hidden lg:table-cell">
                      <span className="text-muted-foreground font-mono text-xs">
                        {s.questionCount}/{s.maxQuestions}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        {s.status === "completed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="View Transcript"
                              onClick={() => navigate(`/transcript/${s.id}`)}
                              data-testid={`button-transcript-${s.id}`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="View Script"
                              onClick={() => navigate(`/script/${s.id}`)}
                              data-testid={`button-script-${s.id}`}
                            >
                              <ScrollText className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {s.status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Continue Interview"
                            onClick={() => navigate(`/interview/${s.id}`)}
                            data-testid={`button-continue-${s.id}`}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary stats */}
        {sessions.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground pt-2">
            <span>{sessions.length} interview{sessions.length !== 1 ? "s" : ""}</span>
            <span>{sessions.filter((s) => s.status === "completed").length} completed</span>
            <span>{sessions.filter((s) => s.status === "active").length} active</span>
          </div>
        )}
      </div>
    </div>
  );
}
