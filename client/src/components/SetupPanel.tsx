import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, X, BookOpen, Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeEntry {
  label: string;
  content: string;
}

interface Props {
  onSessionCreated: (session: Session) => void;
}

export function SetupPanel({ onSessionCreated }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([
    { label: "", content: "" },
  ]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sessions", {
        title: title.trim(),
        objective: objective.trim(),
        knowledgeEntries: entries.filter(
          (e) => e.label.trim() && e.content.trim()
        ),
      });
      return (await res.json()) as Session;
    },
    onSuccess: (session) => {
      onSessionCreated(session);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create session",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addEntry = () => {
    setEntries([...entries, { label: "", content: "" }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: "label" | "content",
    value: string
  ) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const isValid =
    title.trim().length > 0 &&
    objective.trim().length > 0 &&
    entries.some((e) => e.label.trim() && e.content.trim());

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-setup-heading">
          Configure Interview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define the objective the agent should pursue and the knowledge it
          uses to guide its questions.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Interview Title</Label>
        <Input
          id="title"
          placeholder="e.g. Candidate Assessment — Senior Engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="input-title"
        />
      </div>

      {/* Objective */}
      <div className="space-y-2">
        <Label htmlFor="objective" className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Interview Objective
        </Label>
        <Textarea
          id="objective"
          placeholder="What should the agent try to learn? e.g. 'Assess the candidate's system design experience, probe for depth on distributed systems, evaluate leadership and communication skills.'"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          data-testid="input-objective"
        />
        <p className="text-xs text-muted-foreground">
          The agent will craft all its questions to achieve this objective.
        </p>
      </div>

      {/* Knowledge Base */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Knowledge Base
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Add entries that inform the agent's questioning strategy. This could
          be background research, candidate resumes, company info, technical
          specs — anything the agent should know but not reveal directly.
        </p>

        {entries.map((entry, i) => (
          <Card
            key={i}
            className="p-4 space-y-3 relative"
            data-testid={`card-knowledge-entry-${i}`}
          >
            {entries.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => removeEntry(i)}
                data-testid={`button-remove-entry-${i}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Input
              placeholder="Label (e.g. 'Candidate Resume', 'Technical Requirements')"
              value={entry.label}
              onChange={(e) => updateEntry(i, "label", e.target.value)}
              data-testid={`input-entry-label-${i}`}
            />
            <Textarea
              placeholder="Paste the content here..."
              value={entry.content}
              onChange={(e) => updateEntry(i, "content", e.target.value)}
              rows={4}
              data-testid={`input-entry-content-${i}`}
            />
          </Card>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addEntry}
          data-testid="button-add-entry"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Knowledge Entry
        </Button>
      </div>

      {/* Submit */}
      <Button
        className="w-full"
        disabled={!isValid || createMutation.isPending}
        onClick={() => createMutation.mutate()}
        data-testid="button-start-interview"
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          "Start Interview"
        )}
      </Button>
    </div>
  );
}
