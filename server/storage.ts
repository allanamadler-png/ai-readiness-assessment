import {
  type Session,
  type InsertSession,
  type Message,
  type InsertMessage,
  sessions,
  messages,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  createSession(session: InsertSession): Session;
  getSession(id: number): Session | undefined;
  getSessionsByVisitor(visitorId: string): Session[];
  updateSessionStatus(id: number, status: string): void;
  addMessage(message: InsertMessage): Message;
  getMessages(sessionId: number): Message[];
}

export class DatabaseStorage implements IStorage {
  createSession(session: InsertSession): Session {
    return db.insert(sessions).values(session).returning().get();
  }

  getSession(id: number): Session | undefined {
    return db.select().from(sessions).where(eq(sessions.id, id)).get();
  }

  getSessionsByVisitor(visitorId: string): Session[] {
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.visitorId, visitorId))
      .all();
  }

  updateSessionStatus(id: number, status: string): void {
    db.update(sessions).set({ status }).where(eq(sessions.id, id)).run();
  }

  addMessage(message: InsertMessage): Message {
    return db.insert(messages).values(message).returning().get();
  }

  getMessages(sessionId: number): Message[] {
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .all();
  }
}

export const storage = new DatabaseStorage();
