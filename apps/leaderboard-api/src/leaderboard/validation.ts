import { z } from "zod";

export const progressSubmissionSchema = z.object({
  completedBattles: z.number().int().min(1).max(12),
}).strict();

export type ProgressSubmission = z.infer<typeof progressSubmissionSchema>;

export function errorResponse(code: string, message: string, status: number) {
  return {
    status,
    jsonBody: { error: { code, message } },
    headers: { "content-type": "application/json; charset=utf-8" },
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    jsonBody: body,
    headers: { "content-type": "application/json; charset=utf-8" },
  };
}
