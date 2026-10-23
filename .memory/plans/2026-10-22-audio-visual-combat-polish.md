# Plan: 전투 오디오와 영웅·적 시각 효과 개선

## Goal
전투 종류별 배경 음악, 전투 행동별 효과음, 저장되는 오디오 설정을 추가한다. 턴마다 마나가 남은 양에서 1씩 회복되도록 바꾸고, 적 하수인의 선명도와 적 진영 표시를 개선하며, 플레이어·일반 적·보스의 초상화를 고유한 다크 판타지 그림으로 교체한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 마나 규칙, 영웅 초상화, 적 진영 시각 표시, 전투 오디오 및 메뉴 설정 구현 | [P01](../phases/2026-10-22-audio-visual-combat-polish/P01-combat-presentation-and-settings/phase.md) |

## Confirmed Constraints
- 결정 기준: [2026-10-22-audio-visual-polish](../decisions/2026-10-22-audio-visual-polish.md).
- 마나는 최대치 10, 전투 첫 턴 5/10이며, 턴 시작 때 남은 마나에 1을 더하고 10으로 제한한다. 전투 사이에 마나는 새 전투 기본값 5/10으로 초기화된다.
- 오디오는 게임 안에 포함하는 사용 허가가 명확한 파일로 준비한다. 후보 CC0 자산은 [일반전투 배경음 Dark Place (loop)](https://opengameart.org/content/dark-place-loop), [보스전 배경음 Boss Battle Music](https://opengameart.org/content/boss-battle-music), [Fantasy Sound Effects (Tinysized SFX)](https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx), [Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx), [Cure Magic](https://opengameart.org/content/cure-magic), [Monster Sound Effects Pack](https://opengameart.org/content/monster-sound-effects-pack)이다. 파일을 선택·복사할 때 출처와 CC0를 `apps/web/public/audio/ASSETS.md`에 기록한다.
- 오디오 설정은 로컬 브라우저 저장소에 저장한다. Azure 서버의 게임 진행 저장과 별개로 유지한다.
- 활성 카드 전투에는 플레이어 영웅 직접 공격 액션이 없다. 이 계획은 새 공격 규칙을 추가하지 않고 현재 존재하는 플레이어 하수인 공격, 적 하수인 공격, 주문, 회복, 피해 및 사망에 오디오를 연결한다.
- 요청된 적 종류는 현재 카탈로그의 일반 적 6종과 보스 3종이다. 카드 이미지 자산은 기존 PNG를 유지한다.
- 브라우저 오디오 자동 재생 제한을 고려해 첫 사용자 입력에서 오디오를 활성화하고, 이후 현재 화면과 조우 종류에 맞춰 재생한다.

## Execution Order
P01-T01 마나 엔진 → T02 영웅 초상화 자산/표시 → T03 적 하수인 진영 표시 → T04 오디오 자산/재생/전투 이벤트 → T05 메뉴/설정/진행 포기 연결.
