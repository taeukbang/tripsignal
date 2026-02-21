# CLAUDE.md — MyTripSignal

향후 3~6개월간 출발일별 총 여행 비용(직항 왕복 항공 + 도심 3성급 숙소)을 캘린더 히트맵과 꺾은선 그래프로 보여주고, 3~7일 여정 길이를 조절하며 최적 출발일을 탐색할 수 있는 서비스. **성인 2인 기준, 1인당 비용**으로 표시.

---

## PRD

이 프로젝트의 제품 요구사항 문서: `docs/PRD.md`

---

## 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Frontend | Next.js 15 (React 19, App Router) | SSR/SSG, SEO 최적화 |
| 스타일링 | Tailwind CSS 4 | 유틸리티 기반 CSS |
| Backend | Next.js API Routes | API 프록시, 가격 계산 |
| Database | Supabase (PostgreSQL) | 가격 히스토리 저장, `@supabase/supabase-js` |
| 배치 | GitHub Actions + `npx tsx` 스크립트 | 일일 가격 데이터 수집 |
| 호스팅 | Vercel | 자동 배포, ISR 지원 |
| 언어 | TypeScript | 타입 안전성 |

---

## 외부 데이터 소스 (실제 검증된 스펙)

### 항공: `/flight/api/price/calendar/window`

| 항목 | 값 |
|------|-----|
| 메서드 | POST `api3.myrealtrip.com/flight/api/price/calendar/window` |
| 인증 | 불필요 |
| 핵심 파라미터 | `departureCity: "ICN"`, `arrivalCity: "CDG"`, `departureDate: "2026-02-19"`, `period: 5` (여정 일수 3~7), `airlines: ["ALL"]`, `transfer: 0` (직항) |
| 응답 필드 | `flightWindowInfoResults[].departureDate`, `.arrivalDate`, `.airline`, `.totalPrice` (1인 왕복가) |
| 특성 | 여정별 직항 왕복 정확가. **전 period(3~7) 수집하여 합집합**으로 날짜 커버리지 극대화 |

**수집 전략:** 도시당 5회 호출 (period=3,4,5,6,7). 각 period마다 ~23~181일 반환. 합집합으로 중복 제거 시 최저가 유지.

**수집 커버리지 (2026-02-19 기준):**
- 파리: 121일 (period=7 단독 60일, 3~7 합집합 121일)
- 도쿄: 181일 (거의 매일)
- 방콕: 158일

### API 선택 배경 (2026-02-19 검증)

**Oracle `TB_AIR_LOWEST_PRICE` 테이블 구조:**
- PK: `(FROM_CITY, TO_CITY, PERIOD, DEPARTURE_DATE)` — 출발일×여정당 1건만 저장
- 배치가 `transfer: -1`로 동기화 → 경유가 직항보다 싸면 직항 데이터가 밀려남
- `transfer=0` 조회 시 직항 행이 없는 날짜는 결과에서 빠짐

**파리 직항 현실:** ICN→CDG 직항은 KE/OZ/AF/TW가 매일 운항하지만, Oracle 테이블에 경유 최저가만 저장된 날짜는 직항 조회 시 빠짐. 이는 MRT 플랫폼의 재고/가격 한계이며 실제 항공편 부재가 아님.

**`/calendar` API 비교:** DynamoDB 실시간 조회로 189일 반환 가능하지만, 여정 길이별 정확 왕복가가 아님 (`departureDate` 파라미터에 따라 같은 날짜 가격이 달라짐). `/calendar/window`가 여정별 정확 왕복가를 제공하므로 이를 사용.

### 숙소: `/unionstay/v2/front/search`

| 항목 | 값 |
|------|-----|
| 메서드 | GET `api3.myrealtrip.com/unionstay/v2/front/search` |
| 인증 | 불필요 (Origin 헤더 필요: `https://accommodation.myrealtrip.com`) |
| 핵심 파라미터 | `keyword` (도시 한글명), `regionId`, `checkIn`, `checkOut`, `adultCount=2`, `isDomestic=false`, `selected=starRating:threestar,stayPoi:{downtownPoiId}` |
| 응답 위치 | `data.dynamicArea.sections[].loggingMeta.BIZLOG.data` |
| 가격 필드 | `item_price` (세금포함 1박가, 원), `item_name` (호텔명), `item_grade` (성급) |
| 특성 | 1회 호출로 ~20개 호텔 반환. 4박 검색 기준으로 수집, `item_price`는 이미 1박 가격 (나누기 불필요) |

**주의:** 구 API `search/map/v2/search`는 데이터를 반환하지 않음. 반드시 `/unionstay/v2/front/search` 사용. `selected` 파라미터로 3성급 + 도심 지역 필터 동시 적용.

---

## 도시 데이터 (20개)

### 동아시아

| 도시 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|:---:|:---:|------|
| 도쿄 | NRT (나리타) | 6139291 | 14048 | 신주쿠 |
| 오사카 | KIX (간사이) | 0 | 85637 | 미나미 |
| 후쿠오카 | FUK (후쿠오카) | 0 | 87056 | 하카타구 |
| 삿포로 | CTS (신치토세) | 0 | 39320 | 추오쿠 |
| 타이베이 | TPE (타오위안) | 0 | 42051 | 중산 |
| 홍콩 | HKG (홍콩) | 75 | 96872 | 야우침몽 |

### 동남아시아

| 도시 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|:---:|:---:|------|
| 방콕 | BKK (수완나품) | 524 | 118873 | 방콕 도심 |
| 다낭 | DAD (다낭) | 0 | 115391 | 손트라 |
| 호치민 | SGN (떤선녓) | 0 | 146768 | 1군 |
| 하노이 | HAN (노이바이) | 0 | 43948 | 호안끼엠 |
| 싱가포르 | SIN (창이) | 0 | 447717 | 싱가포르 시내 |
| 세부 | CEB (막탄세부) | 0 | 555867 | 라후그 |
| 발리 | DPS (응우라라이) | 0 | 79551 | 꾸따 우타라 |
| 나트랑 | CXR (깜라인) | 150047 | 447960 | 쩐푸 비치 |

### 유럽

| 도시 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|:---:|:---:|------|
| 파리 | CDG (샤를드 골) | 6139506 | 118971 | 파리 도심 센터 |
| 런던 | LHR (히드로) | 0 | 115750 | 런던 도심 |
| 로마 | FCO (피우미치노) | 0 | 118981 | 로마 역사 센터 |

### 미주/태평양

| 도시 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|:---:|:---:|------|
| 괌 | GUM (괌) | 0 | 43826 | 투몬 |
| 호놀룰루 | HNL (호놀룰루) | 0 | 40375 | 와이키키 |
| 뉴욕 | JFK (존 F. 케네디) | 0 | 11954 | 맨해튼 |

**regionId 참고:** regionId=0인 도시는 keyword 기반으로 검색/딥링크 동작. 수집 API는 keyword만으로 정상 동작.

---

## 프로젝트 구조

```
TripSignal/
├── CLAUDE.md                  # 프로젝트 지침 (이 파일)
├── docs/
│   └── PRD.md                 # 제품 요구사항 문서
├── package.json
├── next.config.ts
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── collect-prices.yml # 매일 KST 09:00 가격 수집
├── public/
└── src/
    ├── app/                   # Next.js App Router
    │   ├── layout.tsx         # 루트 레이아웃
    │   ├── page.tsx           # 메인 페이지 (CSR, 전체 상태 관리)
    │   ├── globals.css        # 글로벌 스타일 + 셀 클래스
    │   └── api/
    │       ├── cities/route.ts           # GET /api/cities
    │       └── prices/[cityId]/route.ts  # GET /api/prices/:cityId
    ├── components/
    │   ├── CitySelector.tsx   # 도시 선택 (3개 필 버튼)
    │   ├── DurationSlider.tsx # 3~7일 여정 슬라이더
    │   ├── PriceTrendChart.tsx # 가격 추이 꺾은선 그래프 (SVG + HTML 레이어)
    │   ├── PriceCalendar.tsx  # 월 넘기기 캘린더 히트맵 (핵심)
    │   ├── PriceBreakdown.tsx # 가격 분해 바텀시트 (항공사명/호텔명 표시)
    │   └── ui/
    │       ├── CalendarCell.tsx
    │       ├── PriceLabel.tsx
    │       └── HeatmapLegend.tsx
    ├── lib/
    │   ├── supabase.ts        # Supabase 클라이언트 (Service + Anon)
    │   ├── mrt-api.ts         # MRT API 래퍼 (fetchFlightWindow, fetchHotelSearch)
    │   ├── price-calculator.ts # 2인 기준 비용 계산, 인당 비용, 가격 라벨
    │   └── utils.ts           # 날짜, 포맷팅, sleep, 항공사명 매핑
    ├── scripts/
    │   ├── collect-flights.ts      # 항공 수집 (/calendar/window, 5일 여정)
    │   ├── collect-hotels.ts       # 숙소 수집 (/unionstay, 4박, 도심 필터)
    │   ├── collect-all.ts          # 통합 수집
    │   ├── discover-city-ids.ts    # 도시 regionId/downtownPoiId 탐색
    │   └── validate-data.ts        # 수집 데이터 품질 검증
    ├── data/
    │   └── cities.ts          # 도시 목록 (regionId, downtownPoiId 포함)
    └── types/
        └── index.ts           # TypeScript 타입 정의
```

---

## 개발 명령어

```bash
npm run dev              # 개발 서버 (http://localhost:3000)
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버
npm run lint             # ESLint 실행
```

### 데이터 수집 스크립트

```bash
npx tsx src/scripts/collect-flights.ts   # 항공 가격 수집 (3개 도시 x 7회 월별 = ~25초)
npx tsx src/scripts/collect-hotels.ts    # 숙소 가격 수집 (3개 도시 x 30일 = ~4분)
npx tsx src/scripts/collect-all.ts       # 전체 수집
```

**수집 커버리지:** 20개 도시 × 5 여정(3~7일) × 전체 기간. 도시별 커버리지는 `npx tsx src/scripts/validate-data.ts`로 확인.

**예상 수집 시간:** 항공 ~2분 (100회) + 숙소 ~13분 (600회) = 약 15분

---

## Supabase 스키마

```sql
CREATE TABLE flight_prices (
  city_id TEXT NOT NULL,
  departure_date DATE NOT NULL,
  duration INTEGER NOT NULL,       -- 여정 일수 (3, 4, 5, 6, 7)
  price INTEGER NOT NULL,          -- 1인 왕복가 (원)
  airline_code TEXT,               -- IATA 코드
  airline_name TEXT,               -- 항공사명 (수집 시 비어있고, API 라우트에서 매핑)
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (city_id, departure_date, duration)
);

CREATE TABLE hotel_prices (
  city_id TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  duration INTEGER NOT NULL,       -- 3, 4, 5, 6, 7
  min_price_per_night INTEGER NOT NULL,  -- 세금포함 1박가 (원)
  hotel_name TEXT,                 -- 최저가 호텔명
  hotel_count INTEGER,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (city_id, check_in_date, duration)
);
```

---

## 환경 변수 (.env)

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase 읽기 전용 키
SUPABASE_SERVICE_ROLE_KEY=       # Supabase 서비스 키 (수집 스크립트용)
```

---

## 핵심 비즈니스 로직

### 총 여행 비용 계산 (성인 2인 기준)

```
항공 2인 = 1인 왕복 최저가 × 2
숙소 N박 = 도심 3성급 최저가/박 × (여정일수 - 1)
2인 합계 = 항공 2인 + 숙소 N박
1인당 = 2인 합계 / 2
```

- 항공: `/calendar/window` API → 여정별(3~7일) 1인 왕복 직항 최저가. 슬라이더 변경 시 해당 duration의 항공가로 전환 (API 재호출 없음, 클라이언트에 전 duration 데이터 보유)
- 숙소: `/unionstay/v2/front/search` → 도심 3성급 최저가/박. 4박 기준 검색, `item_price` 그대로 사용
- 캘린더/그래프에 **1인당** 비용 표시
- 여정 길이 변경 시 숙소 N박만 재계산 (API 재호출 없음)

### 가격 라벨

| 분포 위치 | 라벨 | 셀 색상 |
|----------|------|--------|
| 하위 10% | "최저가 근처" | 블루 (#DBEAFE) + 펄스 |
| 하위 25% | "저렴한 편" | 연한 블루 (#EFF6FF) |
| 25~75% | 라벨 없음 | 화이트 |
| 상위 25% | "비싼 편" | 연한 주황 (#FFF7ED) |
| 상위 10% | "피크 시즌" | 연한 빨강 (#FEF2F2) |

### 가격 분해 뷰 (바텀시트)

날짜 셀 탭 시 표시. **항공사명(IATA 코드) + 호텔명** 출처 명시:
- "에어부산 (BX) · 직항" — 1인 364,100원, 2인 728,200원
- "신주쿠 워싱턴 호텔 · 3성급" — 128,127원/박 × 4박
- 합계 (2인) / **1인당** (강조)
- "항공권 보기" → `flights.myrealtrip.com` (KSESID 필수: `air:b2c:SELK138RB:SELK138RB::00`)
- "숙소 보기" → `accommodation.myrealtrip.com` (딥링크 정상 동작)

**항공 딥링크 주의:** MRT 항공 검색 URL은 `KSESID` 공개 세션 키가 없으면 에러 페이지 반환. 이 값은 MRT 홈페이지의 공개 키이며, MRT가 변경하면 링크가 깨질 수 있으므로 주기적 모니터링 필요.

---

## UI 구성

### 디자인 원칙 (MRT 브랜드)
- **배경**: 깨끗한 그레이 (#F9FAFB) — 노란색/amber 배경 금지
- **카드**: 불투명 화이트 + 미세 테두리 (`card-panel` 클래스)
- **포인트 컬러**: MRT 블루 (#2563EB) — 최저가, 슬라이더, 강조
- **위험 컬러**: 주황/빨강 — 비싼 날짜만 미세 틴트
- **비율**: 화이트/그레이 ~92%, 블루 ~8%
- **폰트**: Pretendard
- "예상가" 안내 — "실제 예약가와 다를 수 있음" 명시

### 로고 / 파비콘
- **Valley Pin** 컨셉: 블루 원 안에 부드러운 골짜기 물결 곡선 (최저가를 찾는 모양)
- 파비콘: `public/favicon.svg` (32x32)
- 앱 아이콘: `public/icon-192.svg` (192x192)
- 로고 컴포넌트: `src/components/ui/Logo.tsx`

### 화면 구성 (위→아래)
1. 헤더: Valley Pin 로고 + "MyTripSignal" (블루 액센트)
2. 도시 선택: 다크 필 버튼 (활성) + 화이트 아웃라인 (비활성)
3. 여정 슬라이더: 3~7일, 기본 5일
4. 요약 카드: 1인당 최저가 (블루) + 평균 + 절약액
5. **가격 추이 꺾은선 그래프**: SVG 라인 + 평균 점선 + 마우스오버 툴팁
6. **월 넘기기 캘린더**: ← 2026년 3월 → 형태, 하단 월 인디케이터 점
7. 히트맵 범례: 블루(저렴) → 빨강(비쌈)
8. 가격 분해 바텀시트: 항공/숙소 출처 + 2인 합계 + 1인당

---

## 개발 원칙

### 1. Ship Fast, Learn Fast
- 완벽한 코드보다 작동하는 프로토타입 우선
- PoC 단계이므로 과도한 추상화 지양

### 2. TypeScript Strict
- `strict: true` 필수, `any` 금지

### 3. 컴포넌트 설계
- 하나의 컴포넌트는 하나의 역할만
- 비즈니스 로직은 `lib/`에 분리

### 4. API 설계
- 응답 형식: `{ data, error, meta }`
- 외부 API 호출은 반드시 `lib/mrt-api.ts`를 통해

### 5. 데이터 수집 스크립트
- 멱등성 보장 (upsert + onConflict)
- 실패 시 부분 성공 유지, 수집 결과 로그 필수
- rate limit 대응: 호출 간 800ms~2s delay

### 6. 성능
- 초기 로딩 3초 이내
- 여정 길이 변경 시 클라이언트 재계산 (API 재호출 없음)
- 차트는 SVG (외부 라이브러리 없이 구현)

### 7. Git 컨벤션
- `type: description` (feat, fix, chore, docs, refactor)
- PR 없이 main 직접 push 가능 (PoC 단계)

### 8. 페르소나 검증 원칙
- 사용자의 지시/제안이 들어오면, 관련 페르소나를 로드하여 다각도로 검증한 뒤 최선의 실행 방안을 결정
- 페르소나 경로: `C:\Users\MRT-USER\MRT-Growth\growth-department\` 하위
- 최소 검증 대상: Product Lead (전략/우선순위), Devil's Advocate (리스크/대안), 관련 실무 페르소나 (PM/Designer/Developer/DA 중 해당자)
- 검증 결과를 사용자에게 공유한 뒤 실행 진행

---

## PoC 범위

| 항목 | 범위 |
|------|------|
| 도시 | 20개 도시 (동아시아 6 + 동남아 8 + 유럽 3 + 미주 3) |
| 기간 | 향후 3~6개월 |
| 여정 | 3~7일 (슬라이더) |
| 항공 | 직항 왕복 최저가 (1인가) |
| 숙소 | 도심 3성급 호텔 최저가 (세금포함 1박가) |
| 표시 | 성인 2인 기준, 1인당 비용 |
| 데이터 수집 | GitHub Actions 매일 KST 09:00 |

---

## 페르소나 참조

이 프로젝트에서 활용 가능한 MRT Growth Department 페르소나 파일 경로.

### 의사결정자

| 역할 | 경로 |
|------|------|
| Growth Director | `C:\Users\MRT-USER\MRT-Growth\growth-department\growth-director.md` |
| Product Lead | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-lead.md` |

### 제품팀

| 역할 | 경로 |
|------|------|
| Product Manager | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\product-manager.md` |
| Growth PM | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\growth-pm.md` |
| Data Analyst | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\data-analyst.md` |
| Product Designer | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\product-designer.md` |
| Backend Developer | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\backend-developer.md` |
| Frontend Developer | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\frontend-developer.md` |
| Devil's Advocate (Product) | `C:\Users\MRT-USER\MRT-Growth\growth-department\product-team\devils-advocate-product.md` |

### 마케팅팀

| 역할 | 경로 |
|------|------|
| Marketing Lead | `C:\Users\MRT-USER\MRT-Growth\growth-department\marketing-lead.md` |
| Branding Specialist | `C:\Users\MRT-USER\MRT-Growth\growth-department\marketing-team\branding-specialist.md` |
| Content Strategist | `C:\Users\MRT-USER\MRT-Growth\growth-department\marketing-team\content-strategist.md` |

### 컨텍스트

| 문서 | 경로 |
|------|------|
| 초기화 (핵심가치, 메타규칙) | `C:\Users\MRT-USER\MRT-Growth\init.md` |
| 브랜드 가이드라인 | `C:\Users\MRT-USER\MRT-Growth\growth-department\BRAND-GUIDELINES.md` |
| 2026 OKR | `C:\Users\MRT-USER\MRT-Growth\growth-department\2026-OKR.md` |

---

## Git 운영

| 항목 | 값 |
|------|-----|
| Remote | `https://github.com/taeukbang/tripsignal.git` |
| GitHub 계정 | **taeukbang** — 푸시 시 계정 선택 프롬프트가 나오면 항상 `taeukbang` 선택 |
| 브랜치 전략 | PR 없이 main 직접 push (PoC 단계) |
| Worktree | detached HEAD 상태일 수 있음 → `git push origin HEAD:main` 사용 |

---

## 관련 프로젝트

| 프로젝트 | 경로 | 관계 |
|---------|------|------|
| whereorwhen | `C:\Users\MRT-USER\whereorwhen` | 동일 기술 스택 참조. 여행 최적 시기 서비스 |
| MRT-Growth | `C:\Users\MRT-USER\MRT-Growth` | 페르소나, 브랜드 가이드라인, OKR 참조 |
