import { sleep } from "./utils";
import type { MrtFlightCalendarItem, MrtHotelItem } from "@/types";
import { ADULTS_COUNT } from "@/types";

const MRT_BASE_URL = "https://api3.myrealtrip.com";
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      if (attempt < retries) {
        console.warn(`Retry ${attempt + 1}: ${url} returned ${res.status}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const body = await res.text();
      throw new Error(`MRT API error ${res.status}: ${body}`);
    } catch (err) {
      if (attempt < retries && err instanceof Error && !err.message.startsWith("MRT API error")) {
        console.warn(`Retry ${attempt + 1}: network error for ${url}`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable"); // TypeScript control flow guard
}

// ── Flight: /api/price/calendar/window (여정별 직항 왕복 최저가) ──

interface FlightWindowRawItem {
  departureDate: string;
  arrivalDate: string;
  airline: string;
  totalPrice: number;
}

export async function fetchFlightWindow(
  departureCity: string,
  arrivalCity: string,
  departureDate: string,
  period: number,
): Promise<MrtFlightCalendarItem[]> {
  const body = {
    airlines: ["ALL"],
    departureCity,
    arrivalCity,
    departureDate,
    period,
    transfer: 0,
  };

  const url = `${MRT_BASE_URL}/flight/api/price/calendar/window`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const rawItems: FlightWindowRawItem[] = json.flightWindowInfoResults ?? [];

  return rawItems.map((raw) => ({
    departureDate: raw.departureDate,
    price: raw.totalPrice,
    airlineCode: raw.airline,
    airlineName: "",
  }));
}

// ── Hotel: /unionstay/v2/front/search (도심 4성급 최저가) ──

interface UnionStayBizlogData {
  item_id: number;
  item_name: string;
  item_price: number;
  item_original_price: number;
  item_grade: number;
  item_review_score: string;
  item_review_count: number;
}

export async function fetchHotelSearch(
  regionId: number,
  keyword: string,
  checkIn: string,
  checkOut: string,
  downtownPoiId?: string,
): Promise<MrtHotelItem[]> {
  const filters = ["starRating:fourstar"];
  if (downtownPoiId) {
    filters.push(`stayPoi:${downtownPoiId}`);
  }

  const params = new URLSearchParams({
    keyword,
    checkIn,
    checkOut,
    adultCount: String(ADULTS_COUNT),
    childCount: "0",
    isDomestic: "false",
    mrtKeyName: "",
    selected: filters.join(","),
  });
  if (regionId > 0) {
    params.set("regionId", String(regionId));
  }

  const url = `${MRT_BASE_URL}/unionstay/v2/front/search?${params}`;
  const res = await fetchWithRetry(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://accommodation.myrealtrip.com",
      Referer: "https://accommodation.myrealtrip.com/",
    },
  });

  const json = await res.json();
  const sections = json.data?.dynamicArea?.sections ?? [];

  const items: MrtHotelItem[] = [];
  for (const section of sections) {
    const bizData = section.loggingMeta?.BIZLOG?.data as UnionStayBizlogData | undefined;
    if (!bizData?.item_price || !bizData?.item_name) continue;

    items.push({
      id: bizData.item_id,
      name: bizData.item_name,
      salePrice: bizData.item_price,
      originalPrice: bizData.item_original_price ?? bizData.item_price,
      soldOut: false,
    });
  }

  return items;
}
