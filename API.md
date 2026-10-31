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

서버는 기존 음식 카드의 20개 메뉴와 코사인 유사도를 사용해 상위 5개를 저장·반환합니다.
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
- 날짜는 YYYY-MM-DD 달력 날짜이며 UTC 변환 없이 보내세요.
  과거·미래 날짜도 지원하고 추천 생성일과 선정 날짜는 달라도 됩니다.
- 다른 계정의 기록 또는 없는 기록은 404, 추천에 없는 메뉴·잘못된 날짜/끼니는 400.
- 클라이언트가 보낸 메뉴 이름은 사용하지 않고 저장된 추천 결과의 이름을 가져옵니다.
- 응답(200):

```json
{"date":"2026-10-31","meal":"lunch","selection":{"recordId":"...","menuId":"...","name":"짜장면","selectedAt":"2026-10-31T11:00:00.000Z"}}
```

## GET /api/selections?from=2026-10-01&to=2026-10-31

로그인한 계정의 선정 목록. 양끝 날짜 포함, 최대 366일, 최신 날짜부터 반환합니다.
기록 없는 날짜도 세 끼니를 null로 반환합니다. 날짜 범위가 역순이거나 너무 크면 400.

```json
{"from":"2026-10-31","to":"2026-10-31","days":[{"date":"2026-10-31","meals":{"breakfast":null,"lunch":{"recordId":"...","menuId":"...","name":"짜장면","selectedAt":"2026-10-31T11:00:00.000Z"},"dinner":null}}]}
```

프론트 연결 순서:
1. 날짜·끼니의 `+ 추천`에서 추천 화면으로 이동하며 date와 meal을 유지.
2. 추천 응답의 recordId와 선택 메뉴의 menuId로 PUT 호출.
3. 저장 성공 후 GET을 다시 호출해 날짜 목록 갱신. 새로고침 시에도 GET 호출.
4. `다시하기`는 새 requestId로 새 추천만 생성. 기존 선정은 새 메뉴 선정 전까지 유지.

선정은 별도 `selections` 컬렉션에 저장됩니다. 선정·교체가 기존 추천 이력을 변경하지 않습니다.
선정 취소/삭제 API와 화면 버튼 구현은 이번 범위에 포함되지 않습니다.

## 개발 참고

PowerShell 테스트는 `-WebSession`으로 쿠키를 유지해야 합니다.
PowerShell의 쿠키와 브라우저의 쿠키는 서로 다릅니다.
프론트가 다른 도메인에 배포되면 CORS와 쿠키 정책을 별도로 설계해야 합니다.
DB 컬렉션은 `recommendations`이며 날짜 조회 인덱스는
`{userId:1,recordDate:1,createdAt:-1,_id:-1}`입니다.
인증 초기화 시 인덱스를 자동 생성합니다. `_id` 고유 인덱스가 중복 저장을 방지합니다.
