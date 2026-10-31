# 계정 API / 프론트 연결 안내

프론트와 API가 같은 Next.js 사이트에서 실행되는 구성이 기본입니다.
별도 패키지 설치나 환경변수 추가 없이 기존 MongoDB 설정을 사용합니다.

## 회원가입

`POST /api/auth/signup`, Content-Type: application/json

```json
{"email":"user@example.com","password":"10자 이상 실제 비밀번호","nickname":"메뉴고민중"}
```

- 이메일: 공백 제거·소문자로 정규화, 최대 254자, DB 고유 인덱스로 중복 방지.
- 비밀번호: 10~128자. 공백을 임의 제거하거나 자르지 않습니다.
- 닉네임: 양끝 공백 제거 후 1~30자.
- 성공: 201 `{"user":{"id":"...","email":"...","nickname":"..."}}`.
- 회원가입 직후 자동 로그인하지 않습니다. 로그인 화면으로 이동하세요.

## 로그인

`POST /api/auth/login`

```json
{"email":"user@example.com","password":"가입한 비밀번호"}
```

성공: 200과 회원가입과 같은 user 객체. 서버가 `menuer_session` 쿠키를 설정합니다.
쿠키는 HttpOnly, SameSite=Lax이며 프로덕션 HTTPS에서 Secure를 사용합니다.
유효기간은 로그인 시점부터 7일이며 만료 후 재로그인이 필요합니다.
클라이언트는 토큰을 localStorage에 저장하거나 userId를 요청에 추가할 필요가 없습니다.
기존 로그인 쿠키가 있다면 로그인 성공 시 그 세션을 폐기하고 새 세션으로 교체합니다.

```ts
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const result = await response.json();
if (!response.ok) {
  // result.error.message를 표시
} else {
  // 로그인 사용자 표시 후 /food-card로 이동
}
```

## 로그인 상태 확인 / 로그아웃

- `GET /api/auth/me`: 200 `{user: ...}`, 미로그인·만료는 401.
- `POST /api/auth/logout`: 본문 불필요. 서버 세션과 쿠키를 폐기하고 200 `{ok:true}`.
- 화면 로드 시 me로 로그인 상태를 확인하세요. 503은 서버 장애이며 미로그인으로 취급하지 마세요.
- 로그아웃 성공 시 프론트의 사용자·기록 상태를 비우세요. 다른 기기 세션은 유지됩니다.

## 기록 연결

`POST /api/recommendations`, `GET /api/records`는 로그인이 필요합니다.
서버 세션에서 얻은 userId로 저장·조회하므로 다른 계정의 기록에 접근할 수 없습니다.
계정을 전환하면 프론트의 이전 추천 결과와 requestId도 초기화하세요.
기존 익명 기록은 DB에 남아 있지만 계정에 자동으로 연결하지 않습니다.
`/food-card/api/recommend`는 이전 프론트의 비저장 계산 API입니다.
계정별 저장 기능에는 반드시 `/api/recommendations`를 사용하세요.

## 공통 오류

```json
{"error":{"code":"INVALID_CREDENTIALS","message":"이메일 또는 비밀번호가 올바르지 않아요."}}
```

| 상태 | 의미 |
|---|---|
| 400 | JSON·이메일·비밀번호·닉네임 입력 오류 |
| 401 | 로그인 정보 불일치, 미로그인 또는 세션 만료 |
| 403 | 다른 Origin에서의 변경 요청 |
| 409 | 이메일 중복 또는 requestId에 다른 입력 재사용 |
| 415 | 인증 요청의 Content-Type이 application/json이 아님 |
| 429 | 이메일별 가입·로그인 합계가 15분 고정 구간 내 10회 초과 |
| 503 | DB 등 일시적인 서비스 오류 |

가입·로그인 제한은 MongoDB에서 관리하며 여러 서버 인스턴스가 공유합니다.
공개 배포 시에는 플랫폼의 IP 기반 요청 제한도 함께 적용하세요.
인증 변경 요청은 같은 Origin만 허용합니다. 브라우저 외 클라이언트는 Origin 없이 테스트 가능합니다.

## 저장 및 테스트

- users: 이메일, 닉네임, scrypt 해시(랜덤 salt, N=131072/r=8/p=1), 가입일.
- sessions: 랜덤 세션 토큰의 SHA-256 해시, userId, 만료 시각.
- 세션 TTL 삭제와 별개로 매 요청에서 만료를 확인합니다.
- 비밀번호 원문과 세션 토큰 원문은 DB에 저장하지 않고 API 응답에도 포함하지 않습니다.
- 이메일 소유 인증, 비밀번호 재설정, 익명 기록 이전은 이번 범위에 포함되지 않습니다.
- `node tests/auth.integration.mjs`: 실행 중인 localhost:3000과 현재 DB로 통합 테스트합니다.
  테스트용 계정·기록·세션을 만들고 테스트 종료 시 해당 데이터만 삭제합니다.
