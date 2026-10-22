# 문제 해결

아래 항목은 브라우저 개발자 도구의 오류 코드, App Service 진단 로그, Cosmos 응답 상태를 기준으로 점검합니다. 로그에는 access token, client secret, Cosmos key, 사용자 원정 payload를 기록하지 마세요.

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| MSAL `interaction_required` | 브라우저 계정 세션, 동의 필요 여부, 회사 Conditional Access 정책, SPA redirect URI | 다시 로그인하고 회사 정책에 필요한 권한 동의를 운영자에게 확인합니다. tenant authority와 SPA redirect URI가 등록값과 일치하는지 점검합니다. |
| API가 audience/tenant mismatch로 거부 | access token의 발급 대상 audience, 단일 테넌트 issuer, 설정된 `ENTRA_TENANT_ID`와 `ENTRA_API_AUDIENCE`, 브라우저의 `VITE_ENTRA_API_SCOPE` | 운영자가 앱 등록의 API audience와 발급 scope를 대조합니다. `VITE_` 값 수정 후에는 프런트엔드 재빌드·재배포가 필요합니다. 토큰 원문을 로그나 티켓에 붙이지 말고 필요한 claim은 승인된 도구로 안전하게 확인합니다. |
| App Service Easy Auth 401 또는 로그인 반복 | Authentication provider, issuer/allowed audience, 미인증 요청 동작, `/.auth/login/aad/callback` redirect URI | App Service 설정과 Entra 앱 등록의 callback/사이트 redirect URI를 대조합니다. API가 요구하는 bearer access token 발급 scope도 확인합니다. |
| Cosmos 403 | `COSMOS_ENDPOINT`, database/container 이름, App Service Managed Identity 활성화 상태, identity principal, Cosmos 데이터 평면 RBAC scope와 role assignment | 앱 identity에 올바른 계정/database/container 범위의 최소 데이터 contributor 권한이 할당됐는지 확인합니다. 역할 전파에는 시간이 걸릴 수 있습니다. key나 연결 문자열을 해결책으로 추가하지 마세요. |
| Cosmos 429 | Cosmos DB 요청량/처리량, 해당 계정의 throttling 지표, 요청 발생 시각 | Cosmos 메트릭에서 throttling과 용량을 운영자가 확인합니다. 앱 SDK는 재시도를 구성하지만 지속적인 429는 할당 처리량/부하를 검토해야 합니다. |
| 저장 API 409 / ETag conflict | 같은 진행을 다른 요청이 동시에 수정했는지, 오래된 화면에서 저장했는지 | 앱을 새로고침해 서버의 최신 진행을 불러온 뒤 다시 시도합니다. 반복되면 요청 타이밍과 API 상태 코드만 확인하고 DB 문서를 수동 수정하지 않습니다. |
| 저장 API 423 / active lease | 같은 Entra 계정의 다른 브라우저/기기가 원정을 소유 중인지, 응답의 lease 만료 시각 | 기존 세션에서 계속 플레이하거나 15분 유휴 만료까지 기다립니다. 만료 후 새 세션이 lease를 인수합니다. 여러 기기에서 동시에 진행하지 않습니다. |
| schema version mismatch / `RUN_SCHEMA_UNSUPPORTED` | 문서 `schemaVersion`과 배포 코드가 지원하는 버전이 다른지, 롤백/혼합 배포가 있었는지 | 호환되는 앱 버전을 배포하거나 별도 데이터 마이그레이션을 계획합니다. 컨테이너 문서를 임의로 삭제하거나 버전을 수동 변경하지 않습니다. |

## 안전하게 로그 확인하기

App Service 로그와 브라우저 네트워크 패널에서는 요청 경로, 시각, HTTP 상태, 앱 오류 코드처럼 필요한 최소 정보만 공유합니다. `Authorization` 헤더, access token, id token, 사용자 원정 데이터, 전체 Cosmos 예외 객체는 복사·저장·공유하지 마세요. 문제가 지속되면 민감 값을 제거한 오류 코드와 시각을 회사 Azure 운영자에게 전달하세요.
