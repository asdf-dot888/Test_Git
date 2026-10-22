# Task: T04 배경 음악과 전투 효과음

## Status: done

## Goal
일반 전투와 보스전에서 서로 다른 CC0 배경 음악을 반복 재생하고, 현재 게임에서 가능한 공격·주문·회복·피격·사망 이벤트에 맞는 로컬 효과음을 재생하는 오디오 모듈을 추가한다.

## Decision Summary
- 모든 파일을 `apps/web/public/audio/`에 넣고 런타임 외부 URL 요청은 하지 않는다.
- BGM 후보: OGA CC0 `Dark Place (loop)`의 `dark_place.ogg`와 seamless loop인 `Boss Battle Music` 원본 WAV를 OGG로 변환한다. SFX 후보: OGA CC0 Tinysized, Magic Spell SFX, Cure Magic, Monster Sound Effects Pack.
- 각 선택 파일의 원 출처·작품명·저자·라이선스·복사 파일명을 `apps/web/public/audio/ASSETS.md`에 기록한다.

## Implementation

### I01. 오디오 파일 및 라이선스 목록 추가
- Related Files:
  - `apps/web/public/audio/bgm/normal.ogg` — Dark Place (loop), CC0
  - `apps/web/public/audio/bgm/boss.ogg` — Boss Battle Music seamless loop, CC0, OGG로 변환
  - `apps/web/public/audio/sfx/attack.ogg` — Tinysized SFX에서 고른 칼 휘두름/충격음, CC0
  - `apps/web/public/audio/sfx/spell.ogg` — Magic Spell SFX에서 고른 마법 시전음, CC0
  - `apps/web/public/audio/sfx/heal.ogg` — Cure Magic에서 고른 회복음, CC0
  - `apps/web/public/audio/sfx/damage.ogg` — Tinysized SFX에서 고른 타격음, CC0
  - `apps/web/public/audio/sfx/death.ogg` — Monster Sound Effects Pack에서 고른 괴물 사망음, CC0
  - `apps/web/public/audio/ASSETS.md` — 신규, 파일별 출처와 라이선스 명세

#### Details
- **Exact Source Pages**:
  - `https://opengameart.org/content/dark-place-loop` — Dark Place (loop), `dark_place.ogg`, CC0, 일반 전투 테마.
  - `https://opengameart.org/content/boss-battle-music` — SubspaceAudio의 `Juhani Junkala - Epic Boss Battle [Seamlessly Looping].wav`, seamless loop·CC0, 보스 테마. 웹 전송을 위해 OGG로 변환한다.
  - `https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx` — 96종 판타지 효과음 묶음, CC0, 공격/피격 후보.
  - `https://opengameart.org/content/magic-spell-sfx` — `magical_1.ogg`–`magical_7.ogg`, CC0, 주문 후보.
  - `https://opengameart.org/content/cure-magic` — `curemagic.zip`, CC0, 회복 후보.
  - `https://opengameart.org/content/monster-sound-effects-pack` — `monster_sfx_pack.zip`, CC0, 사망 후보.
- **Asset Process**:
  1. 출처 페이지에서 원본 파일을 내려받아 압축 파일은 임시 위치에서 확인한다.
  2. 프리뷰/파일을 직접 들어 보고 소리 종류에 맞는 짧은 클립을 선택한다. 최종 선택 원본 파일 이름을 `ASSETS.md`에 기록한다.
  3. 웹 브라우저 호환성을 위해 정리한 효과음은 OGG로 저장한다. 선정된 BGM이 OGG가 아니면 OGG로 변환한다. 원음을 바꾸거나 권리 문구를 제거하지 않는다.
  4. 클립은 적절한 시작/끝 지점을 자르고 효과음 피크를 과도하지 않게 정규화한다. 편집본도 출처 페이지, CC0, 원본 파일명, 편집 사항을 기록한다.
  5. BGM은 각각 약 2–8 MB, 단일 효과음은 가능한 한 500 KB 이하로 유지한다. 길이/파일 크기 확인은 PowerShell/미디어 메타데이터 도구로 한다.

### I02. 로컬 오디오 컨트롤러와 설정 주입
- Related Files:
  - `apps/web/src/game/audio.ts` :: `createAudioController`, `AudioController`, `AudioSettings`, `MusicKind`, `SoundEffectKind` — 신규 런타임 모듈
  - `apps/web/src/game/audio.test.ts` :: `createAudioController` — 신규 mock 기반 테스트

#### Details
- **Types / Signatures**:
  ```typescript
  export type MusicKind = "normal" | "boss";
  export type SoundEffectKind = "hero-attack" | "minion-attack" | "spell" | "heal" | "damage" | "death";
  export interface AudioSettings { musicVolume: number; effectsVolume: number; muted: boolean; }
  export interface AudioController {
    unlock(): Promise<void>;
    playMusic(kind: MusicKind): void;
    playEffect(kind: SoundEffectKind): void;
    setSettings(settings: AudioSettings): void;
    dispose(): void;
  }
  export function createAudioController(createAudio?: (src: string) => HTMLAudioElement): AudioController;
  ```
- **Audio Mapping**:
  - `normal` → `/audio/bgm/normal.ogg`; `boss` → `/audio/bgm/boss.ogg`; BGM는 `loop = true`.
  - `hero-attack`은 별도 파일 없이 `minion-attack`과 동일한 공격 클립을 재사용한다. 현재 게임에 영웅 직접 공격 액션은 없으므로 이 키를 신규 공격 규칙에 연결하지 않는다.
  - `minion-attack` → `/audio/sfx/attack.ogg`; `spell` → `spell.ogg`; `heal` → `heal.ogg`; `damage` → `damage.ogg`; `death` → `death.ogg`.
- **Execution Flow / Logic**:
  1. 생성 시 오디오 엘리먼트를 필요한 시점에 만들고, `unlock()`은 사용자 제스처 뒤 오디오 컨텍스트/미디어 재생을 허용한다.
  2. `playMusic(kind)`는 같은 곡 재요청 때 위치를 리셋하지 않고, 종류가 바뀔 때 현재 트랙을 약 400ms 동안 페이드아웃하고 신규 트랙을 페이드인한다. 신규 트랙의 `.play()` Promise rejection은 잡아 다음 사용자 입력으로 재시도한다.
  3. `playEffect(kind)`는 짧은 효과음이 겹쳐도 각 재생이 서로를 끊지 않도록 독립 재생 엘리먼트를 사용하고, 음소거/효과음 볼륨을 반영한다.
  4. `setSettings`는 두 볼륨을 0–1 범위로 제한하고 음소거를 반영한다. 이 Task는 로컬 저장을 직접 하지 않고 설정을 인자로 받는다.
  5. `dispose()`는 BGM과 생성된 재생 엘리먼트·타이머를 정리한다.
- **Tests**: fake audio를 주입해 파일 URL, loop, same-track no-restart, normal↔boss 전환, 설정 볼륨/음소거, rejected play Promise 처리, dispose cleanup을 검증한다.

### I03. 게임 전투 이벤트에 효과음 연결
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent`, `collectCombatEffectEvents`, `pushEvent` — cue 배열 추가
  - `apps/web/src/game/combatEffects.test.ts` :: `collectCombatEffectEvents` — cue 기대값 회귀 테스트
  - `apps/web/src/App.tsx` :: `GameSessionView` — audio controller 수명/이벤트 연결 및 BGM 장면 선택

#### Details
- **Event Schema**:
  - `CombatEffectEvent`에 `soundCues: SoundEffectKind[]`를 추가한다. 각 cue는 해당 애니메이션 이벤트와 같은 event ID로 한 번만 재생한다.
  - 공격 이벤트는 `minion-attack`; 주문의 각 효과 이벤트는 `spell`과 해당 결과(`damage` 또는 `heal`)를 함께 재생한다. 적 영웅/하수인 피해도 `damage`; 사라진 하수인이 피해 이벤트 대상이면 `death`를 덧붙인다. 주문의 heal 효과는 `spell` + `heal`을 재생한다.
  - 같은 한 게임 액션에서 효과음 cue를 여러 개 재생하되 같은 cue의 동시 중복은 event 단위로 한 번만 둔다.
- **Execution Flow / Logic**:
  1. `GameSessionView`에서 audio controller를 만들고 컴포넌트 정리 시 `dispose()`한다.
  2. `session.combatEffects`에 새로 생긴 event ID를 기록해 React 재렌더/StrictMode가 같은 효과음을 두 번 재생하지 않게 한다.
  3. 첫 사용자 입력 handler에서 `unlock()`을 호출한다. 유저 제스처 없이 시작되는 자동 재생 실패는 앱 오류로 표출하지 않는다.
  4. `run.battle.enemyId`를 `ENEMY_BY_ID`로 조회해 `kind === "boss"`일 때 boss BGM를 선택한다. battle이 없거나 현재 조우가 일반전투이면 normal BGM를 선택한다. 현재 화면이 메뉴/전투 외 화면이어도 선택된 현재 테마를 유지한다.
  5. 보상에서 다음 전투로 넘어가 enemyId가 바뀌어도 BGM는 normal/boss 종류가 같다면 재시작하지 않는다.
- **Out of Scope**: 코어 게임에 영웅 공격 액션을 추가하지 않는다. `hero-attack` 키는 추후 연결 가능한 오디오 매핑만 제공한다.

## Acceptance Criteria
- [ ] 일반 전투와 보스전에서 CC0 배경 음악이 각각 로컬 파일로 반복 재생되고 조우 종류 변경 시 자연스럽게 전환된다.
- [ ] 미니언 공격, 주문, 회복, 피해, 하수인 사망 이벤트에 해당 효과음이 재생된다.
- [ ] 재생 이벤트가 렌더 반복이나 화면 효과 완료 뒤 중복 재생되지 않는다.
- [ ] 오디오 파일 출처·라이선스·원본 파일명이 manifest에 명시되고 외부 런타임 오디오 요청이 없다.
- [ ] 오디오 로딩/자동 재생 실패가 게임 조작을 막거나 런타임 오류로 노출되지 않는다.

## Validation
- `npm run test --workspace @board-game/web -- src/game/audio.test.ts src/game/combatEffects.test.ts` — 컨트롤러·이벤트 cue 테스트 통과
- `npm run build --workspace @board-game/web` — 웹 빌드 통과
- `npm run lint --workspace @board-game/web` — 웹 린트 통과
- 수동 브라우저 확인: 메뉴에서 첫 전투를 시작하고 normal↔boss 전환, 플레이어 미니언 공격, enemy attack, damage spell, heal spell, 미니언 사망 소리를 확인한다.

## Commit Message
```text
feat(audio): add dark combat music and action sound effects

Plan: 2026-10-22-audio-visual-combat-polish
Phase: P01-combat-presentation-and-settings
Task: T04-combat-audio

- Add locally bundled CC0 music and combat sound effects
- Route battle events and encounter type through audio controller
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(audio): add dark combat music and action sound effects
