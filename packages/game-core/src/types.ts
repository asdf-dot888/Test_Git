export type CardKind = "minion" | "spell";
export type RewardTier = "normal" | "boss";
export type PlayerSide = "player" | "enemy";
export type PlayerClass = "warrior" | "assassin" | "demonist";

export type SpellEffect =
  | { kind: "damage"; amount: number; target: "enemyHero" | "enemyMinion" }
  | { kind: "heal"; amount: number; target: "playerHero" | "playerMinion" }
  | { kind: "summon"; cardId: string; count: number }
  | { kind: "buff"; attack: number; health: number; target: "playerMinion" }
  | { kind: "draw"; count: number }
  | { kind: "gainMana"; amount: number }
  | { kind: "discardRandom" }
  | { kind: "gainTemporaryMana"; amount: number }
  | { kind: "randomDamage"; min: 0; max: 5 }
  | { kind: "cleave"; amount: number; target: "enemyMinion" }
  | { kind: "stealFromOpponentDeck"; count: 1 };

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
  playerOnly?: boolean;
  tokenOnly?: boolean;
  classId?: PlayerClass;
  race?: "demon";
  minion?: { attack: number; maxHealth: number; effect?: MinionEffect };
  spellEffects?: SpellEffect[];
}

export interface PlayerClassDefinition {
  id: PlayerClass;
  name: string;
  archetype: string;
  heroPowerName: string;
  heroPowerDescription: string;
  starterCardIds: readonly string[];
}

export interface FusionRecipe {
  id: string;
  classId: PlayerClass;
  sourceCardIds: readonly [string, string];
  resultCardId: string;
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
  playerMana: { current: number; max: number; temporary: number };
  enemyMana: { current: number; max: number; temporary: number };
  playerArmor: number;
  soulShards: number;
  heroPowerUsed: boolean;
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  enemyStarterDeck: CardInstance[];
  enemyHand: CardInstance[];
  enemyDrawPile: CardInstance[];
  enemyDiscardPile: CardInstance[];
  playerBoard: MinionState[];
  enemyBoard: MinionState[];
  enemyId: string;
  rngState: number;
  status: "active" | "playerWon" | "playerLost";
  pendingDiscardBeforeDraw?: boolean;
  pendingEnemyCharge?: EnemyChargeState | null;
  enemyTurnEvents?: EnemyCombatRecord[];
}

export interface EnemyChargeState {
  turnsRemaining: number;
  damage: number;
  target: "hero" | "board-and-hero";
}

export type EnemyCombatRecord =
  | { type: "play-minion"; cardId: string; instanceId: string; handSlot: number; summonedIds: string[] }
  | { type: "cast-spell"; cardId: string; instanceId: string; handSlot: number; effects: Array<{ kind: SpellEffect["kind"]; targetId: string | null; amount?: number; transferredCardInstanceId?: string }> }
  | { type: "attack"; cardId: string; attackerId: string; targetId: string }
  | { type: "boss-area"; damage: 1; targetMinionIds: string[]; targetHeroId: "player" };

export interface EnemyTurnPlaybackStep {
  action: EnemyCombatRecord;
  beforeRun: RunState;
  presentationRun: RunState;
}

export interface EnemyTurnResolution {
  run: RunState;
  steps: EnemyTurnPlaybackStep[];
}

export interface EncounterState {
  phase: 1 | 2 | 3;
  kind: "normal" | "boss";
  enemyId: string;
  status: "pending" | "active" | "complete";
}

export interface TurnTimerState {
  battleId: string;
  turnNumber: number;
  deadlineAt: number | null;
  pausedRemainingMs: number | null;
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
  playerClass?: PlayerClass;
  deck: CardInstance[];
  starterDeck: CardInstance[];
  battle: BattleState | null;
  pendingReward: RewardState | null;
  pendingVictoryAcknowledgement?: boolean;
  encounters: EncounterState[];
  turnTimer?: TurnTimerState;
}

export type EnemyBehaviorProfile =
  | "aggressor" | "summoner" | "hunter" | "controller"
  | "drain" | "board-clear" | "ravager";

export interface EnemyTactics {
  profile: EnemyBehaviorProfile;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  kind: "normal" | "boss";
  maxHealth: number;
  artKey: string;
  tactics: EnemyTactics;
}
