import { useReducer } from "react";
import { initialGameSession, reduceGameAction, type GameAction, type GameSession } from "./gameActions.js";

function secureSeed(): number {
  const seed = new Uint32Array(1);
  globalThis.crypto.getRandomValues(seed);
  return seed[0] ?? 1;
}

type InternalAction = GameAction | { type: "resolution-start" };

export function useGameSession(): { session: GameSession; dispatch(action: GameAction): void; startNewRun(seed?: number): void } {
  const [session, reducerDispatch] = useReducer(reduceGameAction, initialGameSession);

  const dispatch = (action: GameAction) => {
    if (session.resolving && action.type !== "clear-error") return;
    if (action.type === "end-turn") {
      reducerDispatch({ type: "resolution-start" } satisfies InternalAction);
      globalThis.setTimeout(() => reducerDispatch(action), 80);
      return;
    }
    if (action.type === "continue-run") {
      reducerDispatch({ ...action, nextSeed: action.nextSeed ?? secureSeed() });
      return;
    }
    reducerDispatch(action);
  };

  const startNewRun = (seed = secureSeed()) => dispatch({ type: "start-run", seed });
  return { session, dispatch, startNewRun };
}
