# Decisions: 주문 대상 규칙 일치 및 선택 오류 수정

- Date: 2026-11-12
- Status: Confirmed
- Feature: spell-target-consistency

## D01. 수정 범위
- **Chosen**: 사용자가 선택한 1번에 따라 운명의 파편과 그림자 화살뿐 아니라 같은 원인의 주문 대상 오류를 함께 수정한다. 수확자의 칼날의 대상 선택 누락, 공통 damage 처리의 영웅/하수인 제한 무시, 이에 연결된 컴퓨터의 사용 가능 판정·대상 선택·표시를 포함한다.
- **Rationale**: 두 카드만 예외 처리하면 같은 효과를 사용하는 다른 카드에 설명과 실제 행동의 불일치가 남는다. 카드별 예외보다 기존 효과 정의의 대상 제한을 일관되게 적용한다.

## D02. 기존 결정과의 관계
- **Chosen**: `.memory/decisions/2026-10-22-enemy-card-ai-victory-flow.md`의 D03 중 단일 대상 피해 주문에 일괄 적용한 하수인 우선 규칙을 이번 결정으로 대체한다. 주문은 시전자 기준으로 카드 설명의 대상 제한을 먼저 지킨다. 일반 하수인 공격의 하수인 우선 규칙은 유지한다.
- **Rationale**: 사용자는 그림자 화살이 영웅 전용임에도 컴퓨터가 하수인을 공격하는 것을 오류로 신고했고, 같은 원인의 주문 대상 오류까지 수정하기로 선택했다. 과거 규칙보다 이번 요구사항을 우선한다. 기존 결정 파일은 이력으로 보존한다.

## D03. 운명의 파편
- **Chosen**: 플레이어는 선택한 상대 하수인 또는 상대 영웅에게 0~5의 무작위 피해를 준다. 상대 하수인이 있어도 상대 영웅을 선택할 수 있다. 클릭·터치 선택과 드래그 사용에서 허용 대상이 일치해야 한다. 아군과 존재하지 않는 하수인은 대상이 아니다.
- **Rationale**: `catalog.ts`의 설명과 `engine.ts`의 randomDamage 처리는 이미 이 규칙을 지원한다. 무작위인 것은 피해량이며 대상은 사용자가 선택한다. `GameBoard.tsx`의 spellTargetSide가 randomDamage를 찾아도 적 진영을 반환하지 않는 화면 선택 누락이 원인이다.

## D04. 수확자의 칼날
- **Chosen**: 상대 하수인을 선택할 수 있도록 같은 화면 누락을 수정한다. 상대 하수인이 없으면 사용할 수 없고 영웅은 대상이 아니다. 선택한 하수인에게 4, 양옆 하수인에게 각각 2 피해를 주는 기존 효과는 유지한다.
- **Rationale**: spellTargetSide에서 cleave도 적 진영을 반환하지 않는다. 피해 계산은 이미 구현돼 있으므로 대상 선택·사용 가능 판정을 바로잡고 기존 양옆 피해를 검증한다.

## D05. 고정 피해 주문의 대상 제한
- **Chosen**: `damage.target === enemyHero`는 양쪽 시전자 모두 상대 영웅에게만 적용한다. 그림자 화살·영혼 폭풍·일식이 해당한다. `damage.target === enemyMinion`은 상대 하수인에게만 적용하며, 대상 하수인이 없을 때 영웅 피해로 대체하지 않는다. 영혼 창·유성 파편·심판의 망치·그림자 수리검·지옥불 작렬 등 같은 효과 정의를 쓰는 카드에 적용한다.
- **Rationale**: 기존 applySpellEffect는 플레이어의 영웅 전용 주문만 별도 처리하고, 컴퓨터는 플레이어 전장 유무에 따라 모든 damage 주문을 하수인 또는 영웅으로 전환한다. selectEnemySpellTarget도 effect.target을 구분하지 않는다. 카드 설명을 바꾸지 않고 실행을 기존 정의에 맞춘다.

## D06. 컴퓨터 행동과 난이도
- **Chosen**: 일반·어려움 모두 합법적인 대상이 있는 주문만 사용하고, 효과 실행·대상 선택·카드 평가가 같은 제한을 따른다. 하수인 전용 주문은 상대 전장이 비면 손패에 남기며 해당 주문의 마나를 쓰지 않는다. 운명의 파편은 기존의 합법적인 하수인 우선 선택과 빈 전장의 영웅 공격을 유지한다.
- **Rationale**: 이번 작업은 대상 규칙의 오류 수정이다. 선택 가능한 대상 안에서 이루어지는 기존 전술, 카드 수치, 난수 방식, 난이도 수치를 재설계할 필요가 없다. 어려움의 행동 탐색도 실제 사용 가능 조건과 일치해야 한다.

## D07. 입력·실행·효과 표시의 일관성
- **Chosen**: 대상 강조, 선택 가능 상태, 클릭·터치·드래그, 엔진의 대상 검증을 함께 확인한다. 명시적으로 잘못 지정한 대상은 다른 대상으로 바꾸어 시전하지 않고 거부하며 카드·마나·난수 상태를 소모하지 않는다. 영웅 전용 주문을 카드 선택만으로 즉시 시전하는 기존 정상 조작은 유지한다. 컴퓨터 주문의 대상 기록·대상 예고·피해 연출은 실제 피해 대상과 일치하도록 필요한 연결부를 수정한다.
- **Rationale**: App.handleDropInteraction은 주문 종류와 무관하게 하수인 드롭을 전달하고, 고정 영웅 피해 실행은 전달된 하수인 ID를 무시할 수 있다. 화면만 수정하면 입력 경로별 동작 차이가 남는다. 또한 현재 영웅 대상에는 battle hero ID, enemy-hero/player-hero, 컴퓨터 기록의 null 등 여러 표현이 있어 소비 코드까지 확인해야 한다.

## D08. 구현 경계와 검증 기준
- **Chosen**: 기존 SpellEffect 데이터 구조와 카드 정의를 사용하고, 이 수정 때문에 저장 데이터나 API 스키마를 변경하지 않는다. 공통 효과 규칙을 기준으로 필요한 판정의 중복을 줄이되 대규모 구조 개편은 하지 않는다. 계획 단계에서 다음 영역의 회귀 테스트(같은 오류의 재발을 막는 테스트)를 구체화한다.
  - 운명의 파편: 적 하수인·영웅 선택, 적 하수인 존재 시 영웅 선택, 아군/없는 대상 거부, 0~5 피해 유지.
  - 수확자의 칼날: 하수인 선택, 빈 전장에서 사용 불가, 영웅 대상 거부, 양옆 피해 유지.
  - 영웅 전용 피해: 양쪽 시전자와 일반/어려움에서 상대 하수인이 있어도 영웅 피해만 적용.
  - 하수인 전용 피해: 유효 하수인 피해와 빈 전장 사용 불가, 잘못된 대상에서 자원 미소모.
  - 클릭·터치·드래그 대상 제한과 컴퓨터 대상 기록·예고·피해 연출의 일치.
- **Rationale**: `types.ts`에 이미 필요한 효과 종류와 대상 필드가 있고, 엔진은 상태 복사 후 처리한다. 기존 엔진/UI 테스트에 실제 증상과 경계 조건을 추가하는 것이 적절하다.

## 코드에서 확인한 관련 위치
- `packages/game-core/src/catalog.ts`: 카드 효과 정의와 설명 생성.
- `packages/game-core/src/engine.ts`: applySpellEffect, selectEnemySpellTarget, isEnemyCardTargetPlayable, scoreEnemyCard, playEnemyCard, castSpellWithResolution.
- `apps/web/src/components/GameBoard.tsx`: spellTargetSide, canSelectCard, enemyHeroTargetable, intentHeroTarget.
- `apps/web/src/components/MinionLane.tsx`: targetSide에 따른 대상 활성화 및 드롭 처리.
- `apps/web/src/App.tsx`: selectCard, selectTarget, handleDropInteraction.
- `apps/web/src/game/combatEffects.ts`: enemySpellTarget 및 주문 피해·사망 효과 생성.
- 기존 검증 기반: `packages/game-core/src/engine.test.ts`, `apps/web/src/components/GameBoard.test.tsx`, `apps/web/src/App.interactions.test.tsx`, `apps/web/src/game/combatEffects.test.ts`.

## 범위 밖 관찰 및 작업 상태
- 컴퓨터의 기존 하수인 우선 정책은 과거 결정에 따른 구현이었다. 주문 부분의 정책 변경으로 전투 결과가 달라질 수 있으나, 별도의 난이도 수치 조정은 이번 결정에 포함하지 않는다.
- 운명의 파편·수확자의 칼날의 피해 효과는 이미 구현돼 있다. 새 효과를 중복 구현하지 않는다.
- 작업 트리에 기존 수정·미추적 파일이 다수 있다. 이 인터뷰에서는 새 결정 문서만 추가하고 기존 변경은 보존한다.
- 구현 코드, 계획/Task 파일, `.memory/current.md`는 변경하지 않았다. 테스트 실행과 커밋은 실행 단계에서 수행한다.
