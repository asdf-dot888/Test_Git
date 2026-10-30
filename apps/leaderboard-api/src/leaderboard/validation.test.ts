import { describe, expect, it } from "vitest";
import { progressSubmissionSchema } from "./validation.js";

describe("progress submission validation", () => {
  it("accepts an integer count from 1 through 12 with a supported difficulty", () => {
    expect(progressSubmissionSchema.safeParse({ completedBattles: 1, difficulty: "normal" }).success).toBe(true);
    expect(progressSubmissionSchema.safeParse({ completedBattles: 12, difficulty: "hard" }).success).toBe(true);
  });

  it.each([
    null,
    {},
    { completedBattles: 0 },
    { completedBattles: 13 },
    { completedBattles: 1.5 },
    { completedBattles: "4" },
    { completedBattles: 4, difficulty: "normal", userId: "forged" },
    { completedBattles: 4, difficulty: "normal", displayName: "forged" },
    { completedBattles: 4 },
    { completedBattles: 4, difficulty: "nightmare" },
  ])("rejects invalid or identity-bearing input: %j", (body) => {
    expect(progressSubmissionSchema.safeParse(body).success).toBe(false);
  });
});
