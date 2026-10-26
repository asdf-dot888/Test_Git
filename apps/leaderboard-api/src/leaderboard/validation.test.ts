import { describe, expect, it } from "vitest";
import { progressSubmissionSchema } from "./validation.js";

describe("progress submission validation", () => {
  it("accepts only an integer completed battle count from 1 through 12", () => {
    expect(progressSubmissionSchema.safeParse({ completedBattles: 1 }).success).toBe(true);
    expect(progressSubmissionSchema.safeParse({ completedBattles: 12 }).success).toBe(true);
  });

  it.each([
    null,
    {},
    { completedBattles: 0 },
    { completedBattles: 13 },
    { completedBattles: 1.5 },
    { completedBattles: "4" },
    { completedBattles: 4, userId: "forged" },
    { completedBattles: 4, displayName: "forged" },
  ])("rejects invalid or identity-bearing input: %j", (body) => {
    expect(progressSubmissionSchema.safeParse(body).success).toBe(false);
  });
});
