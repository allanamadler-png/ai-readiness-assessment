import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Interview sessions
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull(),
  title: text("title").notNull(),
  // Interviewee info
  intervieweeName: text("interviewee_name").notNull(),
  intervieweeEmail: text("interviewee_email"),
  intervieweeRole: text("interviewee_role"),
  // Interview config
  objective: text("objective").notNull(),
  knowledgeBase: text("knowledge_base").notNull(), // JSON: array of { label, content }
  systemPrompt: text("system_prompt").notNull(),
  // Wave & limits
  wave: integer("wave").notNull().default(1),
  maxQuestions: integer("max_questions").notNull().default(12),
  questionCount: integer("question_count").notNull().default(0), // agent questions only
  // Script / intro text shown to interviewee
  script: text("script"),
  // Status
  status: text("status").notNull().default("active"), // active | completed
  completionReason: text("completion_reason"), // "agent_decided" | "max_reached" | "user_ended"
  messageCount: integer("message_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Messages
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  role: text("role").notNull(), // "agent" | "user" | "system"
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// API request schemas
export const createSessionRequestSchema = z.object({
  title: z.string().min(1),
  intervieweeName: z.string().min(1),
  intervieweeEmail: z.string().optional(),
  intervieweeRole: z.string().optional(),
  objective: z.string().min(1),
  wave: z.number().int().min(1).default(1),
  maxQuestions: z.number().int().min(3).max(30).default(12),
  script: z.string().optional(),
  knowledgeEntries: z.array(z.object({ label: z.string(), content: z.string() })),
});
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export const sendMessageRequestSchema = z.object({
  content: z.string().min(1),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
