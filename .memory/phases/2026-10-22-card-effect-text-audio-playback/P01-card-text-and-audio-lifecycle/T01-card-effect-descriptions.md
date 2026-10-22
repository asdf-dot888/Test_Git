# Task: T01 카드별 효과 설명

## Status: done

## Goal
게임 화면에서 모든 하수인과 주문 카드의 설명을 실제 카탈로그 효과에 맞게 보여, 플레이어가 카드를 내기 전에 대상과 수치, 발동 시점을 알 수 있게 한다.

## Decision Summary
- 카드 효과의 원본은 `CardDefinition.minion.effect`와 `CardDefinition.spellEffects`로 유지하고, `description`은 그 데이터를 바탕으로 만든다.
- 특수 효과 없는 하수인은 `특수 효과 없음`을 표시한다. 전투 수치는 이미 카드에 따로 표시되므로 중복하지 않는다.
- 게임 효과, 수치, 발동 시점은 바꾸지 않는다. 기존 수렁 마녀의 구체 문구 수정도 전체 구현으로 통합한다.

## Implementation

### I01. 카탈로그 효과 설명 생성
- Related Files:
  - `packages/game-core/src/catalog.ts` :: `minion`, `spell`, `CARD_CATALOG` — 카드 설명을 효과 데이터에서 생성; modify
  - `packages/game-core/src/types.ts` :: `MinionEffect`, `SpellEffect`, `CardDefinition` — 효과 union 타입 확인; read-only
  - `apps/web/src/components/CardView.tsx` :: `CardView` — `card.description` 표시 확인; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  function describeMinionEffect(effect: MinionEffect | undefined): string;
  function describeSpellEffects(effects: readonly SpellEffect[]): string;
  function describeStatChanges(attack: number, health: number): string;
  function summonedCardName(cardId: string): string;
  ```
- **Data & Schema Fields**:
  - 기존 `CardDefinition` 필드만 사용한다: `description: string`, `minion.effect?: MinionEffect`, `spellEffects?: SpellEffect[]`.
  - 현재 소환 대상 이름 매핑은 `{ "bone-rat": "뼈 쥐", "cinder-imp": "불씨 임프" }`다. 알 수 없는 소환 카드 ID는 원시 ID를 조용히 출력하지 말고 누락된 표시 이름을 명시적으로 오류 처리한다.
- **Execution Flow / Logic**:
  1. `describeMinionEffect(undefined)`은 `특수 효과 없음`을 반환한다.
  2. `battlecrySummon`은 `전투의 함성: {카드명} {count}마리를 소환합니다.`로 표시한다.
  3. `battlecryBuff`는 `전투의 함성:` 접두어를 붙이고 대상은 `self`면 `자신`, `otherFriendly`면 `다른 아군 하수인`으로 쓴다. 공격력/체력 증가량 0은 생략하고 양수인 값만 `공격력 +N`, `체력 +N`으로 쓴다.
  4. `deathSummon`은 `죽음의 메아리: {카드명} {count}마리를 소환합니다.`로 표시한다.
  5. 주문 효과는 카탈로그 순서대로 아래 문장을 만든 뒤 ` / `로 결합한다. `damage/enemyHero`는 `적 영웅에게 N의 피해를 줍니다.`, `damage/enemyMinion`은 `적 하수인에게 N의 피해를 줍니다.`, `heal/playerHero`는 `내 영웅의 체력을 N 회복합니다.`, `heal/playerMinion`은 `아군 하수인의 체력을 N 회복합니다.`, `summon`은 `{카드명} N마리를 소환합니다.`, `buff`는 `아군 하수인에게 공격력 +N 및 체력 +N을 부여합니다.`(0인 능력치는 생략), `draw`는 `카드를 N장 뽑습니다.`로 표시한다.
  6. `minion`은 일반 효과 설명 대신 `describeMinionEffect(effect)`를 `description`에 넣는다. `spell`은 기존 일반 문구 대신 `describeSpellEffects(spellEffects)`를 넣는다. `CardView`가 이미 `card.description`을 렌더하므로 UI 구조는 바꾸지 않는다.
- **현재 카탈로그에서 기대되는 문구 예시**:
  | 카드 | 설명 |
  | :--- | :--- |
  | `ash-wolf`, `crypt-guard`, `bone-rat`, `iron-hound`, `shade-stalker`, `dusk-raven`, `moon-stag`, `hollow-giant`, `storm-crow`, `ancient-treant`, `dread-colossus` | `특수 효과 없음` |
  | `cinder-imp`, `mire-witch` | `전투의 함성: 뼈 쥐 1마리를 소환합니다.` |
  | `grave-knight` | `전투의 함성: 다른 아군 하수인에게 공격력 +1 및 체력 +1을 부여합니다.` |
  | `ember-priest` | `전투의 함성: 자신에게 체력 +2를 부여합니다.` |
  | `thorn-brute` | `죽음의 메아리: 뼈 쥐 1마리를 소환합니다.` |
  | `plague-bearer` | `죽음의 메아리: 불씨 임프 1마리를 소환합니다.` |
  | `rune-smith` | `전투의 함성: 자신에게 공격력 +1을 부여합니다.` |
  | `blood-oracle` | `전투의 함성: 자신에게 체력 +2를 부여합니다.` |
  | `frost-wraith` | `죽음의 메아리: 뼈 쥐 2마리를 소환합니다.` |
  | `shadow-bolt` | `적 영웅에게 2의 피해를 줍니다.` |
  | `soul-lance` | `적 하수인에게 3의 피해를 줍니다.` |
  | `healing-mist` | `내 영웅의 체력을 4 회복합니다.` |
  | `raise-bones` | `뼈 쥐 2마리를 소환합니다.` |
  | `rune-surge` | `아군 하수인에게 공격력 +2 및 체력 +1을 부여합니다.` |
  | `dark-insight` | `카드를 2장 뽑습니다.` |
  | `meteor-shard` | `적 하수인에게 5의 피해를 줍니다.` |
  | `life-thread` | `아군 하수인의 체력을 5 회복합니다.` |
  | `soul-storm` | `적 영웅에게 4의 피해를 줍니다. / 카드를 1장 뽑습니다.` |
  | `eclipse` | `적 영웅에게 8의 피해를 줍니다.` |

### I02. 효과 설명 회귀 테스트
- Related Files:
  - `packages/game-core/src/engine.test.ts` :: `CARD_CATALOG` 검사 — 전 카드 설명과 효과별 한국어 문구 검증; modify

#### Details
- 모든 30장 설명이 비어 있지 않고 예전 포괄 문구 `전투 능력을 가진 하수인`, `필드에 소환해 공격하는 하수인`, `마나를 소모해 효과를 발휘하는 주문`을 포함하지 않는지 확인한다.
- 알려진 효과 카드마다 `전투의 함성`, `죽음의 메아리`, 대상, 수량, 공격/체력/피해/회복/드로우 수치가 정확한지 확인한다.
- 효과 없는 하수인은 `특수 효과 없음`인지 확인한다.
- 카드 게임 동작 및 정의된 수치는 기존 엔진 동작 그대로 유지한다.

## Acceptance Criteria
- [x] 20장 하수인의 설명이 특수 효과 또는 효과 없음으로 정확히 구분된다.
- [x] 10장 주문의 대상, 효과, 수치가 설명에 나타난다.
- [x] 엔진 효과 데이터 및 카드 스탯은 바뀌지 않는다.
- [x] 기존 수렁 마녀 로컬 문구 수정이 중복 없이 이 구현에 통합된다.

## Validation
- `npm.cmd run test --workspace @board-game/game-core -- src/engine.test.ts` — 카탈로그 설명 회귀 케이스 포함 통과
- `npm.cmd run build --workspace @board-game/game-core` — 카탈로그 formatter와 타입 검사 통과

## Commit Message
```text
feat(cards): describe each card's actual effect

Plan: 2026-10-22-card-effect-text-audio-playback
Phase: P01-card-text-and-audio-lifecycle
Task: T01-card-effect-descriptions

- Generate Korean card descriptions from effect data
- Cover every minion and spell with catalog assertions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
