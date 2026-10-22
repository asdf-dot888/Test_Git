# Task: T01 상호작용 효과음과 포인터 입력

## Status: done

## Goal

활성 마우스/포인터 조작에는 공통 금속 클릭음을 내고, 턴 시작·턴 종료·하수인 소환·공격·주문·회복·피해·사망에는 동작별 효과음도 연결한다. `Escape`만 메뉴 전환 키로 허용하고 Enter, Space, 키보드 이동으로 게임을 조작할 수 없게 한다.

## Decision Summary
- 모든 포인터 입력은 UI 클릭음을 내고 실제 동작은 의미별 소리도 낸다. 새 로컬 음원은 CC0이며 경고음은 T02에서 효과음 음량의 40%로 재생한다.
- 게임 조작은 포인터 중심이다. Escape는 메뉴 닫기/열기와 설정에서 메뉴 선택 화면으로 돌아가기에만 쓴다.

## Implementation

### I01. AudioController 종류·매핑·음량 및 로컬 asset
- Related Files:
  - `apps/web/src/game/audio.ts` :: `SoundEffectKind`, `AudioController`, `createAudioController`; modify
  - `apps/web/src/game/audio.test.ts` :: 효과음 및 음량 테스트; modify
  - `apps/web/public/audio/sfx/ui-click.ogg` :: 금속 클릭음; new binary asset
  - `apps/web/public/audio/sfx/timer-warning.ogg` :: 마법 종소리; new binary asset
  - `apps/web/public/audio/ASSETS.md` :: 출처·license·변환 기록; modify

#### Details
- `SoundEffectKind`에 `ui-click`, `turn-start`, `turn-end`, `summon`, `timer-warning`을 추가하고 기존 `hero-attack`, `minion-attack`, `spell`, `heal`, `damage`, `death`는 유지한다.
- `AudioController.playEffect(kind: SoundEffectKind, volumeScale?: number): void`로 확장한다. `volumeScale` 기본값은 1, 적용 범위는 0..1이며 실제 음량은 `settings.effectsVolume * volumeScale`을 0..1로 clamp한다. 활성 audio player마다 scale을 기억해 설정 변경을 반영한다. 음소거 시 전 cue를 막는다.
- `ui-click` 경로는 `/audio/sfx/ui-click.ogg`, `timer-warning`은 `/audio/sfx/timer-warning.ogg`, `turn-start`는 같은 종소리 파일, `turn-end`는 기존 `/audio/sfx/attack.ogg`, `summon`은 기존 `/audio/sfx/spell.ogg`를 쓴다. 기존 cue 경로는 유지한다.
- 두 새 음원은 절제된 짧은 CC0 소스를 고르고 OGG로 로컬 저장한다. `ASSETS.md`에 원본 URL, 개별 파일/라이선스, 변환 도구와 명령을 기록한다. 외부 런타임 요청은 만들지 않는다. 후보 출처는 결정 문서의 Kenney Interface Sounds와 UI Sound Effects CC0 페이지다.
- 단위 테스트는 기본/40% 음량, 설정 변경, 전체 음소거, 새 cue 경로, player 종료 시 정리 동작을 확인한다.

### I02. CombatEffectEvent에 의미별 cue 연결
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent`, `collectCombatEffectEvents`, `pushEvent`; modify
  - `apps/web/src/game/combatEffects.test.ts` :: 행동 cue 테스트; modify

#### Details
- 시그니처와 기존 시각 이벤트를 보존하고 `soundCues`에 의미 cue를 연결한다. 일반 하수인 및 battlecry 소환은 소환 이벤트마다 `summon`; 주문은 `spell`; 공격은 공격 cue; 실제 피해/회복/사망은 각각 기존 `damage`/`heal`/`death` cue를 유지한다. 적 및 보스 행동도 동일 규칙을 쓴다.
- 주문 소환은 주문 cue와 생성된 각 하수인의 summon cue를 모두 내며, 복합 효과에서 같은 실제 cue를 중복 추가하지 않는다. UI 클릭 cue는 이 함수가 아니라 포인터 handler에서 낸다.
- 테스트는 하수인 소환, battlecry 소환, 주문 피해/회복/소환, 양측 공격, 사망, 적 턴 피해에서 기대 cue의 존재와 중복 부재를 확인한다.

### I03. 포인터 입력음과 Escape 전용 메뉴
- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView`, audio setup, document handlers, turn transitions; modify
  - `apps/web/src/components/GameMenu.tsx` :: keydown/focus handling; modify
  - `apps/web/src/App.interactions.test.tsx` :: 포인터와 audio cue; new
  - `apps/web/src/components/GameMenu.test.tsx` :: Escape/키보드 제한; modify

#### Details
- 오디오 unlock은 포인터 입력으로 유지한다. 활성 버튼·카드·대상·보상·하수인/영웅 선택 등 상호작용 요소의 포인터 입력에 `ui-click`을 한 번 낸다. disabled 요소 및 비상호작용 배경은 무음이다. 클릭음과 의미 cue는 함께 재생한다.
- 실제 행동 처리 뒤 의미 cue를 재생한다. 수동 종료 및 타이머 종료는 `turn-end`, 플레이어 턴 진입은 `turn-start` 한 번, 첫 턴도 최초 전투가 나타날 때 한 번 재생한다. 임박 timer cue는 T02 소관이다.
- 활성 게임에서 Escape는 `closed→choices`, choices에서는 `closed`, settings에서는 `choices`로 전환한다. 설정에서 닫으려면 Escape를 한 번 더 눌러야 한다. 활성 게임 밖에서는 무시한다.
- Enter/Space/Arrow/WASD 및 Tab 메뉴 이동/포커스 트랩은 게임 조작에 사용하지 않게 제거한다. 앱 전역에서 브라우저 단축키를 무차별 차단하지 않는다. 버튼 역할과 접근 가능한 이름은 보존한다.
- 테스트는 활성 포인터 1회→click 1회, disabled→무음, click+행동 cue 공존, Escape 각 전이, Enter/Space/Tab/Arrow로 게임 액션 불발을 확인한다.

## Acceptance Criteria
- [x] 활성 포인터 입력은 공통 클릭음을 한 번 내며 disabled control은 무음이다.
- [x] 의미별 행동 cue가 함께 들리고 기존 음량 및 음소거를 따른다.
- [x] 새 로컬 파일의 CC0 출처와 변환 정보를 기록했다.
- [x] Escape만 게임 메뉴 키로 작동하고 키보드 이동/활성화는 게임을 조작하지 않는다.
- [x] 턴 시작/끝 cue는 각 전환마다 한 번 난다.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/game/audio.test.ts src/game/combatEffects.test.ts src/App.interactions.test.tsx src/components/GameMenu.test.tsx` — cue/input 테스트 통과
- `npm.cmd run lint --workspace @board-game/web` — lint 통과
- `npm.cmd run build --workspace @board-game/web` — TypeScript/Vite build 통과

## Commit Message
```text
feat(audio): add sounds for every game interaction

Plan: 2026-10-22-interaction-sounds-and-turn-timer
Phase: P01-interaction-feedback-and-turn-clock
Task: T01-interaction-audio-and-input

- Add local CC0 click and timer warning sounds
- Connect action cues and Escape-only menu input
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
