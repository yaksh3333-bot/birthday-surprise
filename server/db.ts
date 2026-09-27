import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { BirthdayMedia, BirthdayPage, InsertUser, birthdayMedia, birthdayPages, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = new Date();
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getBirthdayPage(): Promise<BirthdayPage | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(birthdayPages).where(eq(birthdayPages.slug, "main")).limit(1);
  return result[0];
}

export async function ensureBirthdayPage(): Promise<BirthdayPage | undefined> {
  const current = await getBirthdayPage();
  if (current) return current;
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(birthdayPages).values({ slug: "main" });
  return getBirthdayPage();
}

export async function getBirthdayMedia(): Promise<BirthdayMedia[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(birthdayMedia).orderBy(asc(birthdayMedia.sortOrder), asc(birthdayMedia.id));
}

export async function updateBirthdayPage(values: Partial<Omit<BirthdayPage, "id" | "slug" | "updatedAt">>) {
  const page = await ensureBirthdayPage();
  const db = await getDb();
  if (!db || !page) return undefined;
  await db.update(birthdayPages).set(values).where(eq(birthdayPages.id, page.id));
  return getBirthdayPage();
}

export async function addBirthdayMedia(values: Omit<typeof birthdayMedia.$inferInsert, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(birthdayMedia).values(values);
  const inserted = await db.select().from(birthdayMedia).where(eq(birthdayMedia.id, Number(result[0].insertId))).limit(1);
  return inserted[0];
}

export async function clearBirthdayMedia() {
  const db = await getDb();
  if (!db) return;
  const page = await getBirthdayPage();
  if (page) await db.delete(birthdayMedia).where(eq(birthdayMedia.pageId, page.id));
}
