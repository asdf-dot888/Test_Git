export type CardKind = "minion" | "spell";
export type RewardTier = "normal" | "boss";
export type PlayerSide = "player" | "enemy";

export type SpellEffect =
  | { kind: "damage"; amount: number; target: "enemyHero" | "enemyMinion" }
  | { kind: "heal"; amount: number; target: "playerHero" | "playerMinion" }
  | { kind: "summon"; cardId: string; count: number }
  | { kind: "buff"; attack: number; health: number; target: "playerMinion" }
  | { kind: "draw"; count: number };

export type MinionEffect =
  | { kind: "battlecrySummon"; cardId: string; count: number }
  | { kind: "battlecryBuff"; attack: number; health: number; target: "self" | "otherFriendly" }
  | { kind: "deathSummon"; cardId: string; count: number };

export interface CardDefinition {
  id: string;
  name: string;
  kind: CardKind;
  cost: number;
  description: string;
  artKey: string;
  rewardTier: RewardTier;
  minion?: { attack: number; maxHealth: number; effect?: MinionEffect };
  spellEffects?: SpellEffect[];
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface HeroState {
  id: "player" | "enemy";
  health: number;
  maxHealth: number;
}

export interface MinionState {
  instanceId: string;
  cardId: string;
  owner: PlayerSide;
  attack: number;
  health: number;
  maxHealth: number;
  summonedTurn: number;
  hasAttacked: boolean;
}

export interface BattleState {
  battleId: string;
  turnNumber: number;
  activeSide: PlayerSide;
  playerHero: HeroState;
  enemyHero: HeroState;
  playerMana: { current: number; max: number };
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  playerBoard: MinionState[];
  enemyBoard: MinionState[];
  enemyId: string;
  rngState: number;
  status: "active" | "playerWon" | "playerLost";
  pendingDiscardBeforeDraw?: boolean;
  pendingEnemyCharge?: EnemyChargeState | null;
}

export interface EncounterState {
  phase: 1 | 2 | 3;
  kind: "normal" | "boss";
  enemyId: string;
  status: "pending" | "active" | "complete";
}

export interface RewardState {
  tier: RewardTier;
  choices: string[];
  encounterIndex: number;
}

export interface RunState {
  runId: string;
  seed: number;
  nextInstanceNumber: number;
  phase: 1 | 2 | 3;
  encounterInPhase: 0 | 1 | 2 | 3;
  completedBattles: number;
  status: "active" | "victory" | "defeat";
  deck: CardInstance[];
  starterDeck: CardInstance[];
  battle: BattleState | null;
  pendingReward: RewardState | null;
  encounters: EncounterState[];
}

export type EnemyAction =
  | { kind: "heroDamage"; amount: number }
  | { kind: "summon"; cardId: string }
  | { kind: "bossEffect"; effectId: string; amount: number };

export type EnemyBehaviorProfile =
  | "aggressor" | "summoner" | "hunter" | "controller"
  | "drain" | "board-clear" | "ravager";

export type EnemyChargeTrigger =
  | "hero-at-half" | "board-empty" | "board-wide" | "hero-low-and-board-empty" | "turn-four";

export interface EnemyTactics {
  profile: EnemyBehaviorProfile;
  chargeTrigger: EnemyChargeTrigger;
  chargeDelayTurns: 1 | 2;
  chargeDamage: number;
}

export interface EnemyChargeState {
  turnsRemaining: number;
  damage: number;
  target: "hero" | "board-and-hero";
}

export interface EnemyDefinition {
  id: string;
  name: string;
  kind: "normal" | "boss";
  maxHealth: number;
  actions: EnemyAction[];
  artKey: string;
  tactics: EnemyTactics;
}
