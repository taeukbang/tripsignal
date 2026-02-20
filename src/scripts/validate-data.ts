import "dotenv/config";
import { createAnonClient } from "../lib/supabase";
import { requireEnv } from "../lib/utils";
import { CITIES } from "../data/cities";

const MIN_FLIGHT_DAYS = 60;
const MIN_HOTEL_DAYS = 20;
const MIN_HOTEL_COUNT = 5;

interface CityReport {
  cityId: string;
  nameKo: string;
  flightDays: number;
  hotelDays: number;
  avgHotelCount: number;
  minFlightPrice: number | null;
  maxFlightPrice: number | null;
  minHotelPrice: number | null;
  maxHotelPrice: number | null;
  zeroFlightPrices: number;
  zeroHotelPrices: number;
  status: "ok" | "sparse" | "empty";
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createAnonClient();
  const reports: CityReport[] = [];

  console.log("=== 데이터 품질 검증 ===\n");

  for (const city of CITIES) {
    const [flightResult, hotelResult] = await Promise.all([
      supabase
        .from("flight_prices")
        .select("departure_date, price")
        .eq("city_id", city.id),
      supabase
        .from("hotel_prices")
        .select("check_in_date, min_price_per_night, hotel_count")
        .eq("city_id", city.id),
    ]);

    const flights = flightResult.data ?? [];
    const hotels = hotelResult.data ?? [];

    const uniqueFlightDates = new Set(flights.map((f) => f.departure_date));
    const uniqueHotelDates = new Set(hotels.map((h) => h.check_in_date));

    const flightPrices = flights.map((f) => f.price).filter((p) => p > 0);
    const hotelPrices = hotels.map((h) => h.min_price_per_night).filter((p) => p > 0);
    const hotelCounts = hotels.map((h) => h.hotel_count ?? 0);

    const avgHotelCount = hotelCounts.length > 0
      ? Math.round(hotelCounts.reduce((a, b) => a + b, 0) / hotelCounts.length)
      : 0;

    const flightDays = uniqueFlightDates.size;
    const hotelDays = uniqueHotelDates.size;

    let status: CityReport["status"] = "ok";
    if (flightDays === 0 && hotelDays === 0) {
      status = "empty";
    } else if (flightDays < MIN_FLIGHT_DAYS) {
      status = "sparse";
    }

    reports.push({
      cityId: city.id,
      nameKo: city.nameKo,
      flightDays,
      hotelDays,
      avgHotelCount,
      minFlightPrice: flightPrices.length > 0 ? Math.min(...flightPrices) : null,
      maxFlightPrice: flightPrices.length > 0 ? Math.max(...flightPrices) : null,
      minHotelPrice: hotelPrices.length > 0 ? Math.min(...hotelPrices) : null,
      maxHotelPrice: hotelPrices.length > 0 ? Math.max(...hotelPrices) : null,
      zeroFlightPrices: flights.filter((f) => f.price === 0).length,
      zeroHotelPrices: hotels.filter((h) => h.min_price_per_night === 0).length,
      status,
    });
  }

  console.log("| 도시 | 항공(일) | 숙소(일) | 호텔수 | 항공 가격범위 | 숙소 가격범위 | 상태 |");
  console.log("|------|---------|---------|--------|------------|------------|------|");

  for (const r of reports) {
    const flightRange = r.minFlightPrice
      ? `${(r.minFlightPrice / 10000).toFixed(0)}~${(r.maxFlightPrice! / 10000).toFixed(0)}만`
      : "-";
    const hotelRange = r.minHotelPrice
      ? `${(r.minHotelPrice / 10000).toFixed(0)}~${(r.maxHotelPrice! / 10000).toFixed(0)}만`
      : "-";
    const statusIcon = r.status === "ok" ? "OK" : r.status === "sparse" ? "SPARSE" : "EMPTY";

    console.log(
      `| ${r.nameKo.padEnd(6)} | ${String(r.flightDays).padStart(7)} | ${String(r.hotelDays).padStart(7)} | ${String(r.avgHotelCount).padStart(6)} | ${flightRange.padStart(10)} | ${hotelRange.padStart(10)} | ${statusIcon.padStart(6)} |`,
    );
  }

  const okCount = reports.filter((r) => r.status === "ok").length;
  const sparseCount = reports.filter((r) => r.status === "sparse").length;
  const emptyCount = reports.filter((r) => r.status === "empty").length;

  console.log(`\n요약: OK ${okCount}개 | SPARSE ${sparseCount}개 | EMPTY ${emptyCount}개`);
  console.log(`기준: 항공 ${MIN_FLIGHT_DAYS}일+, 숙소 ${MIN_HOTEL_DAYS}일+, 호텔 ${MIN_HOTEL_COUNT}개+`);

  if (reports.some((r) => r.zeroFlightPrices > 0 || r.zeroHotelPrices > 0)) {
    console.log("\n⚠ 0원 가격 감지:");
    for (const r of reports) {
      if (r.zeroFlightPrices > 0 || r.zeroHotelPrices > 0) {
        console.log(`  ${r.nameKo}: 항공 ${r.zeroFlightPrices}건, 숙소 ${r.zeroHotelPrices}건`);
      }
    }
  }
}

main().catch(console.error);
