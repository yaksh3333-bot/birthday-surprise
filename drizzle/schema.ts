import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const birthdayPages = mysqlTable("birthday_pages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  recipientName: varchar("recipientName", { length: 160 }).notNull().default("Big Sis"),
  welcomeMessage: text("welcomeMessage"),
  letterMessage: text("letterMessage"),
  signoff: varchar("signoff", { length: 160 }).notNull().default("Your family"),
  heroImageUrl: text("heroImageUrl"),
  videoUrl: text("videoUrl"),
  musicUrl: text("musicUrl"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const birthdayMedia = mysqlTable("birthday_media", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull(),
  url: text("url").notNull(),
  caption: varchar("caption", { length: 255 }).notNull().default("A favorite memory"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BirthdayPage = typeof birthdayPages.$inferSelect;
export type BirthdayMedia = typeof birthdayMedia.$inferSelect;
