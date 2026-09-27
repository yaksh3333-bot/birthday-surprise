import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("birthday sharing", () => {
  it("returns safe defaults even before the owner has customized the page", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.birthday.get();

    expect(result.defaults.welcomeMessage).toContain("wonderful memories");
    expect(result.defaults.letterMessage).toContain("Happy Birthday");
    expect(Array.isArray(result.media)).toBe(true);
  });

  it("does not allow a normal signed-in visitor to edit the page", async () => {
    const user: AuthenticatedUser = {
      id: 2,
      openId: "visitor-account",
      email: "visitor@example.com",
      name: "Visitor",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(createContext(user));

    await expect(caller.birthday.update({
      recipientName: "Someone",
      welcomeMessage: "Hello",
      letterMessage: "Happy birthday",
      signoff: "A friend",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
