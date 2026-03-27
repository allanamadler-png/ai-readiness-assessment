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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, X, BookOpen, Target, Loader2, User, Hash, FileText, ChevronDown, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Pre-loaded configuration for AI Readiness Assessment ──
const DEFAULT_TITLE = "AI Readiness Assessment — Partner Ecosystem Team";

const DEFAULT_OBJECTIVE = `Understand each team member's current relationship with AI — their comfort level, anxieties, daily usage, perceived barriers, and aspirations. Surface how they see AI changing their role and the consulting work they do. Identify where enthusiasm exists, where fear or resistance lives, and what support structures (training, incentives, psychological safety) they need to meaningfully engage with AI innovation. Explore their perspective on whether TiER1 is positioned competitively on AI adoption relative to peer firms, and what they believe needs to change at the team and organizational level.`;

const DEFAULT_KNOWLEDGE_ENTRIES = [
  {
    label: "Interview Context — Why This Matters",
    content: `This is Wave 1 of an AI readiness assessment for the Partner Ecosystem team at TiER1 Performance. The goal is to get an honest baseline of how team members feel about AI — not to evaluate them, but to understand the human landscape before building a strategy. Findings will inform Wave 2 (deeper dive into specific opportunities) and shape the team's AI innovation roadmap. The interviewer should create psychological safety so people speak openly about fears and frustrations, not just enthusiasm.`,
  },
  {
    label: "Known Dynamics from Leadership Interview",
    content: `A senior leader on the team describes a mix of enthusiasm and fear across the group. Some team members are eager and fully committed to AI. Others have anxiety around the speed of change, quality concerns, and worry that AI makes work feel generic. There is a pattern of random acts of AI — individuals experimenting without coordination or shared strategy. The incentive system does not currently reward, encourage, or require innovation — this was called a dangerous blind spot. There is tension between being customer-driven (waiting for clients to ask) vs. market-driven (proactively showing what is possible). TiER1 is perceived as generations behind firms like McKinsey on AI adoption. Billable hours vs. IP building tension remains unresolved.`,
  },
  {
    label: "Key Themes to Explore",
    content: `1. PERSONAL AI RELATIONSHIP: How do they use AI today? What tools? For what tasks? How often? What has surprised them?
2. COMFORT AND ANXIETY: What excites them? What worries them? Do they fear AI replacing parts of their role? Do they feel pressure to adopt faster than they are comfortable with?
3. QUALITY AND IDENTITY: Do they worry AI output feels generic or undermines the craft of consulting? How do they maintain quality and personal voice when using AI?
4. TEAM DYNAMICS: Do they see coordination or fragmentation in how the team approaches AI? Are people sharing learnings? Is there a sense of collective momentum or isolated experiments?
5. INCENTIVES AND SUPPORT: What would make it easier to innovate? Do they feel the organization rewards experimentation? What training or resources would help?
6. COMPETITIVE POSITION: How do they think TiER1 compares to competitors on AI? Does that concern them?
7. VISION: If they could wave a magic wand, what would AI-enabled consulting look like for their team in 12 months?
8. BILLABLE VS. BUILDING: How do they navigate the tension between client delivery hours and time to experiment, learn, and build new capabilities?`,
  },
  {
    label: "Interview Approach Guidance",
    content: `Start with something personal and low-stakes — their own experience with AI tools. Build rapport before asking about fears or organizational critique. Use the knowledge base themes as a map, but follow the interviewee's energy — if they light up about something, go deeper. If they seem guarded on a topic, note it and come back gently later. The most valuable insights will come from specific stories and examples, not abstract opinions. Push for concreteness: When you say you are worried about quality, can you give me an example? When you say the team is not coordinated, what does that look like day to day? End with a forward-looking question that gives them agency — what would you change if you could?`,
  },
];

const DEFAULT_SCRIPT_TEMPLATE = (name: string, maxQ: number) => {
  const est = Math.round(maxQ * 1.5);
  return `Hi ${name},

You've been invited to participate in a brief interview as part of an AI Readiness Assessment for the Partner Ecosystem team.

WHAT THIS IS
We're gathering perspectives from across the team to understand how people are thinking about AI — what's working, what's challenging, and what support would be most helpful. This isn't an evaluation. There are no right or wrong answers. We genuinely want to hear your honest perspective.

WHAT TO EXPECT
• A conversational interview with an AI interviewer (text-based)
• About ${est} minutes, roughly ${maxQ} questions
• Your responses will be captured in a transcript for the assessment

HOW IT WORKS
1. Click the interview link when you're ready
2. The interviewer will introduce itself and begin asking questions
3. Type your responses naturally — take your time with each answer
4. The interview wraps up automatically when complete

TIPS FOR A GREAT CONVERSATION
• Find a quiet 20 minutes with minimal distractions
• Be specific — examples and real stories are more valuable than general impressions
• If a question doesn't make sense, just say so and the interviewer will rephrase
• Speak freely — candid feedback is what makes this useful

Your perspective matters to this process. Thank you for your time.`;
};

interface KnowledgeEntry {
  label: string;
  content: string;
}

interface Props {
  onSessionCreated: (session: Session) => void;
}

export function SetupPanel({ onSessionCreated }: Props) {
  const { toast } = useToast();

  // Interviewee info — the main thing the admin fills in
  const [intervieweeName, setIntervieweeName] = useState("");
  const [intervieweeEmail, setIntervieweeEmail] = useState("");
  const [intervieweeRole, setIntervieweeRole] = useState("");

  // Pre-filled config (expandable for edits)
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [wave, setWave] = useState("1");
  const [maxQuestions, setMaxQuestions] = useState(12);
  const [entries, setEntries] = useState<KnowledgeEntry[]>(
    DEFAULT_KNOWLEDGE_ENTRIES.map((e) => ({ ...e }))
  );
  const [customScript, setCustomScript] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get existing waves
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
      const name = intervieweeName.trim();
      const script = customScript.trim() || DEFAULT_SCRIPT_TEMPLATE(name, maxQuestions);
      const res = await apiRequest("POST", "/api/sessions", {
        title: title.trim(),
        intervieweeName: name,
        intervieweeEmail: intervieweeEmail.trim() || undefined,
        intervieweeRole: intervieweeRole.trim() || undefined,
        objective: objective.trim(),
        wave: Number(wave),
        maxQuestions,
        script,
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

  const isValid = intervieweeName.trim().length > 0;
  const estMinutes = Math.round(maxQuestions * 1.5);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-setup-heading">
          New Interview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the team member's information below. The interview is pre-configured
          for the AI Readiness Assessment.
        </p>
      </div>

      {/* ── Interviewee Info (primary section) ── */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <User className="h-3.5 w-3.5" />
          Who is being interviewed?
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-muted-foreground">
              Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g. Paolo Reyes"
              value={intervieweeName}
              onChange={(e) => setIntervieweeName(e.target.value)}
              data-testid="input-interviewee-name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="paolo@tier1performance.com"
              value={intervieweeEmail}
              onChange={(e) => setIntervieweeEmail(e.target.value)}
              data-testid="input-interviewee-email"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role" className="text-xs text-muted-foreground">
            Role / Title
          </Label>
          <Input
            id="role"
            placeholder="e.g. Senior Consultant, Partner Manager"
            value={intervieweeRole}
            onChange={(e) => setIntervieweeRole(e.target.value)}
            data-testid="input-interviewee-role"
          />
        </div>
      </div>

      {/* ── Wave & Question Limits ── */}
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
            ~{estMinutes} min. Agent may finish sooner.
          </p>
        </div>
      </div>

      {/* ── Pre-configured summary ── */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
        <p className="font-medium text-foreground">Pre-configured for AI Readiness Assessment</p>
        <p className="text-xs text-muted-foreground">
          Objective, knowledge base, and invitation script are pre-loaded from the leadership
          interview findings. Expand "Advanced Settings" below to review or customize.
        </p>
      </div>

      {/* ── Advanced Settings (collapsed by default) ── */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between text-sm text-muted-foreground"
            data-testid="button-toggle-advanced"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Advanced Settings
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-5 pt-3">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Interview Title</Label>
            <Input
              id="title"
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
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={4}
              data-testid="input-objective"
            />
          </div>

          {/* Knowledge Base */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Knowledge Base ({entries.length} entries)
            </Label>

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
                  placeholder="Label"
                  value={entry.label}
                  onChange={(e) => updateEntry(i, "label", e.target.value)}
                  data-testid={`input-entry-label-${i}`}
                />
                <Textarea
                  placeholder="Content..."
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
            <Label className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Custom Invitation Script
            </Label>
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-generate a personalized script for each interviewee.
            </p>
            <Textarea
              placeholder="Write a custom script, or leave blank for the default..."
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              rows={6}
              data-testid="input-custom-script"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Submit ── */}
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
          "Create & Start Interview"
        )}
      </Button>
    </div>
  );
}
