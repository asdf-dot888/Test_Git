# Task: T03 Cooldown on the Hero Power Button and in the Texts

## Status: pending

## Goal
While the hero power rests, its button is disabled and shows the remaining rest turns as a number over the illustration; the popover says how many turns are left. Touch drag of the assassin power is refused while recharging. Every text that describes the hero power mentions the cooldown.

## Decision Summary
- D01 UI: the button shows the remaining cooldown turns while locked.

## Implementation

### I01. Hero power button
- Related Files:
  - `apps/web/src/components/HeroPowerControl.tsx` :: `HeroPowerControl`, `HeroPowerControlProps` — modify
  - `apps/web/src/components/GameBoard.tsx` :: `<HeroPowerControl ...>` props (~line 168) — modify
  - `apps/web/src/styles/board.css` (or `apps/web/src/styles/theme.css`, the file that is loaded last) :: new `.hero-power-cooldown` — modify

#### Details
- **Signatures & Types**:
  ```typescript
  interface HeroPowerControlProps {
    // ...existing props
    /** Player turns the power still rests; 0 = no cooldown. */
    cooldown: number;
  }
  ```
- GameBoard passes `cooldown={battle.heroPowerCooldown}`.
- `ready` adds `&& cooldown === 0`.
- `status` text: first branch stays `used ? "이번 턴 사용 완료"`; add a branch right after it: `cooldown > 0 ? \`재사용까지 ${cooldown}턴\``. On the turn of use both are true; show `"사용 완료 · 2턴 쉰 뒤 다시 사용"` there instead, i.e. `used ? (cooldown > 0 ? \`사용 완료 · ${cooldown}턴 쉰 뒤 다시 사용\` : "이번 턴 사용 완료")`.
- Inside the button, when `cooldown > 0 && !used`, render `<span className="hero-power-cooldown" aria-hidden="true">{cooldown}</span>` (a dark veil over the illustration with the number centred). Extend the button `aria-label` with `, 재사용까지 ${cooldown}턴` when `cooldown > 0`.
- Popover cost badges: add a third line under the costs: `<small className="hero-power-cooldown-note">사용 후 {gameConstants.heroPowerCooldownTurns}턴 동안 쉽니다</small>`.
- CSS: `.hero-power-cooldown { position: absolute; inset: 1px; z-index: 2; display: grid; place-items: center; border-radius: 50%; background: rgb(8 6 10 / 72%); color: #e8ddc9; font: 400 20px/1 var(--display, serif); pointer-events: none; }` and `.hero-power-cooldown-note { display: block; margin-top: 4px; color: var(--muted); font-size: 10px; }`.

### I02. Drop rules
- Related Files:
  - `apps/web/src/game/dropRules.ts` :: `resolveHeroPowerDrop` (~line 91) — modify
  - `apps/web/src/game/dropRules.test.ts` — modify (next to the `heroPowerUsed = true` case, ~line 156)

#### Details
- Guard becomes `if (run.playerClass !== "assassin" || battle.heroPowerUsed || battle.heroPowerCooldown > 0 || battle.playerMana.current < HERO_POWER_MANA_COST) return null;`
- Test: with `heroPowerCooldown = 1` a drop on an enemy minion returns `null`.

### I03. Texts
- Related Files:
  - `apps/web/src/components/GameGuideModal.tsx` — modify (the rules section where taunt is explained, ~line 45)
  - `README.md` — modify (rules list ~line 48-49)
  - `docs/game-architecture.html` — modify (the rules card list ~line 240)

#### Details
- Add one sentence in each: "영웅 능력은 마나 2를 쓰고, 한 번 쓰면 내 턴 2번을 쉰 뒤 다시 쓸 수 있습니다. (악마술사는 영혼 조각 2개도 씁니다.)" Keep the surrounding style.
- Do not touch `catalog.ts` hero power descriptions (they describe the effect only).

### I04. Tests
- Related Files:
  - `apps/web/src/components/HeroPowerControl.test.tsx` — modify
- Cases: `cooldown={2}` → button disabled, shows "2", popover status "재사용까지 2턴"; `used` and `cooldown={2}` → status "사용 완료 · 2턴 쉰 뒤 다시 사용"; `cooldown={0}` with enough mana → ready as before.
- Update every existing `<HeroPowerControl>` render in tests with `cooldown={0}` if TypeScript requires it (or give the prop a default of 0 — preferred: `cooldown = 0` in the destructuring, so old call sites stay valid).

## Acceptance Criteria
- [ ] Locked button shows the remaining rest turns and cannot be clicked or dragged.
- [ ] Popover and accessible label state the cooldown.
- [ ] Guide, README and architecture page describe the cooldown.

## Validation
- `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"; npm test` — all pass.
- `npm run lint`, `npx tsc -p apps/web --noEmit` — clean.

## Commit Message
```text
feat(web): show the hero power cooldown on its button

Plan: 2026-11-25-hero-power-cooldown-and-tutorial
Phase: P01-hero-power-cooldown
Task: T03-web-cooldown-display

- The hero power button shows the remaining rest turns and stays disabled while recharging.
- Assassin drag is refused during the cooldown.
- Guide, README and architecture page explain the cooldown.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
