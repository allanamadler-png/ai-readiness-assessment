import {
  type Session, type InsertSession,
  type Message, type InsertMessage,
  sessions, messages,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, sql, like, or, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

export interface IStorage {
  createSession(s: InsertSession): Session;
  getSession(id: number): Session | undefined;
  getAllSessions(): Session[];
  searchSessions(query: string): Session[];
  updateSessionStatus(id: number, status: string, reason?: string, completedAt?: string): void;
  incrementMessageCount(id: number): void;
  incrementQuestionCount(id: number): void;
  addMessage(m: InsertMessage): Message;
  getMessages(sessionId: number): Message[];
  getSessionsByWave(wave: number): Session[];
  getDistinctWaves(): number[];
}

export class DatabaseStorage implements IStorage {
  createSession(s: InsertSession): Session {
    return db.insert(sessions).values(s).returning().get();
  }
  getSession(id: number): Session | undefined {
    return db.select().from(sessions).where(eq(sessions.id, id)).get();
  }
  getAllSessions(): Session[] {
    return db.select().from(sessions).orderBy(desc(sessions.id)).all();
  }
  searchSessions(query: string): Session[] {
    const t = `%${query}%`;
    return db.select().from(sessions)
      .where(or(
        like(sessions.intervieweeName, t),
        like(sessions.title, t),
        like(sessions.objective, t),
        like(sessions.intervieweeEmail, t),
        like(sessions.intervieweeRole, t),
      ))
      .orderBy(desc(sessions.id)).all();
  }
  updateSessionStatus(id: number, status: string, reason?: string, completedAt?: string): void {
    const upd: any = { status };
    if (reason) upd.completionReason = reason;
    if (completedAt) upd.completedAt = completedAt;
    db.update(sessions).set(upd).where(eq(sessions.id, id)).run();
  }
  incrementMessageCount(id: number): void {
    db.update(sessions).set({ messageCount: sql`${sessions.messageCount} + 1` }).where(eq(sessions.id, id)).run();
  }
  incrementQuestionCount(id: number): void {
    db.update(sessions).set({ questionCount: sql`${sessions.questionCount} + 1` }).where(eq(sessions.id, id)).run();
  }
  addMessage(m: InsertMessage): Message {
    return db.insert(messages).values(m).returning().get();
  }
  getMessages(sessionId: number): Message[] {
    return db.select().from(messages).where(eq(messages.sessionId, sessionId)).all();
  }
  getSessionsByWave(wave: number): Session[] {
    return db.select().from(sessions).where(eq(sessions.wave, wave)).orderBy(desc(sessions.id)).all();
  }
  getDistinctWaves(): number[] {
    const rows = db.selectDistinct({ wave: sessions.wave }).from(sessions).orderBy(sessions.wave).all();
    return rows.map(r => r.wave);
  }
}

export const storage = new DatabaseStorage();
