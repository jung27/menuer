# 손마카세 · Sonmakase

**오늘 뭐 먹지? 손끝으로 느끼고, 오늘의 메뉴를 고르세요.**

손마카세는 3D 음식 카드와 상호작용하며 먹고 싶은 감각을 표현하는 메뉴 추천 웹 서비스입니다. 한식·중식이나 밥·면을 직접 선택하는 대신, 카드를 누르고 당기고 부수는 행동을 추천 입력으로 사용합니다.

[서비스 이용하기](https://menuer-pied.vercel.app/)

## 기획 의도

먹고 싶은 음식의 이름은 떠오르지 않아도, 바삭한 식감이나 따뜻한 국물은 생각날 수 있습니다. 손마카세는 이런 감각을 직접 탐색하고 메뉴 선택으로 연결합니다. 음식마다 다른 시각 효과와 소리를 제공해 추천을 받는 과정 자체도 즐길 수 있도록 만들었습니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 3D 음식 카드 | 음식의 질감에 따라 누르기·당기기·부수기에 다르게 반응 |
| 감각 피드백 | 음식별 효과음과 지원되는 모바일 환경의 진동 |
| 감각 기반 추천 | 매운맛·단맛·짠맛·기름짐·국물·바삭함을 반영한 메뉴 순위 |
| 무작위 카드 구성 | 다양한 음식군을 탐색할 수 있도록 카드와 순서를 무작위 구성 |
| 계정별 식사 기록 | 날짜와 아침·점심·저녁별 메뉴 저장 및 오늘의 메뉴 재선정 |
| 사용자 지정 음식 | 음식의 감각 속성과 카드 표현을 설정하고 추천에 포함 |
| 공유 | 선택한 음식과 하루 식사 기록을 링크로 공유 |

## 이용 흐름

1. 회원가입 후 로그인합니다.
2. 메뉴 추천을 시작하고 음식 카드와 상호작용합니다.
3. 상단 감각 게이지의 변화를 확인하며 다음 카드를 탐색합니다.
4. 추천 결과에서 원하는 메뉴를 선정합니다.
5. 식사 기록에서 선택한 메뉴를 확인하고, 오늘의 메뉴를 다시 고르거나 공유합니다.

## 추천 원리

음식은 여섯 가지 감각의 0~1 속성값을 갖습니다. 카드와 상호작용하면 사용자 감각 점수가 해당 음식의 속성값 방향으로 이동합니다.

```text
변경된 사용자 점수 = 기존 점수 + 상호작용 가중치 × (음식 속성 − 기존 점수)
```

서버는 전달받은 사용자 감각 벡터와 추천 후보 음식의 벡터를 코사인 유사도로 비교하고 상위 5개를 반환합니다. 화면에서 탐색한 카드만이 아니라 전체 추천 후보를 비교합니다.

- 카드 내부의 음식 속성과 사용자의 누적 감각 점수는 서로 다른 값입니다.
- 현재 카드 입력은 단순히 전체 상호작용 시간을 나눈 비율이 아닙니다.
- 음식 속성값은 MVP용으로 설정한 값이며, 추천 점수는 만족 확률이나 정확도가 아닙니다.
- 별도 AI 학습 모델이나 OpenAI API 없이 벡터 비교로 동작합니다.
- 사용자 지정 음식의 추천 포함 설정은 후보 포함 여부이며, 최종 상위 추천을 보장하지 않습니다.

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| 웹·서버 API | Next.js App Router, React, TypeScript |
| 3D 인터랙션 | Three.js, React Three Fiber, Drei |
| 스타일 | Tailwind CSS |
| 데이터베이스 | MongoDB |
| 인증 | 서버 세션, HttpOnly 쿠키, scrypt 비밀번호 해싱 |
| 배포 | Vercel |

브라우저와 API는 같은 Next.js 애플리케이션에서 실행됩니다. MongoDB 접속 정보는 서버 환경변수로만 사용합니다.

## 로컬 실행

### 1. 준비

- Node.js 22 LTS와 npm
- MongoDB 연결 URI와 사용할 데이터베이스 이름
- MongoDB Atlas 사용 시 DB 사용자와 실행 환경의 IP 접근 허용 설정

```bash
git clone https://github.com/jung27/menuer.git
cd menuer
npm ci
```

Windows PowerShell에서 npm 실행 정책 오류가 발생하면 `npm` 대신 `npm.cmd`를 사용하세요.

### 2. 환경변수

`package.json`과 같은 위치에 `.env.local`을 만듭니다.

```dotenv
MONGODB_URI="mongodb+srv://YOUR_DB_USER:YOUR_URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/"
MONGODB_DB="menuer"
```

예시 값을 실제 DB 설정으로 교체하세요. 비밀번호에 URI 특수문자가 있다면 URL 인코딩해야 합니다. `.env.local`은 Git에 올리지 않으며, 환경변수를 변경한 뒤에는 개발 서버를 재시작합니다.

### 3. 서버 시작

```bash
npm run dev
```

[로컬 서비스](http://localhost:3000)를 엽니다. 포트가 사용 중이라면 터미널에 표시된 주소를 확인하세요.

[DB 연결 확인](http://localhost:3000/api/health/db)에서 다음 응답이 나오면 연결된 상태입니다.

```json
{"ok":true,"database":"connected"}
```

## 개발 명령어

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드 및 타입 검사
npm run start     # 빌드 결과 실행
npm run lint      # ESLint 검사
```

로직별 검사 파일은 `tests/`에 있습니다. 예를 들어 다음 명령으로 서버 오류 분류와 하루 공유 로직을 검사할 수 있습니다.

```bash
node --experimental-strip-types tests/server-failure.check.mjs
node --experimental-strip-types tests/daily-share.test.mjs
```

## 프로젝트 구조

```text
app/
  api/              인증·추천·기록·선정·사용자 지정 음식 API
  food-card/        카드 탐색 화면과 감각 점수 계산
components/         공통 UI와 3D 카드 컴포넌트
features/           사용자 지정 음식 등 기능별 코드
lib/                DB 연결, 인증, 추천·기록 처리
public/             이미지·효과음 등 정적 파일
tests/              기능별 검증 코드
```

## 주요 API

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 로그인 계정 확인 |
| POST | `/api/recommendations` | 추천 생성 및 이력 저장 |
| GET | `/api/records` | 날짜별 추천 이력 조회 |
| PUT | `/api/selections` | 오늘의 끼니별 메뉴 선정·교체 |
| GET | `/api/selections` | 지난 날짜의 선정 목록 조회 |
| GET | `/api/selections/today` | 오늘의 선정 메뉴 조회 |
| GET | `/api/selections/today/share` | 오늘의 식사 공유 데이터 조회 |
| GET | `/api/health/db` | DB 연결 상태 확인 |

상세 요청·응답은 [API.md](API.md), 인증 연동은 [AUTH.md](AUTH.md)를 참고하세요.

## 데이터와 동작 기준

- 추천·식사 기록은 로그인한 계정에 연결됩니다.
- 식사 선정은 즉시 저장됩니다. 날짜 기준은 `Asia/Seoul`이며 지난 날짜는 읽기 전용입니다.
- 동일 계정·날짜·끼니에서 다시 선정하면 기존 선택을 교체합니다.
- 추천 요청 재시도에는 같은 `requestId`를 사용하고, 새로운 추천에는 새 ID를 사용합니다.
- 공유 링크는 공유 당시의 정보를 담으며 이후 기록 변경이 기존 링크에 반영되지는 않습니다.
- 진동은 기기·브라우저 설정에 따라 달라집니다. 지원되는 안드로이드 브라우저에서 확인하며, iPhone에서는 제공되지 않습니다.

## 배포

Vercel 프로젝트에 저장소를 연결하고 서버 환경변수 `MONGODB_URI`, `MONGODB_DB`를 등록합니다. MongoDB 접근 설정을 확인한 뒤 배포합니다. 로컬 `.env.local` 파일은 자동으로 배포되지 않습니다.

## 팀

임태원 · 정재선 · 이정민 · 신지환
