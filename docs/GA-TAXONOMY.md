# MyTripSignal — GA4 이벤트 택소노미

**측정 ID:** `G-41N9YJBT04`
**최종 업데이트:** 2026-02-21
**구현 파일:** `src/lib/analytics.ts`

---

## 이벤트 목록

### 핵심 퍼널

| 이벤트명 | 발생 시점 | 매개변수 | 퍼널 단계 |
|----------|----------|----------|:---:|
| `page_view` | 페이지 진입 | (GA4 자동 수집) | 1 |
| `city_change` | 도시 드롭다운 변경 | `city_id`, `city_name` | 2 |
| `duration_change` | 여정 슬라이더 조작 | `duration` | 3 |
| `date_select` | 캘린더 날짜 셀 클릭 | `departure_date`, `per_person_cost`, `city_id` | 4 |
| `breakdown_view` | 가격 분해 바텀시트 열림 | `departure_date`, `city_id` | 5 |
| `deeplink_click` | "항공권 보기" 또는 "숙소 보기" 클릭 | `link_type`, `city_id`, `departure_date` | 6 |

### 차트 인터랙션

| 이벤트명 | 발생 시점 | 매개변수 |
|----------|----------|----------|
| `chart_interact` | 꺾은선 그래프 호버/터치 후 날짜 선택 | `departure_date`, `per_person_cost` |

### 공유

| 이벤트명 | 발생 시점 | 매개변수 |
|----------|----------|----------|
| `share_click` | 공유 버튼 클릭 | `method`, `city_id` |

`method` 값: `native_share` (모바일 공유 다이얼로그) / `clipboard` (URL 복사)

### 가격 알림

| 이벤트명 | 발생 시점 | 매개변수 |
|----------|----------|----------|
| `price_alert_set` | 가격 알림 설정 | `city_id`, `departure_date`, `price` |
| `price_alert_remove` | 가격 알림 해제 | `city_id`, `departure_date` |

### 온보딩

| 이벤트명 | 발생 시점 | 매개변수 |
|----------|----------|----------|
| `onboarding_step` | 온보딩 단계 진행 | `step` (0, 1, 2) |
| `onboarding_complete` | 온보딩 "시작하기" 클릭 | — |
| `onboarding_skip` | 온보딩 "건너뛰기" 클릭 | `step` |

### 기타

| 이벤트명 | 발생 시점 | 매개변수 |
|----------|----------|----------|
| `pricing_info_toggle` | "가격 산정 기준" 토글 | `open` (true/false) |

---

## GA4 맞춤 정의 등록

### 맞춤 측정기준

| 표시 이름 | 범위 | 이벤트 매개변수 |
|----------|------|---------------|
| `City ID` | 이벤트 | `city_id` |
| `City Name` | 이벤트 | `city_name` |
| `Departure Date` | 이벤트 | `departure_date` |
| `Link Type` | 이벤트 | `link_type` |
| `Share Method` | 이벤트 | `method` |
| `Onboarding Step` | 이벤트 | `step` |
| `Toggle Open` | 이벤트 | `open` |

### 맞춤 측정항목

| 표시 이름 | 범위 | 이벤트 매개변수 | 측정 단위 |
|----------|------|---------------|----------|
| `Per Person Cost` | 이벤트 | `per_person_cost` | 표준 |
| `Trip Duration` | 이벤트 | `duration` | 표준 |
| `Alert Price` | 이벤트 | `price` | 표준 |

---

## 퍼널 탐색 보고서 설정

GA4 > 탐색 > 유입경로 탐색 분석:

```
단계 1: 사이트 방문        이벤트 = page_view
단계 2: 도시 선택          이벤트 = city_change
단계 3: 여정 조절          이벤트 = duration_change
단계 4: 날짜 클릭          이벤트 = date_select
단계 5: 가격 상세 확인      이벤트 = breakdown_view
단계 6: MRT로 이동         이벤트 = deeplink_click
```

분류 기준: `City ID` → 도시별 퍼널 전환율 비교 가능

---

## PRD 성공지표 매핑

| PRD 지표 | GA4 확인 방법 |
|----------|-------------|
| DAU | 보고서 > 사용자 속성 > 개요 |
| D7 Retention | 보고서 > 리텐션 |
| 여정 조작률 | `duration_change` 유저 수 / 전체 유저 수 |
| 날짜→상세 전환율 | `date_select` 수 / 전체 세션 수 |
| 상세→예약 전환율 | `deeplink_click` 수 / `breakdown_view` 수 |
| 평균 세션 시간 | 보고서 > 참여도 > 개요 |

---

## 참고

- `page_view`, `session_start`, `first_visit` 등은 GA4 자동 수집
- 맞춤 정의 등록 후 24~48시간 뒤 보고서에 반영
- 매개변수명은 코드와 대소문자까지 정확히 일치해야 함 (전부 snake_case)
- 맞춤 측정기준 미등록 시 이벤트 수만 보이고 파라미터별 분석 불가
