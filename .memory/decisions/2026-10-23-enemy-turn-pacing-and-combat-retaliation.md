# Decisions: 적 턴 템포와 하수인 전투 피해

- Date: 2026-10-23
- Status: Confirmed

## D01. 하수인 간 전투 피해
- **Chosen**: 한 하수인이 상대 하수인을 공격하면 서로 상대의 현재 공격력만큼 피해를 동시에 받는다. 피해를 모두 적용한 뒤 체력이 0 이하인 하수인을 제거하며, 양쪽 모두 죽을 수 있다. 플레이어와 적에게 똑같이 적용한다.
- **Rationale**: 현재 공격 처리는 방어 대상만 피해를 받아 공격자가 반격하지 않는 결함이 있다. 사용자가 제시한 3/5 대 1/3 사례에서는 공격자가 3/4로 남고 방어 대상은 죽어야 한다.
- **Scope**: 하수인 대 하수인 공격에 적용한다. 영웅은 공격력 모델이 없고, 주문 피해는 반격으로 취급하지 않는다.

## D02. 적 턴 행동 순서와 템포
- **Chosen**: 적의 카드 사용, 하수인 공격, 보스 광역기를 한 번에 겹쳐 재생하지 않고 순서대로 보여준다. 카드 한 장의 소환·전투의 함성·연속 주문 효과는 하나의 행동 묶음으로 재생한다. 각 카드 행동 전체, 하수인 공격 하나, 보스 광역기 하나의 연출이 끝나면 다음 행동 전에 1초 쉰다. 현재 규칙대로 적은 카드 행동 후 보스 광역기를 발동하고, 이어서 하수인들이 공격한다.
- **Rationale**: 행동과 행동 사이에 간격을 두어 상대가 실제로 한 수씩 두는 것처럼 읽히게 한다.
- **Interaction**: 적 턴의 모든 행동 연출과 마지막 1초 대기가 끝날 때까지 카드·하수인 조작과 턴 종료를 막는다. `Esc` 메뉴를 열면 현재 행동/대기 진행률을 보존한 채 재생을 멈추고, 메뉴를 닫으면 이어서 진행한다.

## D03. 플레이어 턴 알림
- **Chosen**: 적의 마지막 행동과 1초 대기가 끝난 뒤, 타이머 경고음과 다른 짧은 전용 효과음을 재생하고 전체 화면 가장자리에 은은한 금빛 강조를 약 1초간 보여준다. 텍스트 배너는 띄우지 않는다.
- **Rationale**: 소리를 끄거나 듣지 못하는 경우에도 시각 알림으로 턴 전환을 알 수 있고, 가장자리 강조는 전투 화면을 가리지 않는다. 금빛은 현재 어두운 전장과 게임 UI의 골드 포인트 색을 따른다.
- **Implementation note**: 기존 `turn-start` 사운드가 타이머 경고음 파일을 가리키므로 전용 효과음으로 분리한다.
- **Defaulted detail**: 강조 색은 기존 게임 테마에 맞춰 은은한 금빛으로 정했다.

## D04. 치명적인 적 행동 뒤 패배 화면
- **Chosen**: 적의 행동으로 플레이어 영웅의 체력이 0이 되어도 마지막 카드/공격/광역 연출과 1초 대기를 끝낸 뒤 패배 화면을 표시한다.
- **Rationale**: 마지막 행동의 결과가 화면에서 확인된 뒤 패배 결과가 나와야 턴 연출이 자연스럽다.
- **Defaulted detail**: 이 추천안에 대한 별도 응답은 받지 못해 기본값으로 기록했다.

## Existing Code Constraints

- `resolveEnemyTurn` currently resolves the full enemy turn synchronously, stores action records, and changes the battle to the player turn before the UI plays effects.
- Combat effect events are currently rendered together with a 120 ms stagger. To show intermediate actions, preserve action order and stage visible battle state/effects during playback; disable player actions until playback completes.
- `attackWithMinion` and `resolveEnemyMinionAttacks` only subtract damage from the target and do not damage the attacker.
- The current `turn-start` sound is mapped to `/audio/sfx/timer-warning.ogg`.

## Out of Scope

- Do not change enemy deck composition, AI target priorities, mana, rewards, boss AoE timing/damage, or player card rules beyond reciprocal minion combat damage.
