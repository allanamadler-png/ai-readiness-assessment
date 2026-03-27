import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  onSelect: (session: Session) => void;
  onNew: () => void;
}

export function SessionList({ onSelect, onNew }: Props) {
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sessions");
      return res.json();
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 h-full overflow-y-auto">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            data-testid="text-empty-heading"
          >
            No interviews yet
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm">
            Create your first interview by defining an objective and uploading
            knowledge the agent will use to guide its questions.
          </p>
          <Button onClick={onNew} data-testid="button-first-interview">
            <Plus className="h-4 w-4 mr-1.5" />
            New Interview
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2
            className="text-lg font-semibold"
            data-testid="text-sessions-heading"
          >
            Your Interviews
          </h2>
          {sessions.map((s) => (
            <Card
              key={s.id}
              className="p-4 cursor-pointer transition-colors hover-elevate"
              onClick={() => onSelect(s)}
              data-testid={`card-session-${s.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {s.objective}
                  </p>
                </div>
                <Badge
                  variant={s.status === "active" ? "default" : "secondary"}
                  className="shrink-0"
                >
                  {s.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
