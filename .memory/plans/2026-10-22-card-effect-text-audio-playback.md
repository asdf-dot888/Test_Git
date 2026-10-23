# Plan: 카드 효과 설명과 오디오 재생 문제

## Goal
30장 카드가 실제 엔진 효과를 설명하도록 만들고, 로컬 데모의 개발 모드에서 배경 음악과 전투 효과음이 React StrictMode 아래서도 재생되게 한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | 카탈로그 효과 문구와 오디오 컨트롤러 수명 주기 수정 | [P01](../phases/2026-10-22-card-effect-text-audio-lifecycle/phase.md) |

## Confirmed Constraints
- 결정 기준: [2026-10-22-card-effect-text-and-audio-playback](../decisions/2026-10-22-card-effect-text-and-audio-playback.md).
- 실제 카드 효과 및 수치를 바꾸지 않는다. 문구는 기존 `minion.effect` 및 `spellEffects`에 맞춘다.
- 특별한 효과가 없는 하수인의 설명은 `특수 효과 없음`으로 표시한다. 공격력/체력은 기존처럼 별도 표시한다.
- 로컬 오디오 파일, 볼륨 기본값, 첫 사용자 입력에서 오디오를 활성화하는 브라우저 정책 대응은 유지한다.
- 개발 모드의 React `StrictMode`를 제거하지 않는다.
- 수렁 마녀 설명 변경은 효과 데이터 기반 formatter로 통합했다.

## Execution Order
P01-T01 카드 효과 설명 생성 (`bf1cb59`) → T02 StrictMode에서 오디오 컨트롤러 수명 주기 안전화 (`25ddb56`).
