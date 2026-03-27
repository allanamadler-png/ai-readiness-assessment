import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, BookOpen, Target, Loader2, User, Hash, FileText } from "lucide-react";
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

  // Interview config
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");

  // Interviewee info
  const [intervieweeName, setIntervieweeName] = useState("");
  const [intervieweeEmail, setIntervieweeEmail] = useState("");
  const [intervieweeRole, setIntervieweeRole] = useState("");

  // Wave & limits
  const [wave, setWave] = useState("1");
  const [maxQuestions, setMaxQuestions] = useState(12);

  // Script
  const [customScript, setCustomScript] = useState("");
  const [showScript, setShowScript] = useState(false);

  // Knowledge base
  const [entries, setEntries] = useState<KnowledgeEntry[]>([
    { label: "", content: "" },
  ]);

  // Get existing waves for the selector
  const { data: existingWaves = [] } = useQuery<number[]>({
    queryKey: ["/api/waves"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/waves");
      return res.json();
    },
  });

  const waveOptions = Array.from(
    new Set([...existingWaves, 1, 2, 3])
  ).sort((a, b) => a - b);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sessions", {
        title: title.trim(),
        intervieweeName: intervieweeName.trim(),
        intervieweeEmail: intervieweeEmail.trim() || undefined,
        intervieweeRole: intervieweeRole.trim() || undefined,
        objective: objective.trim(),
        wave: Number(wave),
        maxQuestions,
        script: customScript.trim() || undefined,
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

  const addEntry = () => setEntries([...entries, { label: "", content: "" }]);
  const removeEntry = (index: number) => setEntries(entries.filter((_, i) => i !== index));
  const updateEntry = (index: number, field: "label" | "content", value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const isValid =
    title.trim().length > 0 &&
    intervieweeName.trim().length > 0 &&
    objective.trim().length > 0 &&
    entries.some((e) => e.label.trim() && e.content.trim());

  const estMinutes = Math.round(maxQuestions * 1.5);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-setup-heading">
          Configure Interview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define the objective, interviewee details, and knowledge base for the agent.
        </p>
      </div>

      {/* Interviewee Info Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <User className="h-3.5 w-3.5" />
          Interviewee
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-muted-foreground">Name *</Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              value={intervieweeName}
              onChange={(e) => setIntervieweeName(e.target.value)}
              data-testid="input-interviewee-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={intervieweeEmail}
              onChange={(e) => setIntervieweeEmail(e.target.value)}
              data-testid="input-interviewee-email"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role" className="text-xs text-muted-foreground">Role / Title</Label>
          <Input
            id="role"
            placeholder="Senior Engineer, Marketing Director, etc."
            value={intervieweeRole}
            onChange={(e) => setIntervieweeRole(e.target.value)}
            data-testid="input-interviewee-role"
          />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Interview Title *</Label>
        <Input
          id="title"
          placeholder="e.g. Organizational Culture Assessment — Wave 1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="input-title"
        />
      </div>

      {/* Objective */}
      <div className="space-y-2">
        <Label htmlFor="objective" className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Interview Objective *
        </Label>
        <Textarea
          id="objective"
          placeholder="What should the agent try to learn? e.g. 'Understand employee perspectives on organizational culture, identify pain points in communication and collaboration, surface opportunities for leadership development.'"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          data-testid="input-objective"
        />
        <p className="text-xs text-muted-foreground">
          The agent will craft all its questions to achieve this objective.
        </p>
      </div>

      {/* Wave & Question Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            Wave
          </Label>
          <Select value={wave} onValueChange={setWave}>
            <SelectTrigger data-testid="select-wave">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {waveOptions.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Wave {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Group interviews by wave to refine focus over time.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Max Questions: {maxQuestions}</Label>
          <div className="pt-2">
            <Slider
              value={[maxQuestions]}
              onValueChange={([v]) => setMaxQuestions(v)}
              min={3}
              max={30}
              step={1}
              data-testid="slider-max-questions"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ~{estMinutes} min estimated. Agent may finish sooner.
          </p>
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Knowledge Base *
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Add entries that inform the agent's questioning strategy. Background research,
          company context, technical specs — anything the agent should know but not reveal.
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
              placeholder="Label (e.g. 'Company Background', 'Strategic Priorities')"
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

      {/* Custom Script */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Interview Script
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowScript(!showScript)}
            className="text-xs"
            data-testid="button-toggle-script"
          >
            {showScript ? "Hide" : "Customize"}
          </Button>
        </div>
        {!showScript && (
          <p className="text-xs text-muted-foreground">
            A default invite script will be generated automatically. Click "Customize" to write your own.
          </p>
        )}
        {showScript && (
          <Textarea
            placeholder="Write a custom invitation script for the interviewee. Leave blank to auto-generate."
            value={customScript}
            onChange={(e) => setCustomScript(e.target.value)}
            rows={6}
            data-testid="input-custom-script"
          />
        )}
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
