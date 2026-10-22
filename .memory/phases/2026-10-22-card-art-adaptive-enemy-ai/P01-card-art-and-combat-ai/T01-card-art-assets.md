# Task: T01 카드 아트 자산 생성

## Status: done

## Goal
현재 카드 카탈로그의 고유 카드 30종 각각에 맞는 일관된 다크 판타지 페인팅 그림을 만들어, 손패 카드·보상 카드·전장 하수인과 전투 연출이 공통으로 사용할 자산을 제공한다.

## Decision Summary
- 동일한 카드 정의의 덱 복사본은 동일한 `artKey` 그림을 공유한다. 각 그림은 512×512 PNG이며 문구, 비용, 테두리, UI 요소는 그림 안에 넣지 않는다.
- 기존 카드 키와 맞춰 `apps/web/public/art/cards/{artKey}.png`에 둔다. 다음 Task가 세 컴포넌트를 `.png` 경로로 바꾸기 전까지 기존 SVG는 삭제하지 않는다.

## Implementation

### I01. 카드별 원화 생성 및 정리

- Related Files:
  - `apps/web/public/art/cards/{artKey}.png` — 생성; 30개 신규 원화 자산
  - `packages/game-core/src/catalog.ts` :: `CARD_CATALOG` — read-only; 카드 키와 카드 콘셉트의 기준

#### Details
- **Asset Specification**:
  - 포맷·크기: 불투명 RGB/RGBA PNG, 정확히 512×512 픽셀. 원본은 1024×1024로 생성한 뒤 비율을 유지해 512×512로 축소한다.
  - 공통 프롬프트: `original dark fantasy trading-card game illustration, painterly digital painting, dramatic cinematic lighting, rich readable silhouette, detailed subject centered in a square composition, muted charcoal and antique-gold palette with one strong subject color, no text, no lettering, no numbers, no UI, no frame, no watermark, square crop`.
  - 카드별로 아래 소재를 추가한다. 캐릭터 카드에는 카드 이름과 읽히는 실루엣이 분명해야 하고, 주문은 주문 효과를 보여주는 장면으로 그린다.
  - 같은 스타일을 유지하되 색상과 배경 소재는 카드 콘셉트에 맞게 분리한다. 게임 내 카드 복사본 간 그림은 달라지지 않는다.
- **Exact Asset Inventory**:
  - 하수인: `ash-wolf` (잿빛 늑대), `crypt-guard` (묘지의 갑옷 경비병), `cinder-imp` (불씨 악마), `bone-rat` (해골 쥐), `grave-knight` (망령 기사), `mire-witch` (늪 마녀), `iron-hound` (철갑 사냥개), `ember-priest` (불꽃 사제), `shade-stalker` (그림자 추적자), `thorn-brute` (가시 괴수), `dusk-raven` (황혼 까마귀), `plague-bearer` (역병 운반자), `rune-smith` (빛나는 룬을 벼리는 대장장이), `moon-stag` (달빛 사슴), `hollow-giant` (공허 거인), `blood-oracle` (핏빛 예언자), `frost-wraith` (서리 망령), `storm-crow` (폭풍 까마귀), `ancient-treant` (고대 나무 수호자), `dread-colossus` (거대한 공포의 골렘).
  - 주문: `shadow-bolt` (보랏빛 그림자 화살), `soul-lance` (영혼 에너지 창), `healing-mist` (청록 치유 안개), `raise-bones` (땅에서 솟는 뼈 소환), `rune-surge` (빛나는 룬의 파동), `dark-insight` (어둠 속 눈과 통찰), `meteor-shard` (불타는 운석 파편), `life-thread` (상처를 잇는 생명의 실), `soul-storm` (영혼 폭풍), `eclipse` (검은 태양을 가리는 일식).
- **Execution Flow / Validation**:
  1. `CARD_CATALOG`의 30개 서로 다른 `artKey`를 위 목록과 대조한다.
  2. ImageGen으로 각 소재별 원화를 생성하고 키와 동일한 파일명으로 복사한다.
  3. 각 이미지를 512×512 PNG로 변환한다. 생성 결과의 가로세로 비율을 찌그러뜨리지 말고 중앙 크롭으로 맞춘다.
  4. 정확히 30개의 PNG가 있고 모든 파일을 디코딩할 수 있는지 확인한다. 이 Task에서는 SVG 참조 코드와 SVG 파일은 유지한다.

## Acceptance Criteria
- [ ] 카드 키마다 PNG 파일이 하나씩 있고 파일명은 `CARD_CATALOG.artKey`와 일치한다.
- [ ] 모든 파일은 512×512이며, 글자·비용·능력치·테두리·워터마크가 그림에 포함되지 않는다.
- [ ] 30장의 주제가 구별되고 공통 다크 판타지 페인팅 스타일을 유지한다.

## Validation
- `npm run build --workspace @board-game/game-core` — 카탈로그 기준이 계속 빌드된다.
- PowerShell: `Add-Type -AssemblyName System.Drawing; $files = Get-ChildItem 'apps/web/public/art/cards' -Filter '*.png'; if ($files.Count -ne 30) { throw "Expected 30 card PNGs; found $($files.Count)" }; foreach ($file in $files) { $image = [System.Drawing.Image]::FromFile($file.FullName); try { if ($image.Width -ne 512 -or $image.Height -ne 512) { throw "Invalid dimensions: $($file.Name) $($image.Width)x$($image.Height)" } } finally { $image.Dispose() } }` — 30개 PNG가 전부 512×512로 읽힌다.

## Commit Message
```text
feat(art): add individual dark fantasy card illustrations

Plan: 2026-10-22-card-art-adaptive-enemy-ai
Phase: P01-card-art-and-combat-ai
Task: T01-card-art-assets

- Add one square illustration for each card definition
- Keep art keys aligned with the game catalog
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(art): add individual dark fantasy card illustrations

