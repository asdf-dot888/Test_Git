# Task: T02 영웅·적 고유 초상화

## Status: done

## Goal
현재 단순 SVG 초상화를 일관된 다크 판타지 회화풍 PNG로 교체한다. 플레이어 초상화 1개, 일반 적 6개, 보스 3개를 각각 별도로 제공하고 기존 영웅 패널에서 표시한다.

## Decision Summary
- 그림은 어둡고 웅장한 판타지 회화풍이며 512×512 정사각형 PNG, 글자·프레임·UI·워터마크 없음으로 제작한다.
- 파일명은 현재 `EnemyDefinition.artKey`와 일치시킨다. 카드 이미지와 기존 SVG는 삭제하지 않는다.

## Implementation

### I01. 영웅·적 초상화 이미지 자산 생성
- Related Files:
  - `apps/web/public/art/heroes/player.png` — 신규 512×512 플레이어 영웅 원화
  - `apps/web/public/art/enemies/{artKey}.png` — 신규 적 초상화 9개
  - `packages/game-core/src/catalog.ts` :: `ENEMY_CATALOG` — read-only, 실제 적 ID 및 artKey 기준

#### Details
- **Asset Specification**:
  - 형식 PNG, 512×512, 얼굴/상반신 중심 정사각형 구도, 원형 초상화 크롭에서도 핵심 실루엣이 남도록 피사체를 중앙에 둔다.
  - 공통 스타일: `original dark fantasy game hero portrait, grand painterly digital illustration, cinematic dramatic lighting, detailed face and armor, readable centered silhouette, charcoal shadows and antique gold highlights, square crop, no text, no letters, no symbols, no UI, no frame, no watermark`.
  - `player`: 용맹한 원정대 영웅, 영웅적 자세와 고유한 황금빛/청록빛 강조 색상.
  - 일반 적: `bandit-scout` (무장한 도적 정찰병), `crypt-crawler` (묘지의 괴물), `mire-hag` (늪의 마녀), `fallen-sentinel` (타락한 갑옷 파수꾼), `plague-herald` (역병 괴물/전령), `night-stalker` (어둠의 포식자). 각 초상화는 서로 다른 실루엣과 주조색을 가진 괴물 또는 적 캐릭터.
  - 보스: `boss-blood-matron` (웅장한 핏빛 여왕), `boss-grave-king` (거대한 무덤의 왕), `boss-void-titan` (압도적인 공허 거신). 일반 적보다 큰 스케일과 위압적인 배경/조명을 사용한다.
- **Execution Flow / Validation**:
  1. `ENEMY_CATALOG`의 각 `artKey`가 위 9개 파일 키와 일치하는지 확인한다.
  2. 이미지 생성 도구로 서로 구분되는 10개 원화를 만든다.
  3. 경로와 파일명을 정확히 맞춰 저장한다. 기존 SVG는 보존한다.
  4. 모든 파일이 PNG로 디코딩되고 512×512인지 확인한다.

### I02. 초상화 렌더 경로를 PNG로 변경
- Related Files:
  - `apps/web/src/components/HeroPanel.tsx` :: `HeroPanel` — 이미지 확장자를 `.svg`에서 `.png`로 교체
  - `apps/web/src/components/HeroPanel.test.tsx` :: `HeroPanel` 렌더 테스트 — 신규
  - `apps/web/src/styles/board.css` :: `.hero-portrait`, `.hero-portrait-wrap` — 기존 원형 크롭·테두리 호환 확인; 필요 시 크기만 조정

#### Details
- **Signature**: `HeroPanel(props: { hero: HeroState; side: PlayerSide; artKey: string; name: string; chargeWarning?: boolean; targetable: boolean; onSelectTarget(targetId: string): void }): ReactElement`의 공개 props를 변경하지 않는다.
- **Execution Flow / Logic**:
  1. `side === "player"`이면 `/art/heroes/${artKey}.png`, 적이면 `/art/enemies/${artKey}.png`를 설정한다.
  2. alt 텍스트와 aria 라벨, 체력 표시, 타깃 버튼, 차지 경고 클래스는 보존한다.
  3. 테스트에서 플레이어 `player`와 보스 `boss-grave-king` 경로가 각각 올바른 `.png` URL인지 확인한다.

## Acceptance Criteria
- [ ] 10개 초상화가 각자 고유한 그림이고 다크 판타지 회화풍을 공유한다.
- [ ] 플레이어·일반 적 6종·보스 3종이 PNG 초상화로 표시된다.
- [ ] 체력, 타깃 선택, 차지 경고 및 반응형 원형 크롭이 유지된다.
- [ ] 기존 SVG와 카드 원화 자산은 삭제되거나 덮어쓰이지 않는다.

## Validation
- `npm run test --workspace @board-game/web -- src/components/HeroPanel.test.tsx` — 초상화 URL과 표시 테스트 통과
- `npm run build --workspace @board-game/web` — 웹 TypeScript/Vite 빌드 통과
- PowerShell: `Add-Type -AssemblyName System.Drawing; $files = @('apps/web/public/art/heroes/player.png') + (Get-ChildItem 'apps/web/public/art/enemies' -Filter '*.png' | ForEach-Object { $_.FullName }); if ($files.Count -ne 10) { throw "Expected 10 portrait PNGs; found $($files.Count)" }; foreach ($file in $files) { $image = [System.Drawing.Image]::FromFile((Resolve-Path $file)); try { if ($image.Width -ne 512 -or $image.Height -ne 512) { throw "Invalid dimensions: $file $($image.Width)x$($image.Height)" } } finally { $image.Dispose() } }` — 정해진 초상화 10개가 모두 512×512로 읽힌다.

## Commit Message
```text
feat(art): add dark fantasy hero and enemy portraits

Plan: 2026-10-22-audio-visual-combat-polish
Phase: P01-combat-presentation-and-settings
Task: T02-hero-portrait-art

- Add unique portraits for the player, six enemies, and three bosses
- Render hero portraits from PNG assets
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(art): add dark fantasy hero and enemy portraits
