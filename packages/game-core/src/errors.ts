export type GameRuleErrorCode =
  | "INVALID_ACTION"
  | "INSUFFICIENT_MANA"
  | "INVALID_TARGET"
  | "MAX_BOARD"
  | "MAX_COPIES"
  | "WRONG_TURN"
  | "TERMINAL_RUN"
  | "CARD_NOT_FOUND"
  | "REWARD_NOT_PENDING"
  | "ENCOUNTER_NOT_READY"
  | "DISCARD_NOT_PENDING";

export class GameRuleError extends Error {
  constructor(
    public readonly code: GameRuleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}
