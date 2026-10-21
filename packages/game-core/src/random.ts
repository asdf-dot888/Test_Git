export interface RandomResult {
  value: number;
  state: number;
}

export interface ShuffleResult<T> {
  items: T[];
  state: number;
}

export function normalizeSeed(seed: number): number {
  const normalized = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function nextRandom(state: number): RandomResult {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = (value ^ (value >>> 14)) >>> 0;
  return { value: value / 0x100000000, state: nextState };
}

export function shuffle<T>(items: readonly T[], initialState: number): ShuffleResult<T> {
  const shuffled = [...items];
  let state = normalizeSeed(initialState);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = nextRandom(state);
    state = random.state;
    const swapIndex = Math.floor(random.value * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return { items: shuffled, state };
}

export function pickIndex(length: number, state: number): RandomResult {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError("length must be a positive integer");
  }

  const random = nextRandom(state);
  return { value: Math.floor(random.value * length), state: random.state };
}
