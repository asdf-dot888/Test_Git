# Task: T03 적 보드 UI와 전투 연출

## Status: done

## Goal

플레이어가 적의 손패·마나 상황과 카드 행동을 읽을 수 있게 하고, 적 하수인 공격과 보스 광역기에도 카드 기반 연출을 제공한다.

## Decision Summary

- 적 카드 앞면은 감추고 카드 뒷면과 손패 수를 표시한다. 적의 마나와 덱·버림 수는 플레이어와 같은 보드 정보로 보여준다.
- 적 카드 플레이·주문·하수인 공격은 기존 카드 비행 연출을 재사용한다. 보스 광역 때 전장을 흔들며 동작 감소 설정을 존중한다.

## Implementation

### I01. 적 손패·마나 HUD

- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoard` — 상대 영역에 손패, 덱·버림 수, 마나 표시; modify
  - `apps/web/src/components/EnemyHand.tsx` :: `EnemyHand` — 비공개 카드 뒷면 목록; new
  - `apps/web/src/components/EnemyHand.test.tsx` :: 적 손패 정보 노출 검증; new
  - `apps/web/src/components/ManaDisplay.tsx` :: `ManaDisplay` — 기존 마나 오브 렌더 재사용; read-only
  - `apps/web/src/styles/board.css` :: `.enemy-hand`, `.enemy-resource-bar`, responsive rules — 상대 상태 레이아웃; modify
  - `apps/web/src/components/GameBoard.test.tsx` :: 상대 상태 통합 렌더 검증; modify

#### Details

- **Signatures & Types**:
  ```typescript
  interface EnemyHandProps {
    count: number;
    maxVisible?: number;
  }
  export function EnemyHand({ count, maxVisible = 10 }: EnemyHandProps): ReactElement;
  ```
- Render one facedown card back per enemy hand card up to `maxVisible`, plus an accessible count such as `적 손패 4장`. Never render enemy card IDs, names, cost, or art faces.
- Place a compact enemy resource row within `.battle-opponent` containing hand backs, `enemyDrawPile.length`, `enemyDiscardPile.length`, and `ManaDisplay(current={enemyMana.current}, max={enemyMana.max})`.
- Ensure the opponent hero portrait and minion lane stay visible; at <=760px and <=390px the hand backs may compress/scroll horizontally but must not cover the hero or board.

### I02. AI 행동 및 광역 연출

- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatAnchor`, `CombatEffectKind`, `CombatEffectEvent`, `collectCombatEffectEvents` — AI turn records to visual events; modify
  - `apps/web/src/game/gameActions.ts` :: `sessionForAction` — consume `enemyTurnEvents` and remove transient records before sync; modify
  - `apps/web/src/components/CombatEffectLayer.tsx` :: `anchorName`, `anchorPoint`, `EffectSprite`, `CombatEffectLayer` — enemy hand/card sources and area impact; modify
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: opponent card and boss area visuals; modify
  - `apps/web/src/game/combatEffects.test.ts` :: event mapping scenarios; modify
  - `apps/web/src/styles/board.css` :: `.battle-board`, `@keyframes boss-board-shake`, reduced-motion rule — screen shake; modify
  - `apps/web/src/App.tsx` :: `GameBoard` props/effect visibility — pass action events and freeze timer through effect duration; modify

#### Details

- Add `side: PlayerSide` to hand anchors: `{ kind: "hand"; side: PlayerSide; slot: number; instanceId?: string }`. Keep hero/minion anchors unchanged. Resolve enemy hand anchor to the visible opponent card-back row, falling back to opponent hero center when its hand is empty.
- `collectCombatEffectEvents` maps each `EnemyCombatRecord` in order. Enemy card play uses its hand slot as source and new minion slot/effect target as destination; enemy spell events use card art and exact target; attacks use enemy minion source and player minion/hero target. Map the boss event to an area impact with `damage` cue.
- In `sessionForAction`, read event records before clearing them, append resulting `CombatEffectEvent[]`, then delete `enemyTurnEvents` from the published run so the UI animation log does not persist to the API.
- Trigger a board shake for the boss area impact with a 500 ms `@keyframes boss-board-shake`. Apply the class only while that visual event is active. Under `prefers-reduced-motion: reduce`, disable the shake and finish the area event using the existing short reduced-motion completion path.
- Keep effect event ordering; the shared effect layer completion callbacks must remove all events so `session.combatEffects` returns to empty and the paused player timer resumes.

#### Test Cases

- Enemy cards render as backs only and count matches `enemyHand.length`; enemy mana and pile counts match `BattleState`.
- A logged enemy minion/spell/attack produces correct source and target anchors and correct card art; no hidden enemy card face leaks into DOM.
- Boss area event adds the shake class, removes it after completion, and reduced-motion mode skips the shake without leaving the timer paused.

## Acceptance Criteria

- [ ] Opponent hand, mana, draw pile, and discard pile remain readable at desktop and narrow responsive widths.
- [ ] Enemy card plays and attacks use the same paced card-art animations as player actions.
- [ ] Boss area damage causes a visible shake, reduced-motion users avoid shake, and all effects eventually clear.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/components/EnemyHand.test.tsx src/components/GameBoard.test.tsx src/game/combatEffects.test.ts src/components/CombatEffectLayer.test.tsx` — HUD, anchors, effects, and reduced-motion cases pass.
- `npm.cmd run build --workspace @board-game/web` — React props and CSS integration compile/build.

## Commit Message

```text
feat(ui): show and animate enemy card combat

Plan: 2026-10-22-enemy-card-ai-victory-flow
Phase: P01-enemy-combat-and-victory-ui
Task: T03-enemy-board-and-combat-effects

- Show enemy hand backs and resource counts
- Animate enemy cards and attacks
- Shake the board for boss area patterns
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending

