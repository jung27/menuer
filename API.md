# 메뉴 추천 API

같은 Next.js 사이트에서 상대 주소로 호출합니다. 추천 저장과 기록 조회에는 로그인이
필요합니다(미로그인: 401). 로그인 시 발급되는 HttpOnly 쿠키 `menuer_session`으로
서버가 계정을 확인합니다. 다른 브라우저에서도 같은 계정으로 로그인하면 기록을 볼 수 있습니다.
회원가입·로그인 계약은 `AUTH.md`를 참고하세요. 기존 익명 기록은 보존하며 자동 이전하지 않습니다.

## POST /api/recommendations

### 음식 카드 화면 (현재 프론트)

`/food-card`는 이 API에 `tasteScores`를 전송합니다. 각 음식 카드의 상호작용으로
계산한 0~1 취향 점수이며 밀리초가 아닙니다. 한글 감각 이름은 아래 영문 키로 변환합니다.

```json
{"requestId":"추천별 UUID","tasteScores":{"spicy":0.2,"sweet":0.1,"salty":0.3,"oily":0.5,"soupy":0,"crispy":0.5}}
```

서버는 추천 후보 49개와 코사인 유사도를 사용해 상위 5개를 저장·반환합니다. 상호작용 카드 20개는 그대로이며, 추천 전용 후보는 `lib/food-catalog.ts`에서 관리합니다. 기존 기록은 변경하지 않고 새 추천 요청부터 반영합니다.

추가 메뉴의 6가지 감각 점수는 주관적인 MVP 초깃값으로, 팀 검토 후 조정할 수 있습니다. `interactionMs` 방식에도 추가 후보를 반영하되 기존 메뉴 ID와 상위 3개 응답 형식은 유지합니다.

안암 메뉴 참고 자료 (2026-10-31 확인):
- 참치김밥·치즈라볶이: [이공김밥 안암본점](https://www.koreatriptips.com/dining/2839255.html)
- 설렁탕·수육: [동우설렁탕 본점](https://www.ktourmap.com/spotDetails.jsp?contentId=2839112)
- 꿔바로우: [용초수](https://www.diningcode.com/profile.php?rid=gi31dlTbKUTQ)
- 토마토계란볶음면: [용초수 방문 기록](https://sensack.tistory.com/entry/안암역-맛집-용초수-꿔바로우)

식당 자료는 메뉴 후보 선정에만 사용했습니다. 참치김밥·치즈라볶이·토마토계란볶음면은 각각 김밥·라볶이·볶음면으로 일반화하고, 새우볶음밥은 볶음밥으로 표시합니다. 간장치킨은 기존 치킨 후보로 통합합니다. 식당별 맛을 실측한 점수나 실시간 판매·영업 정보는 아니며, API는 기존처럼 음식 이름을 반환합니다.
`score`는 0~100 유사도 점수입니다. 응답의 `inputKind`는 `tasteScores`,
`mode`는 `cosine`이며 `interactionMs`와 `totalInteractionMs`는 null입니다.
원래 점수는 `tasteScores`, 합계로 정규화한 값은 `ratios`에 저장합니다.
두 입력 방식은 한 요청에서 함께 보낼 수 없습니다. 전체 점수가 0이면 400입니다.
아래 시간 입력 방식은 기존 API 호환을 위해 유지합니다.

### 감각 시간 입력 (이전 방식)

```json
{
  "requestId": "추천 시도마다 생성한 UUID",
  "interactionMs": {
    "spicy": 5000,
    "sweet": 1000,
    "salty": 2000,
    "oily": 3000,
    "soupy": 7000,
    "crispy": 2000
  }
}
```

- 시간은 0 이상의 밀리초 숫자입니다. 생략한 감각은 0으로 처리합니다.
- 총시간이 0이면 400입니다. 비율은 항목 시간 / 총시간으로 계산합니다.
- 200 응답: `recordId`, `requestId`, `saved: true`, `createdAt`(UTC),
  `recordDate`(Asia/Seoul 날짜), `interactionMs`, `totalInteractionMs`,
  `ratios`(0~1), `recommendations`(상위 3개), 알고리즘/메뉴 데이터 버전.
- 추천 점수는 예시 메뉴 속성에 관심 비율을 곱한 합계로, 만족 확률이 아닙니다.
- 재시도는 같은 계정과 같은 requestId를 사용하세요. 기존 결과를 반환합니다.
- 같은 requestId에 다른 입력을 보내면 409입니다. 새로운 추천에는 새 ID를 쓰세요.
- 저장 실패는 503입니다. 실패한 결과를 저장 완료로 표시하지 마세요.
- 로그인 성공 후 요청하세요. 버튼 중복 클릭을 막고, 네트워크 오류 시 requestId를 유지하세요.

## GET /api/records?date=2026-11-01

로그인한 계정의 해당 한국 날짜 기록을 최신순으로 조회합니다.

```json
{"date":"2026-11-01","records":[],"nextOffset":null}
```

최대 100개씩 반환합니다. nextOffset이 숫자이면 같은 date와
`&offset=반환값`으로 다음 목록을 요청하세요. 새 기록이 추가되면 첫 목록부터
새로 조회하세요. 실제로 존재하지 않는 날짜는 400입니다.

## GET /api/health/db

DB 연결 성공은 200과 `{"ok":true,"database":"connected"}`,
연결 실패는 503입니다. 접속 정보는 반환하지 않습니다.

## PUT /api/selections — 메뉴로 선정

로그인 필수. 본인 추천 결과의 메뉴 중 하나를 한국 날짜와 끼니에 선정합니다.

```json
{"recordId":"추천 응답의 recordId","menuId":"추천 메뉴의 menuId","date":"2026-10-31","meal":"lunch"}
```

- meal: `breakfast`(아침), `lunch`(점심), `dinner`(저녁).
- 같은 계정·날짜·끼니에는 하나만 저장되며, 재선정하면 교체됩니다.
- 연속 요청은 DB에서 마지막으로 처리한 선택이 남습니다. 프론트는 저장 중 버튼을 비활성화하세요.
- 날짜는 YYYY-MM-DD 한국 달력 날짜이며 UTC 변환 없이 보내세요.
  **오늘만 선정/교체할 수 있습니다.** 지난 날짜는 409 `DAY_CLOSED`, 미래는 400 `FUTURE_DATE`입니다.
  선택은 즉시 저장됩니다. 한국 시간 자정 이후 과거 기록은 읽기 전용이며 별도 예약 저장 작업은 없습니다.
- 다른 계정의 기록 또는 없는 기록은 404, 추천에 없는 메뉴·잘못된 날짜/끼니는 400.
- 클라이언트가 보낸 메뉴 이름은 사용하지 않고 저장된 추천 결과의 이름을 가져옵니다.
- 응답(200):

```json
{"date":"2026-10-31","meal":"lunch","selection":{"recordId":"...","menuId":"...","name":"짜장면","selectedAt":"2026-10-31T11:00:00.000Z"}}
```

## GET /api/selections?from=2026-10-01&to=2026-10-31

로그인한 계정의 **지난 날짜 선정 목록**. 요청 범위는 양끝 포함 최대 366일이며,
오늘/미래는 제외하고 최신 날짜부터 반환합니다. 범위가 오늘/미래뿐이면 days는 빈 배열입니다.
과거의 기록 없는 날짜도 세 끼니를 null로 반환합니다. 날짜 범위가 역순이거나 너무 크면 400.
응답에는 서버의 한국 날짜 `today`와 다음 자정 UTC 시각 `closesAt`도 포함됩니다.

```json
{"from":"2026-10-31","to":"2026-10-31","days":[{"date":"2026-10-31","meals":{"breakfast":null,"lunch":{"recordId":"...","menuId":"...","name":"짜장면","selectedAt":"2026-10-31T11:00:00.000Z"},"dinner":null}}]}
```

위 예시는 한국 날짜가 2026-11-01 이후일 때의 지난 기록입니다.

## GET /api/selections/today

로그인한 계정의 오늘 선택. 화면을 새로고침해도 즉시 저장된 선택을 복원할 수 있습니다.

```json
{"date":"2026-10-31","closesAt":"2026-10-31T15:00:00.000Z","meals":{"breakfast":null,"lunch":null,"dinner":null}}
```

`date`는 한국 날짜, `closesAt`은 그 날짜 종료 시각입니다. 선택한 끼니에는 메뉴 객체가 들어갑니다.

프론트 연결 순서:
0. 오늘 영역은 GET /api/selections/today, 지난 기록은 범위 조회로 분리.
1. 날짜·끼니의 `+ 추천`에서 추천 화면으로 이동하며 date와 meal을 유지.
2. 추천 응답의 recordId와 선택 메뉴의 menuId로 PUT 호출.
3. 저장 성공 후 오늘 API를 다시 호출. 새로고침 시 오늘/지난 기록을 모두 조회.
4. `다시하기`는 새 requestId로 새 추천만 생성. 기존 선정은 새 메뉴 선정 전까지 유지.
5. closesAt 시각이 되거나 탭이 다시 활성화되면 오늘/지난 기록을 재조회하고 지난 날짜 수정 버튼을 숨김.
6. 자정이 지난 뒤 예전 화면에서 선정해 DAY_CLOSED를 받으면 오늘 날짜를 다시 조회하여 안내.

선정은 별도 `selections` 컬렉션에 저장됩니다. 선정·교체가 기존 추천 이력을 변경하지 않습니다.
선정 취소/삭제 API와 화면 버튼 구현은 이번 범위에 포함되지 않습니다.

## 개발 참고

PowerShell 테스트는 `-WebSession`으로 쿠키를 유지해야 합니다.
PowerShell의 쿠키와 브라우저의 쿠키는 서로 다릅니다.
프론트가 다른 도메인에 배포되면 CORS와 쿠키 정책을 별도로 설계해야 합니다.
DB 컬렉션은 `recommendations`이며 날짜 조회 인덱스는
`{userId:1,recordDate:1,createdAt:-1,_id:-1}`입니다.
인증 초기화 시 인덱스를 자동 생성합니다. `_id` 고유 인덱스가 중복 저장을 방지합니다.

## 서버 오류 추적

예상하지 못한 서버 오류에는 `error.code`, `error.errorId`, `error.message`가 포함됩니다. 화면의 오류 ID와 서버 터미널의 `server_failure` JSON 로그의 `errorId`가 일치합니다. API는 `X-Error-Id` 헤더도 반환합니다.

- `DB_AUTH_FAILED`: DB 계정 인증 실패. 서버의 DB 사용자/비밀번호 설정 확인.
- `DB_CONFIG_INVALID`: 환경변수 누락 또는 연결 URI 형식 오류.
- `DB_DNS_FAILED`: DB 호스트 주소 조회 실패. 주소와 서버 DNS/네트워크 확인.
- `DB_CONNECTION_FAILED`: DB 네트워크 연결 실패.
- `DB_TIMEOUT`: DB 연결 또는 응답 시간 초과. Atlas IP 허용 목록, 네트워크, DB 상태 확인. 접속자 수가 원인이라고 단정하지 않습니다.
- `DB_OPERATION_FAILED`: 그 밖의 MongoDB 처리 실패.
- `INTERNAL_ERROR`: 그 밖의 서버 내부 오류(500).

서버 로그의 `operation`은 login/signup/logout/session/recommendation/records/selection-save/selections/today/db-health/food-card 중 실패 지점을 나타냅니다. 오류 원문·스택·접속 URI·이메일·쿠키·요청 본문은 기록하지 않습니다. 잘못된 로그인(401), 입력 오류(400), 횟수 제한(429) 등 예상된 오류는 기존 응답을 유지합니다.

추천 저장 중 오류가 나면 저장 완료 여부가 불확실할 수 있으므로 같은 requestId로 재시도합니다. 오류 ID는 추천 requestId와 별개입니다.

검증: `node --experimental-strip-types tests/server-failure.check.mjs`
