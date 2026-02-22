/** 대륙 정보 */
export interface Continent {
  id: string;
  nameKo: string;
}

/** 도시 정보 */
export interface City {
  id: string;
  nameKo: string;
  nameEn: string;
  countryKo: string;
  airportCode: string;
  airportNameKo: string;
  regionId: number;
  downtownPoiId: string;
  continentId: string;
}

/** 도시 간 비교 API 응답 */
export interface CityCostSummary {
  cityId: string;
  nameKo: string;
  countryKo: string;
  continentId: string;
  minPerPersonCost: number;
  avgPerPersonCost: number;
  cheapestDate: string;
  dataPoints: number;
}

/** 총 여행 비용 (클라이언트 계산 결과) — 성인 2인 기준 */
export interface TripCost {
  departureDate: string;
  returnDate: string;
  flightPricePerPerson: number;
  hotelPricePerNight: number;
  duration: number;
  totalCostForTwo: number;
  perPersonCost: number;
  hasDirectFlight: boolean;
  airlineCode: string | null;
  airlineName: string | null;
  hotelName: string | null;
}

export const ADULTS_COUNT = 2;

/** 가격 라벨 */
export type PriceLabel = "lowest" | "cheap" | "normal" | "expensive" | "peak";

/** 항공 가격 엔트리 (API 응답용) */
export interface FlightPriceEntry {
  price: number;
  airlineCode: string | null;
  airlineName: string | null;
}

/** 숙소 가격 엔트리 (API 응답용) */
export interface HotelPriceEntry {
  price: number;
  hotelName: string | null;
}

/** 가격 API 응답 데이터 — flights/hotels 모두 date → duration → entry 구조 */
export interface PriceData {
  flights: Record<string, Record<string, FlightPriceEntry>>;
  hotels: Record<string, Record<string, HotelPriceEntry>>;
}

/** 가격 통계 (캘린더 요약용) */
export interface PriceStats {
  minCost: number;
  maxCost: number;
  avgCost: number;
  minDate: string;
  count: number;
}

/** 여정 길이 */
export type Duration = 3 | 4 | 5 | 6 | 7;

export const DURATIONS: Duration[] = [3, 4, 5, 6, 7];
export const DEFAULT_DURATION: Duration = 5;
export const MIN_DURATION = 3;
export const MAX_DURATION = 7;

/** MRT 항공 캘린더 API 응답 내 개별 항목 (수집 스크립트용) */
export interface MrtFlightCalendarItem {
  departureDate: string;
  price: number;
  airlineCode: string;
  airlineName: string;
}

/** MRT 숙소 맵 API 응답 내 호텔 항목 (수집 스크립트용) */
export interface MrtHotelItem {
  id: number;
  name: string;
  salePrice: number;
  originalPrice: number;
  soldOut: boolean;
}
