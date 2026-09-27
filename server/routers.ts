import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addBirthdayMedia, clearBirthdayMedia, ensureBirthdayPage, getBirthdayMedia, getBirthdayPage, updateBirthdayPage } from "./db";

const DEFAULT_WELCOME = "Today is all about you, your laughter, and the wonderful memories we share.";
const DEFAULT_LETTER = "Happy Birthday! Thank you for filling our lives with warmth, laughter, guidance, and unconditional love. You make ordinary days feel special, and we are so lucky to have you. May this new year bring you endless joy, beautiful adventures, good health, and every dream your heart holds.";

function requireOwner(ctx: { user: { role: string; openId: string } | null }) {
  if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.openId !== ENV.ownerOpenId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the page owner can make changes." });
  }
}

const dataUrlSchema = z.string().regex(/^data:[^;]+;base64,/, "Please choose a valid file.").max(20_000_000);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  birthday: router({
    get: publicProcedure.query(async () => {
      const [page, media] = await Promise.all([getBirthdayPage(), getBirthdayMedia()]);
      return {
        page: page ?? null,
        media,
        defaults: { welcomeMessage: DEFAULT_WELCOME, letterMessage: DEFAULT_LETTER },
      };
    }),
    ownerGet: protectedProcedure.query(async ({ ctx }) => {
      requireOwner(ctx);
      const [page, media] = await Promise.all([ensureBirthdayPage(), getBirthdayMedia()]);
      return { page, media };
    }),
    update: protectedProcedure.input(z.object({
      recipientName: z.string().trim().min(1).max(160),
      welcomeMessage: z.string().trim().min(1).max(2000),
      letterMessage: z.string().trim().min(1).max(10000),
      signoff: z.string().trim().min(1).max(160),
      heroImageUrl: z.string().max(1000).optional(),
      videoUrl: z.string().max(1000).optional(),
      musicUrl: z.string().max(1000).optional(),
    })).mutation(async ({ ctx, input }) => {
      requireOwner(ctx);
      const page = await updateBirthdayPage(input);
      return { page };
    }),
    clearMedia: protectedProcedure.mutation(async ({ ctx }) => {
      requireOwner(ctx);
      await clearBirthdayMedia();
      return { success: true } as const;
    }),
    upload: protectedProcedure.input(z.object({
      dataUrl: dataUrlSchema,
      caption: z.string().trim().max(255).optional(),
      sortOrder: z.number().int().min(0).max(100).default(0),
      kind: z.enum(["gallery", "hero", "video", "music"]),
    })).mutation(async ({ ctx, input }) => {
      requireOwner(ctx);
      const match = input.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "The file could not be read." });
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      if (!buffer.length) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected file is empty." });
      const extension = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin";
      const key = `birthday-pages/main/${input.kind}-${Date.now()}-${nanoid(8)}.${extension}`;
      const { url } = await storagePut(key, buffer, mimeType);
      if (input.kind !== "gallery") return { url };
      const page = await ensureBirthdayPage();
      if (!page) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The page is not ready yet." });
      const media = await addBirthdayMedia({ pageId: page.id, url, caption: input.caption || "A favorite memory", sortOrder: input.sortOrder });
      return { url, media };
    }),
  }),
});

export type AppRouter = typeof appRouter;
