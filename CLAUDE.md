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

## 도시 데이터 (39개)

### 동아시아 (11개)

| 도시 | 나라 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|------|:---:|:---:|------|
| 도쿄 | 일본 | NRT (나리타) | 6139291 | 14048 | 신주쿠 |
| 오사카 | 일본 | KIX (간사이) | 0 | 85637 | 미나미 |
| 후쿠오카 | 일본 | FUK (후쿠오카) | 0 | 87056 | 하카타구 |
| 삿포로 | 일본 | CTS (신치토세) | 0 | 39320 | 추오쿠 |
| 오키나와 | 일본 | OKA (나하) | 0 | 448174 | 나하 시티 센터 |
| 나고야 | 일본 | NGO (주부) | 0 | 448156 | 나고야 도심 |
| 타이베이 | 대만 | TPE (타오위안) | 0 | 42051 | 중산 |
| 홍콩 | 홍콩 | HKG (홍콩) | 75 | 96872 | 야우침몽 |
| 상하이 | 중국 | PVG (푸둥) | 0 | 40680 | 푸동 |
| 베이징 | 중국 | PEK (수도) | 0 | 447765 | 차오양 |
| 마카오 | 마카오 | MFM (마카오) | 0 | - | - |

### 동남아시아 (13개)

| 도시 | 나라 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|------|:---:|:---:|------|
| 방콕 | 태국 | BKK (수완나품) | 524 | 118873 | 방콕 도심 |
| 다낭 | 베트남 | DAD (다낭) | 0 | 115391 | 손트라 |
| 호치민 | 베트남 | SGN (떤선녓) | 0 | 146768 | 1군 |
| 하노이 | 베트남 | HAN (노이바이) | 0 | 43948 | 호안끼엠 |
| 싱가포르 | 싱가포르 | SIN (창이) | 0 | 447717 | 싱가포르 시내 |
| 세부 | 필리핀 | CEB (막탄세부) | 0 | 555867 | 라후그 |
| 발리 | 인도네시아 | DPS (응우라라이) | 0 | 79551 | 꾸따 우타라 |
| 나트랑 | 베트남 | CXR (깜라인) | 150047 | 447960 | 쩐푸 비치 |
| 쿠알라룸푸르 | 말레이시아 | KUL (쿠알라룸푸르) | 0 | 41060 | 골든 트라이앵글 |
| 마닐라 | 필리핀 | MNL (니노이 아키노) | 0 | 14259 | 말라테 |
| 푸꾸옥 | 베트남 | PQC (푸꾸옥) | 0 | 631909 | 꾸아랍 |
| 치앙마이 | 태국 | CNX (치앙마이) | 0 | 127878 | 올드시티 |
| 코타키나발루 | 말레이시아 | BKI (코타키나발루) | 0 | 45628 | 다운타운 |

### 유럽 (9개)

| 도시 | 나라 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|------|:---:|:---:|------|
| 파리 | 프랑스 | CDG (샤를드 골) | 6139506 | 118971 | 파리 도심 센터 |
| 런던 | 영국 | LHR (히드로) | 0 | 115750 | 런던 도심 |
| 로마 | 이탈리아 | FCO (피우미치노) | 0 | 118981 | 로마 역사 센터 |
| 프랑크푸르트 | 독일 | FRA (프랑크푸르트) | 0 | 94941 | 반호프스비어텔 |
| 암스테르담 | 네덜란드 | AMS (스히폴) | 0 | 118834 | 암스테르담 도심 |
| 바르셀로나 | 스페인 | BCN (엘프라트) | 0 | 38153 | 에이삼플 |
| 뮌헨 | 독일 | MUC (뮌헨) | 0 | 118965 | 뮌헨 도심 |
| 밀라노 | 이탈리아 | MXP (말펜사) | 0 | 40991 | 밀라노 센터 |
| 이스탄불 | 튀르키예 | IST (이스탄불) | 0 | 118914 | 이스탄불 도심 |

### 미주/태평양 (6개)

| 도시 | 나라 | 공항 | regionId | downtownPoiId | 도심 지역명 |
|------|------|------|:---:|:---:|------|
| 괌 | 미국 | GUM (괌) | 0 | 43826 | 투몬 |
| 호놀룰루 | 미국 | HNL (호놀룰루) | 0 | 40375 | 와이키키 |
| 뉴욕 | 미국 | JFK (존 F. 케네디) | 0 | 11954 | 맨해튼 |
| 로스앤젤레스 | 미국 | LAX (로스앤젤레스) | 0 | 22521 | LA 다운타운 |
| 샌프란시스코 | 미국 | SFO (샌프란시스코) | 0 | 92538 | SF 다운타운 |
| 시드니 | 호주 | SYD (킹스포드 스미스) | 0 | 41764 | 시드니 CBD |

**regionId 참고:** regionId=0인 도시는 keyword 기반으로 검색/딥링크 동작. 수집 API는 keyword만으로 정상 동작.

---

## 프로젝트 구조

```
TripSignal/
├── CLAUDE.md                  # 프로젝트 지침 (이 파일)
├── docs/
│   └── PRD.md                 # 제품 요구사항 문서
├── package.json
├── next.config.ts             # 보안 헤더, poweredByHeader 제거
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── collect-prices.yml # 매일 KST 09:00 가격 수집
├── public/
│   ├── favicon.svg
│   ├── icon-192.svg
│   └── manifest.json          # PWA 매니페스트
└── src/
    ├── app/                   # Next.js App Router
    │   ├── layout.tsx         # 루트 레이아웃 (GA, OG, PWA 메타)
    │   ├── page.tsx           # 메인 페이지 (CSR, 전체 상태 관리)
    │   ├── globals.css        # 글로벌 스타일 + 셀 클래스
    │   ├── compare/
    │   │   └── page.tsx       # 도시별 비용 비교 페이지 (/compare)
    │   └── api/
    │       ├── cities/route.ts           # GET /api/cities
    │       ├── compare/route.ts          # GET /api/compare?duration=5 (도시별 가격 요약)
    │       └── prices/[cityId]/route.ts  # GET /api/prices/:cityId
    ├── components/
    │   ├── CitySelector.tsx   # 도시 선택 (대륙 필터 + 국기 optgroup 도시 드롭다운)
    │   ├── CityComparisonChart.tsx # 도시별 수평 바 차트 (비교 페이지)
    │   ├── DurationSlider.tsx # 3~7일 여정 슬라이더
    │   ├── PriceTrendChart.tsx # 가격 추이 꺾은선 그래프 (SVG, 200px)
    │   ├── PriceCalendar.tsx  # 월 넘기기 캘린더 히트맵 (핵심)
    │   ├── PriceBreakdown.tsx # 가격 분해 바텀시트 (Escape, aria-modal, 스크롤 락)
    │   ├── ShareButton.tsx    # 공유 버튼 (Web Share API / 클립보드)
    │   ├── Onboarding.tsx     # 첫 방문 3단계 가이드 (localStorage)
    │   ├── PriceAlert.tsx     # 가격 알림 버튼 + 배너 (localStorage)
    │   └── ui/
    │       ├── CalendarCell.tsx  # 개별 날짜 셀 (memo, 과거/빈 셀 구분)
    │       ├── PriceLabel.tsx    # 가격 라벨 배지 (타입 안전)
    │       ├── HeatmapLegend.tsx # 색상 범례 (서버 컴포넌트)
    │       └── Logo.tsx          # Valley Pin 로고 (서버 컴포넌트)
    ├── lib/
    │   ├── supabase.ts        # Supabase 싱글턴 클라이언트 (Service + Anon)
    │   ├── mrt-api.ts         # MRT API 래퍼 (fetchFlightWindow, fetchHotelSearch)
    │   ├── price-calculator.ts # 2인 기준 비용 계산, 인당 비용, 가격 라벨
    │   ├── analytics.ts       # GA4 커스텀 이벤트 모듈 (12개 이벤트)
    │   ├── deeplinks.ts       # MRT 항공/숙소 딥링크 URL 빌더
    │   └── utils.ts           # 날짜, 포맷팅, sleep, 항공사명 매핑
    ├── scripts/
    │   ├── collect-flights.ts      # 항공 수집 (/calendar/window, period 3~7)
    │   ├── collect-hotels.ts       # 숙소 수집 (/unionstay, 3일간격, 90일)
    │   ├── collect-all.ts          # 통합 수집
    │   ├── discover-city-ids.ts    # 도시 regionId/downtownPoiId 탐색
    │   ├── verify-new-cities.ts    # 신규 도시 직항+숙소 커버리지 검증
    │   ├── validate-integrity.ts   # 전체 도시 데이터 정합성 검증 (POI/가격/매핑)
    │   ├── check-hotel-names.ts    # 도시별 호텔명 DB 확인
    │   └── validate-data.ts        # 수집 데이터 품질 검증
    ├── data/
    │   └── cities.ts          # 도시 목록 39개 + 국기 매핑 (정적 import)
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

**수집 커버리지:** 39개 도시 × 5 여정(3~7일) × 전체 기간. 도시별 커버리지는 `npx tsx src/scripts/validate-data.ts`로 확인.

**예상 수집 시간:** 항공 ~2분 (195회) + 숙소 ~43분 (1170회) = 약 45분

**데이터 정합성 검증:** `npx tsx src/scripts/validate-integrity.ts` — 전체 도시의 항공/숙소/POI/국가/대륙/비용 합리성 8개 항목 자동 검증

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

### 메인 페이지 구성 (위→아래)
1. 헤더: Valley Pin 로고 + "MyTripSignal" + "내 여행의 시세를 확인하세요" + "직항 왕복 + 도심 숙소 합산 · 1인 기준" + 공유 버튼
2. 가격 알림 배너: 저장한 가격이 하락했을 때 상단에 표시
3. 가격 산정 기준 토글: 펼치면 상세 기준 설명
4. 도시 선택: 대륙 필터 드롭다운 + 국기 optgroup 도시 드롭다운
5. 여정 슬라이더: 3~7일, 기본 5일
6. 요약 카드: 1인당 최저가 (블루) + 평균 + 절약액 + **"다른 도시와 비교해보기" CTA** (블루 배경)
7. **가격 추이 꺾은선 그래프**: SVG 200px + 평균 점선 + 최저가 라벨 + 마우스오버 툴팁
8. **월 넘기기 캘린더**: ← 2026년 3월 (N일 데이터) → 형태, 빈 셀 상태 구분 (과거 vs 직항 없음), 하단 월 인디케이터 점
9. 히트맵 범례: 블루(저렴) → 빨강(비쌈)
10. 가격 분해 바텀시트: 항공/숙소 출처 + 2인 합계 + 1인당 + 가격 알림 설정 (Escape 키 닫기, 스크롤 락)
11. 온보딩 (첫 방문만): 3단계 가이드 모달

### 비교 페이지 구성 (/compare)
1. 헤더: 로고 + "도시별 비용 비교" + "← 돌아가기" 버튼
2. 여정 슬라이더: DurationSlider 재사용
3. 대륙 필터: 수평 스크롤 pill 버튼 (전체/동남아/동아시아/미주/유럽, 축약 레이블)
4. 요약 카드: 가장 저렴한 도시 vs 가장 비싼 도시 + 최대 차이
5. 수평 바 차트: 도시명(국가) + 가격 + 최저가 출발일. 대륙별 색상 (블루/그린/퍼플/오렌지). 클릭 시 메인 페이지로 이동

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
| 도시 | 39개 도시 (동아시아 11 + 동남아 13 + 유럽 9 + 미주 6) |
| 기간 | 향후 3~6개월 |
| 여정 | 3~7일 (슬라이더) |
| 항공 | 직항 왕복 최저가 (1인가) |
| 숙소 | 도심 3성급 호텔 최저가 (세금포함 1박가) |
| 표시 | 성인 2인 기준, 1인당 비용 |
| 데이터 수집 | GitHub Actions 매일 KST 09:00 |
| 도시 비교 | /compare 페이지, 전체 도시 1인당 최저가 랭킹 |

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

## 개발 이력

### Phase 1~2: PoC 구축 (2026-02-18~19)
- 초기 PoC: 3개 도시 (파리/도쿄/방콕), Supabase, 캘린더 히트맵, 가격 추이 그래프
- PRD v0.6 완성, 가격 계산 로직 확립

### Phase 2.5: 도시 확장 (2026-02-20)
- 3개 → 20개 도시 확장 (자동 POI 탐색 스크립트)
- 대륙별 필터 + 도시 드롭다운 UI
- MyTripSignal 브랜딩 통일 (붙여쓰기)
- 숙소 4성급 → 3성급 전환

### Phase 3: 측정 & 검증 (2026-02-21)
- Google Analytics (G-41N9YJBT04) 설정 + 12개 커스텀 이벤트
- OG 메타태그 강화 (og:title, og:description, twitter:card, og:locale)
- PWA manifest.json 추가
- "예상가" 면책 안내 보강

### Phase 4: 리텐션 & 바이럴 (2026-02-21)
- 공유 기능: Web Share API + 클립보드 폴백 + URL 상태 관리 (?city=&duration=&date=)
- 온보딩: 첫 방문 3단계 가이드 (localStorage 기반, 건너뛰기 가능)
- 가격 알림: 바텀시트에서 설정 → 재방문 시 가격 하락 감지 배너

### Phase 5: 데이터 밀도 & UX (2026-02-21)
- 데이터 수집 재실행: 항공 12,660건 + 호텔 3,000건 (도쿄 181일, 뉴욕 72일)
- 빈 셀 상태 구분: 과거 날짜 vs 미래 빈 날짜("—" 표시)
- 헤더에 "직항 왕복 + 도심 숙소 합산 · 1인 기준" 상시 노출
- 차트 높이 160px → 200px, 라벨 겹침 방지
- 접근성: 11개 aria-label 추가 (캘린더 버튼, 셀렉트, 차트)

### Phase 5.5: 성능 최적화 (2026-02-21)
- `/api/cities` fetch 제거 → `CITIES` 정적 import (RTT 1 제거)
- `selectedCity` 즉시 초기화로 가격 fetch가 마운트 즉시 시작
- 브랜딩 "MyTripSignal" 전체 통일 + 태그라인 "내 여행의 시세를 확인하세요"

### Phase 6: 도시 확장 & 비교 기능 (2026-02-22)
- **도시 확장**: 20개 → 39개 (2차례 Wave)
  - Wave 1 (9개): 오키나와, 나고야, 상하이, 베이징, 쿠알라룸푸르, 마닐라, 프랑크푸르트, LA, 시드니
  - Wave 2 (10개): 푸꾸옥, 치앙마이, 코타키나발루, SF, 마카오, 암스테르담, 바르셀로나, 뮌헨, 밀라노, 이스탄불
  - 모든 도시 MRT API 직항+숙소 커버리지 사전 검증 (`verify-new-cities.ts`)
- **도시 비교 페이지** (`/compare`): 전체 도시 1인당 최저가 수평 바 차트 + 대륙 필터 + 요약 카드
  - `/api/compare?duration=5` 서버 집계 엔드포인트
  - `CityComparisonChart` SVG 바 차트 컴포넌트 (대륙별 색상 구분)
- **도시 선택 UX 개선**:
  - City 타입에 `countryKo` 필드 추가
  - `<optgroup>` 국가별 그룹핑 + 국기 이모지 (16개국)
  - 요약 카드 하단에 "다른 도시와 비교해보기" CTA 통합 (B안)
- **버그 수정**:
  - SSR hydration mismatch: URL 파라미터 읽기를 `useEffect`로 이동
  - fetch race condition: `AbortController` + `priceData` 즉시 초기화 (도쿄 데이터가 싱가포르에 표시되던 버그)
  - compare API 미사용 import/변수 제거
  - 비교 페이지 fetch에도 `AbortController` 추가
- **데이터 정합성 검증**: 39개 도시 × 8개 항목 = 312건 ALL PASS (`validate-integrity.ts`)
- **항공사 매핑 확장**: 중국/말레이시아/네덜란드/스페인/터키 항공사 추가

### Phase 5.5: 코드 리팩토링 (2026-02-21)
- **버그 수정**: `createPriceLabeler` 음수 퍼센타일 → 최고가가 "최저가"로 표시되던 버그
- **버그 수정**: `getPriceStats`의 `Math.min(...spread)` → 단일 루프로 변경 (스택 오버플로 방지)
- **데드 코드 제거**: `ApiResponse<T>` 타입, `getCitiesByContinent()`, CSS 변수 3개
- **접근성**: PriceBreakdown에 Escape 키 닫기, `aria-modal`, `role="dialog"`, 스크롤 락 추가
- **성능**: Supabase 싱글턴 클라이언트, `selectedTrip`/`selectedLabel` useMemo, ShareButton timer cleanup
- **보안**: `next.config.ts`에 X-Content-Type-Options, X-Frame-Options, Referrer-Policy 헤더, `poweredByHeader: false`
- **타입 안전성**: `PriceLabel` Record 타입 강화, Logo/HeatmapLegend 서버 컴포넌트화
- **Analytics**: `breakdownView`/`chartInteract` 데드 코드 활성화

---

## Git 운영

| 항목 | 값 |
|------|-----|
| Remote | `https://taeukbang@github.com/taeukbang/tripsignal.git` (username 포함, 계정 선택 프롬프트 방지) |
| GitHub 계정 | **taeukbang** |
| 브랜치 전략 | PR 없이 main 직접 push (PoC 단계) |
| Worktree | detached HEAD 상태일 수 있음 → `git push origin HEAD:main` 사용 |

---

## 관련 프로젝트

| 프로젝트 | 경로 | 관계 |
|---------|------|------|
| whereorwhen | `C:\Users\MRT-USER\whereorwhen` | 동일 기술 스택 참조. 여행 최적 시기 서비스 |
| MRT-Growth | `C:\Users\MRT-USER\MRT-Growth` | 페르소나, 브랜드 가이드라인, OKR 참조 |
