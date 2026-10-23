# 문제 해결

## Entra 로그인

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| 로그인 설정 화면이 표시됨 | `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID` 설정 여부 | 저장소 루트 `.env`에 SPA 앱 등록의 두 공개 식별자를 입력하고 Vite를 다시 시작합니다. |
| Entra `redirect_uri_mismatch` | 브라우저 주소의 scheme, host, port와 SPA 앱 등록 URI | 현재 주소의 origin 전체를 앱 등록의 SPA redirect URI에 추가합니다. localhost의 port도 일치해야 합니다. |
| 로그인이 끝난 뒤 앱으로 돌아오지 않음 | 계정 선택, Conditional Access 정책, redirect URI의 등록 유형 | 회사 로그인 정책을 확인하고, Entra 앱 등록에 현재 origin이 SPA 플랫폼 URI로 등록됐는지 확인합니다. |

## 진행 상황 저장

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| 브라우저 새로고침 뒤 원정이 사라짐 | 로그인 계정이 달라졌는지, 사이트의 localStorage가 삭제/차단되었는지 | 동일한 Entra 계정과 브라우저를 사용하고 사이트 저장소 사용을 허용합니다. 브라우저 데이터를 삭제하면 저장된 원정도 지워질 수 있습니다. |
| 진행 저장 경고가 나타남 | 브라우저의 사이트 저장소/개인정보 보호 설정 | 현재 세션은 계속할 수 있지만 새로고침이나 브라우저 종료 시 진행이 사라질 수 있습니다. 브라우저가 사이트 저장을 허용하는지 확인하세요. |
| 다른 기기에서 같은 진행이 보이지 않음 | 현재 저장이 브라우저별 localStorage인지 | 현재는 기기 간 동기화를 제공하지 않습니다. Cosmos 기반 랭킹은 후속 기능이며 개인 진행을 복원하는 용도가 아닙니다. |

## Azure 배포

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| `/api/health`에 연결되지 않음 | App Service 상태, startup command, Node.js 24 LTS, `PORT` 사용 | startup command가 `npm start`인지 확인하고 App Service 로그에서 시작 오류를 살펴봅니다. |
| Azure 사이트에서 Entra 로그인이 실패함 | 빌드 당시 `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, 운영 origin redirect URI | 운영 origin을 SPA 앱 등록에 추가하고, 올바른 값으로 프런트엔드를 다시 빌드해 ZIP을 재배포합니다. App Service 설정 변경만으로 기존 번들은 바뀌지 않습니다. |

로그나 브라우저 네트워크 패널을 공유할 때는 요청 경로, 시각, HTTP 상태, 오류 코드처럼 필요한 최소 정보만 남기세요. `Authorization` 헤더, access token, ID token, 사용자 원정 payload 또는 비밀 값을 복사·저장·공유하지 마세요.
