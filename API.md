# 메뉴 추천 API

같은 Next.js 사이트에서 상대 주소로 호출합니다. 브라우저가 HttpOnly 쿠키
`menuer_visitor`를 자동으로 보내며, 서버는 쿠키로 본인 기록을 구분합니다.
쿠키를 삭제하거나 다른 브라우저를 사용하면 기존 기록을 조회할 수 없습니다.
이 방식은 기기 간 동기화나 로그인 계정 복구를 제공하지 않습니다.

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
- 재시도는 같은 쿠키와 같은 requestId를 사용하세요. 기존 결과를 반환합니다.
- 같은 requestId에 다른 입력을 보내면 409입니다. 새로운 추천에는 새 ID를 쓰세요.
- 저장 실패는 503입니다. 실패한 결과를 저장 완료로 표시하지 마세요.
- 첫 요청에서 쿠키가 설정됩니다. 최초 요청을 병렬로 보내지 말고 응답을 기다리세요.
  버튼 중복 클릭을 막고, 네트워크 오류 시 requestId를 유지하세요.

## GET /api/records?date=2026-11-01

현재 브라우저의 해당 한국 날짜 기록을 최신순으로 조회합니다.

```json
{"date":"2026-11-01","records":[],"nextOffset":null}
```

최대 100개씩 반환합니다. nextOffset이 숫자이면 같은 date와
`&offset=반환값`으로 다음 목록을 요청하세요. 새 기록이 추가되면 첫 목록부터
새로 조회하세요. 실제로 존재하지 않는 날짜는 400입니다.

## GET /api/health/db

DB 연결 성공은 200과 `{"ok":true,"database":"connected"}`,
연결 실패는 503입니다. 접속 정보는 반환하지 않습니다.

## 개발 참고

PowerShell 테스트는 `-WebSession`으로 쿠키를 유지해야 합니다.
PowerShell의 쿠키와 브라우저의 쿠키는 서로 다릅니다.
프론트가 다른 도메인에 배포되면 CORS와 쿠키 정책을 별도로 설계해야 합니다.
DB 컬렉션은 `recommendations`이며 날짜 조회 인덱스는
`{visitorId:1,recordDate:1,createdAt:-1,_id:-1}`입니다.
새 DB에서는 이 인덱스를 생성하세요. `_id` 고유 인덱스가 중복 저장을 방지합니다.
