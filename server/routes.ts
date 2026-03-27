import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  createSessionRequestSchema,
  sendMessageRequestSchema,
} from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function buildSystemPrompt(
  objective: string,
  knowledgeEntries: { label: string; content: string }[]
): string {
  const knowledgeSection = knowledgeEntries
    .map((e) => `### ${e.label}\n${e.content}`)
    .join("\n\n");

  return `You are a skilled interviewer. Your single objective is:

<objective>
${objective}
</objective>

You have access to the following knowledge base that informs your questioning strategy. Use this information to craft intelligent, targeted questions. Do NOT reveal the raw knowledge to the interviewee — use it to inform what you ask and how you probe deeper.

<knowledge_base>
${knowledgeSection}
</knowledge_base>

## Interview Guidelines

1. **Start warm.** Open with a brief, friendly greeting that contextualizes the interview. Explain what you'll be discussing (derived from the objective) without revealing your internal knowledge.

2. **Ask one question at a time.** Never stack multiple questions. Wait for the interviewee's response before moving on.

3. **Listen and adapt.** Base your follow-up questions on what the interviewee actually says. If they reveal something interesting, follow that thread before returning to your plan.

4. **Probe for depth.** When answers are vague, ask for specifics: examples, numbers, timelines, decisions, trade-offs.

5. **Use your knowledge strategically.** If you know something from the knowledge base that the interviewee hasn't mentioned, craft questions that naturally guide them toward that topic without leading them.

6. **Track coverage.** Mentally track which aspects of your objective you've covered and which remain. Steer the conversation to ensure completeness.

7. **Summarize and close.** When you've gathered sufficient information, provide a brief summary of key takeaways and thank the interviewee.

8. **Keep responses concise.** Your messages should be focused — a brief acknowledgment of what was said, plus the next question. Do not write long paragraphs.

9. **Be professional but human.** Use a conversational tone. Show genuine interest in the responses.`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create a new interview session
  app.post("/api/sessions", (req, res) => {
    try {
      const parsed = createSessionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      const { title, objective, knowledgeEntries } = parsed.data;
      const visitorId = req.headers["x-visitor-id"] as string || "local";
      const systemPrompt = buildSystemPrompt(objective, knowledgeEntries);

      const session = storage.createSession({
        visitorId,
        title,
        objective,
        knowledgeBase: JSON.stringify(knowledgeEntries),
        systemPrompt,
        status: "active",
        createdAt: new Date().toISOString(),
      });

      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get a session
  app.get("/api/sessions/:id", (req, res) => {
    const session = storage.getSession(Number(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  });

  // List sessions for visitor
  app.get("/api/sessions", (req, res) => {
    const visitorId = req.headers["x-visitor-id"] as string || "local";
    const list = storage.getSessionsByVisitor(visitorId);
    res.json(list);
  });

  // Get messages for a session
  app.get("/api/sessions/:id/messages", (req, res) => {
    const session = storage.getSession(Number(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const msgs = storage.getMessages(session.id);
    res.json(msgs);
  });

  // Start interview — agent sends first message
  app.post("/api/sessions/:id/start", async (req, res) => {
    try {
      const session = storage.getSession(Number(req.params.id));
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      // Check if already started
      const existing = storage.getMessages(session.id);
      if (existing.length > 0) {
        res.json(existing[0]);
        return;
      }

      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 512,
        system: session.systemPrompt,
        messages: [
          {
            role: "user",
            content:
              "Begin the interview now. Introduce yourself and ask your first question.",
          },
        ],
      });

      const agentText =
        response.content[0].type === "text" ? response.content[0].text : "";

      const msg = storage.addMessage({
        sessionId: session.id,
        role: "agent",
        content: agentText,
        createdAt: new Date().toISOString(),
      });

      res.json(msg);
    } catch (err: any) {
      console.error("Start error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Send a message and get agent response
  app.post("/api/sessions/:id/messages", async (req, res) => {
    try {
      const session = storage.getSession(Number(req.params.id));
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      const parsed = sendMessageRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      // Save user message
      const userMsg = storage.addMessage({
        sessionId: session.id,
        role: "user",
        content: parsed.data.content,
        createdAt: new Date().toISOString(),
      });

      // Build conversation history for LLM
      const allMessages = storage.getMessages(session.id);

      // Convert to Anthropic format: the conversation started with a hidden "begin" user message
      const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [
        {
          role: "user",
          content:
            "Begin the interview now. Introduce yourself and ask your first question.",
        },
      ];

      for (const m of allMessages) {
        anthropicMessages.push({
          role: m.role === "agent" ? "assistant" : "user",
          content: m.content,
        });
      }

      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 512,
        system: session.systemPrompt,
        messages: anthropicMessages,
      });

      const agentText =
        response.content[0].type === "text" ? response.content[0].text : "";

      const agentMsg = storage.addMessage({
        sessionId: session.id,
        role: "agent",
        content: agentText,
        createdAt: new Date().toISOString(),
      });

      res.json({ userMessage: userMsg, agentMessage: agentMsg });
    } catch (err: any) {
      console.error("Message error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // End session
  app.post("/api/sessions/:id/end", (req, res) => {
    const session = storage.getSession(Number(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    storage.updateSessionStatus(session.id, "completed");
    res.json({ success: true });
  });

  return httpServer;
}
