import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Interview sessions: each has an objective + knowledge base
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull(),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  knowledgeBase: text("knowledge_base").notNull(), // JSON text: array of knowledge entries
  systemPrompt: text("system_prompt").notNull(), // computed from objective + knowledge
  status: text("status").notNull().default("active"), // active | completed
  createdAt: text("created_at").notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Messages in a session
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  role: text("role").notNull(), // "agent" | "user"
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// API request schemas
export const createSessionRequestSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  knowledgeEntries: z.array(
    z.object({
      label: z.string(),
      content: z.string(),
    })
  ),
});
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export const sendMessageRequestSchema = z.object({
  content: z.string().min(1),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
