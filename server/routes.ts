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
  knowledgeEntries: { label: string; content: string }[],
  intervieweeName: string,
  maxQuestions: number
): string {
  const knowledgeSection = knowledgeEntries
    .map((e) => `### ${e.label}\n${e.content}`)
    .join("\n\n");

  return `You are a skilled interviewer. Your single objective is:

<objective>
${objective}
</objective>

The person you are interviewing is named ${intervieweeName}.

You have a HARD LIMIT of ${maxQuestions} questions for this interview. Budget your questions wisely to cover the most important aspects of the objective. You must track how many questions you have asked.

You have access to the following knowledge base that informs your questioning strategy. Do NOT reveal this knowledge to the interviewee.

<knowledge_base>
${knowledgeSection}
</knowledge_base>

## Interview Guidelines

1. **Start warm.** Greet ${intervieweeName} briefly. Explain what you'll discuss. This greeting + first question counts as question 1.

2. **One question at a time.** Never stack multiple questions.

3. **Listen and adapt.** Follow interesting threads before returning to your plan.

4. **Probe for depth.** When answers are vague, ask for specifics: examples, numbers, timelines, decisions.

5. **Use knowledge strategically.** Craft questions that guide the interviewee toward topics from the knowledge base without revealing it.

6. **Budget questions.** You have ${maxQuestions} total. If you're running low, prioritize the most critical uncovered areas.

7. **Keep it concise.** Brief acknowledgment + next question. No long paragraphs.

8. **Be professional but human.** Conversational tone. Use their name occasionally.

## Completion Rules

When you believe you have gathered SUFFICIENT information to fulfill the objective — OR when you are approaching your question limit — you MUST end the interview by:
1. Providing a brief summary of key findings and themes
2. Thanking ${intervieweeName}
3. Including the exact tag [INTERVIEW_COMPLETE] at the very end of your message

The [INTERVIEW_COMPLETE] tag signals the system to close the session. Only include it when you are truly done.

If you still need more information but are nearing the limit, prioritize the most critical gaps and wrap up gracefully.`;
}

function generateDefaultScript(
  title: string,
  objective: string,
  intervieweeName: string,
  maxQuestions: number
): string {
  const estMinutes = Math.round(maxQuestions * 1.5);
  return `Hi ${intervieweeName},

You've been selected to participate in an interview as part of our "${title}" initiative.

WHAT TO EXPECT
- This is a conversational interview conducted by an AI interviewer
- It will take approximately ${estMinutes} minutes (around ${maxQuestions} questions)
- There are no right or wrong answers — we're interested in your genuine perspective and experience

TOPIC AREA
${objective}

HOW IT WORKS
1. Click the interview link when you're ready
2. The interviewer will greet you and begin asking questions
3. Type your responses naturally — take your time
4. The interview will wrap up automatically when complete

TIPS
- Find a quiet moment with minimal distractions
- Be as specific as you can — examples and stories are very helpful
- If a question isn't clear, just say so and the interviewer will rephrase

Your input is valuable to this process. Thank you for your time.`;
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

      const { title, objective, knowledgeEntries, intervieweeName, intervieweeEmail, intervieweeRole, wave, maxQuestions, script } = parsed.data;
      const visitorId = req.headers["x-visitor-id"] as string || "local";
      const mq = maxQuestions ?? 12;
      const systemPrompt = buildSystemPrompt(objective, knowledgeEntries, intervieweeName, mq);
      const finalScript = script?.trim() || generateDefaultScript(title, objective, intervieweeName, mq);

      const session = storage.createSession({
        visitorId,
        title,
        intervieweeName,
        intervieweeEmail: intervieweeEmail || null,
        intervieweeRole: intervieweeRole || null,
        objective,
        knowledgeBase: JSON.stringify(knowledgeEntries),
        systemPrompt,
        wave: wave ?? 1,
        maxQuestions: mq,
        questionCount: 0,
        script: finalScript,
        status: "active",
        completionReason: null,
        messageCount: 0,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });

      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get session
  app.get("/api/sessions/:id", (req, res) => {
    const s = storage.getSession(Number(req.params.id));
    if (!s) { res.status(404).json({ error: "Not found" }); return; }
    res.json(s);
  });

  // List all sessions with optional search/filter
  app.get("/api/sessions", (req, res) => {
    const search = req.query.search as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const waveFilter = req.query.wave as string | undefined;

    let list = (search?.trim()) ? storage.searchSessions(search.trim()) : storage.getAllSessions();
    if (statusFilter && statusFilter !== "all") list = list.filter(s => s.status === statusFilter);
    if (waveFilter && waveFilter !== "all") list = list.filter(s => s.wave === Number(waveFilter));
    res.json(list);
  });

  // Get distinct waves
  app.get("/api/waves", (_req, res) => {
    res.json(storage.getDistinctWaves());
  });

  // Messages for a session
  app.get("/api/sessions/:id/messages", (req, res) => {
    const s = storage.getSession(Number(req.params.id));
    if (!s) { res.status(404).json({ error: "Not found" }); return; }
    res.json(storage.getMessages(s.id));
  });

  // Transcript
  app.get("/api/sessions/:id/transcript", (req, res) => {
    const s = storage.getSession(Number(req.params.id));
    if (!s) { res.status(404).json({ error: "Not found" }); return; }
    const msgs = storage.getMessages(s.id);

    const lines = [
      `INTERVIEW TRANSCRIPT`,
      `====================`,
      ``,
      `Title:        ${s.title}`,
      `Interviewee:  ${s.intervieweeName}`,
      s.intervieweeRole ? `Role:         ${s.intervieweeRole}` : null,
      s.intervieweeEmail ? `Email:        ${s.intervieweeEmail}` : null,
      `Wave:         ${s.wave}`,
      `Objective:    ${s.objective}`,
      `Date:         ${new Date(s.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      `Status:       ${s.status}${s.completionReason ? ` (${s.completionReason})` : ""}`,
      `Questions:    ${s.questionCount} / ${s.maxQuestions}`,
      ``,
      `---`,
      ``,
    ].filter(Boolean).join("\n");

    const body = msgs.map(m => {
      const speaker = m.role === "agent" ? "INTERVIEWER" : s.intervieweeName.toUpperCase();
      const time = new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return `[${time}] ${speaker}:\n${m.content.replace(/\[INTERVIEW_COMPLETE\]/g, "").trim()}\n`;
    }).join("\n");

    const transcript = lines + body;

    if (req.query.format === "text") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="transcript-${s.intervieweeName.replace(/\s+/g, "-").toLowerCase()}-wave${s.wave}.txt"`);
      res.send(transcript);
    } else {
      res.json({ transcript, session: s, messages: msgs });
    }
  });

  // Script for a session
  app.get("/api/sessions/:id/script", (req, res) => {
    const s = storage.getSession(Number(req.params.id));
    if (!s) { res.status(404).json({ error: "Not found" }); return; }
    if (req.query.format === "text") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="invite-${s.intervieweeName.replace(/\s+/g, "-").toLowerCase()}.txt"`);
      res.send(s.script || "");
    } else {
      res.json({ script: s.script, session: s });
    }
  });

  // Start interview
  app.post("/api/sessions/:id/start", async (req, res) => {
    try {
      const s = storage.getSession(Number(req.params.id));
      if (!s) { res.status(404).json({ error: "Not found" }); return; }

      const existing = storage.getMessages(s.id);
      if (existing.length > 0) { res.json(existing[0]); return; }

      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 512,
        system: s.systemPrompt,
        messages: [{ role: "user", content: "Begin the interview now. Introduce yourself and ask your first question. Remember: this is question 1 of " + s.maxQuestions + "." }],
      });

      const agentText = response.content[0].type === "text" ? response.content[0].text : "";
      const msg = storage.addMessage({ sessionId: s.id, role: "agent", content: agentText, createdAt: new Date().toISOString() });
      storage.incrementMessageCount(s.id);
      storage.incrementQuestionCount(s.id);

      // Check if agent decided to complete on first message (unlikely but handle it)
      if (agentText.includes("[INTERVIEW_COMPLETE]")) {
        storage.updateSessionStatus(s.id, "completed", "agent_decided", new Date().toISOString());
      }

      res.json(msg);
    } catch (err: any) {
      console.error("Start error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Send message and get agent response
  app.post("/api/sessions/:id/messages", async (req, res) => {
    try {
      const s = storage.getSession(Number(req.params.id));
      if (!s) { res.status(404).json({ error: "Not found" }); return; }

      if (s.status === "completed") {
        res.status(400).json({ error: "Interview is already completed" });
        return;
      }

      const parsed = sendMessageRequestSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

      // Save user message
      const userMsg = storage.addMessage({ sessionId: s.id, role: "user", content: parsed.data.content, createdAt: new Date().toISOString() });
      storage.incrementMessageCount(s.id);

      // Refresh session to get current question count
      const freshSession = storage.getSession(s.id)!;
      const remaining = freshSession.maxQuestions - freshSession.questionCount;

      // Build conversation history
      const allMessages = storage.getMessages(s.id);
      const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [
        { role: "user", content: `Begin the interview now. Introduce yourself and ask your first question. Remember: this is question 1 of ${s.maxQuestions}.` },
      ];
      for (const m of allMessages) {
        anthropicMessages.push({ role: m.role === "agent" ? "assistant" : "user", content: m.content });
      }

      // Inject a hint about remaining questions
      let suffix = "";
      if (remaining <= 2) {
        suffix = `\n\n[SYSTEM NOTE: You have ${remaining} question(s) remaining. You MUST wrap up the interview now. Summarize key findings and include [INTERVIEW_COMPLETE] at the end of your response.]`;
      } else if (remaining <= 4) {
        suffix = `\n\n[SYSTEM NOTE: You have ${remaining} questions remaining. Start wrapping up — focus only on the most critical gaps.]`;
      }

      if (suffix) {
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg.role === "user") {
          lastMsg.content += suffix;
        }
      }

      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 700,
        system: freshSession.systemPrompt,
        messages: anthropicMessages,
      });

      const agentText = response.content[0].type === "text" ? response.content[0].text : "";
      const agentMsg = storage.addMessage({ sessionId: s.id, role: "agent", content: agentText, createdAt: new Date().toISOString() });
      storage.incrementMessageCount(s.id);
      storage.incrementQuestionCount(s.id);

      // Check completion
      const isAgentDone = agentText.includes("[INTERVIEW_COMPLETE]");
      const updated = storage.getSession(s.id)!;
      const hitMax = updated.questionCount >= updated.maxQuestions;

      if (isAgentDone) {
        storage.updateSessionStatus(s.id, "completed", "agent_decided", new Date().toISOString());
      } else if (hitMax) {
        storage.updateSessionStatus(s.id, "completed", "max_reached", new Date().toISOString());
      }

      res.json({
        userMessage: userMsg,
        agentMessage: agentMsg,
        completed: isAgentDone || hitMax,
        completionReason: isAgentDone ? "agent_decided" : hitMax ? "max_reached" : null,
      });
    } catch (err: any) {
      console.error("Message error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // End session manually
  app.post("/api/sessions/:id/end", (req, res) => {
    const s = storage.getSession(Number(req.params.id));
    if (!s) { res.status(404).json({ error: "Not found" }); return; }
    storage.updateSessionStatus(s.id, "completed", "user_ended", new Date().toISOString());
    res.json({ success: true });
  });

  return httpServer;
}
