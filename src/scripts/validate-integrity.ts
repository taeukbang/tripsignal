import "dotenv/config";
import { createServiceClient } from "../lib/supabase";
import { CITIES, CONTINENTS, getCountryFlag } from "../data/cities";

const MRT_BASE_URL = "https://api3.myrealtrip.com";

interface ValidationResult {
  cityId: string;
  nameKo: string;
  countryKo: string;
  checks: {
    name: string;
    pass: boolean;
    detail: string;
  }[];
}

async function verifyDowntownPoi(keyword: string, downtownPoiId: string): Promise<{ pass: boolean; actual: string; poiName: string }> {
  const params = new URLSearchParams({
    keyword,
    checkIn: "2026-04-01",
    checkOut: "2026-04-05",
    adultCount: "2",
    childCount: "0",
    isDomestic: "false",
    mrtKeyName: "",
    selected: "starRating:threestar",
  });

  try {
    const res = await fetch(`${MRT_BASE_URL}/unionstay/v2/front/search?${params}`, {
      headers: {
        Accept: "application/json",
        Origin: "https://accommodation.myrealtrip.com",
        Referer: "https://accommodation.myrealtrip.com/",
      },
    });
    if (!res.ok) return { pass: false, actual: "API error", poiName: "" };
    const json = await res.json();

    const filters = json.data?.staticArea?.selectOption?.filterInfo?.filters ?? [];
    const stayPoiFilter = filters.find((f: { key: string }) => f.key === "stayPoi");
    const poiItems = (stayPoiFilter?.items ?? [])
      .filter((item: { value: string }) => item.value !== "all")
      .sort((a: { count: number }, b: { count: number }) => (b.count ?? 0) - (a.count ?? 0));

    const topPoi = poiItems[0];
    const matchingPoi = poiItems.find((p: { value: string }) => p.value === downtownPoiId);

    if (matchingPoi) {
      const isTop = topPoi?.value === downtownPoiId;
      return {
        pass: true,
        actual: `${matchingPoi.value} (${matchingPoi.title}, ${matchingPoi.count}개)${isTop ? " [TOP]" : ""}`,
        poiName: matchingPoi.title,
      };
    } else {
      return {
        pass: false,
        actual: topPoi ? `우리 POI=${downtownPoiId} 없음. TOP=${topPoi.value} (${topPoi.title})` : "POI 데이터 없음",
        poiName: "",
      };
    }
  } catch {
    return { pass: false, actual: "network error", poiName: "" };
  }
}

async function main() {
  const supabase = createServiceClient();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  MyTripSignal 데이터 정합성 검증 (페르소나 관점)           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const results: ValidationResult[] = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const city of CITIES) {
    const flag = getCountryFlag(city.countryKo);
    const checks: ValidationResult["checks"] = [];

    process.stdout.write(`${flag} ${city.nameKo} (${city.airportCode})... `);

    // 1. [Data Analyst] 항공 데이터 존재 여부 및 가격 범위
    const { data: flights } = await supabase
      .from("flight_prices")
      .select("price, departure_date, duration")
      .eq("city_id", city.id)
      .eq("duration", 5);

    const flightCount = flights?.length ?? 0;
    checks.push({
      name: "항공 데이터",
      pass: flightCount >= 10,
      detail: `${flightCount}건`,
    });

    if (flights && flights.length > 0) {
      const prices = flights.map((f) => f.price);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const hasNegative = prices.some((p) => p <= 0);
      checks.push({
        name: "항공 가격 범위",
        pass: !hasNegative && minP > 10000,
        detail: `${(minP / 10000).toFixed(0)}만~${(maxP / 10000).toFixed(0)}만${hasNegative ? " [음수/0 존재!]" : ""}`,
      });
    }

    // 2. [Data Analyst] 숙소 데이터 존재 여부 및 가격 범위
    const { data: hotels } = await supabase
      .from("hotel_prices")
      .select("min_price_per_night, check_in_date, hotel_name, duration")
      .eq("city_id", city.id)
      .eq("duration", 5);

    const hotelCount = hotels?.length ?? 0;
    checks.push({
      name: "숙소 데이터",
      pass: hotelCount >= 5,
      detail: `${hotelCount}건`,
    });

    if (hotels && hotels.length > 0) {
      const prices = hotels.map((h) => h.min_price_per_night);
      const minH = Math.min(...prices);
      const maxH = Math.max(...prices);
      const hasNegative = prices.some((p) => p <= 0);
      const firstHotel = hotels[0].hotel_name ?? "이름 없음";
      checks.push({
        name: "숙소 가격 범위",
        pass: !hasNegative && minH > 5000,
        detail: `${(minH / 10000).toFixed(1)}만~${(maxH / 10000).toFixed(1)}만/박 (${firstHotel})`,
      });
    }

    // 3. [Product Manager] 도심 POI 유효성 검증
    const poiResult = await verifyDowntownPoi(city.nameKo, city.downtownPoiId);
    checks.push({
      name: "도심 POI 매핑",
      pass: poiResult.pass,
      detail: poiResult.actual,
    });

    // 4. [Frontend Developer] countryKo/flag 매핑
    checks.push({
      name: "국가/국기 매핑",
      pass: city.countryKo.length > 0 && flag.length > 0,
      detail: `${flag} ${city.countryKo}`,
    });

    // 5. [Backend Developer] 대륙 ID 유효성
    const validContinent = CONTINENTS.some((c) => c.id === city.continentId);
    checks.push({
      name: "대륙 매핑",
      pass: validContinent,
      detail: city.continentId,
    });

    // 6. [Data Analyst] 1인당 비용 합리성 검증
    if (flights && flights.length > 0 && hotels && hotels.length > 0) {
      const sampleFlight = flights[0].price;
      const sampleHotel = hotels[0].min_price_per_night;
      const nights = 4;
      const perPerson = Math.round((sampleFlight * 2 + sampleHotel * nights) / 2);
      const isReasonable = perPerson > 100000 && perPerson < 5000000;
      checks.push({
        name: "1인당 비용 합리성",
        pass: isReasonable,
        detail: `${(perPerson / 10000).toFixed(0)}만원 (5일)`,
      });
    }

    const passed = checks.filter((c) => c.pass).length;
    const failed = checks.filter((c) => !c.pass).length;
    totalPass += passed;
    totalFail += failed;

    results.push({ cityId: city.id, nameKo: city.nameKo, countryKo: city.countryKo, checks });

    console.log(failed === 0 ? `ALL PASS (${passed}/${passed})` : `${passed} pass / ${failed} FAIL`);

    await new Promise((r) => setTimeout(r, 500));
  }

  // Summary
  console.log("\n" + "═".repeat(64));
  console.log("검증 결과 요약\n");

  const failedCities = results.filter((r) => r.checks.some((c) => !c.pass));

  if (failedCities.length === 0) {
    console.log(`✓ 전체 ${results.length}개 도시 × ${results[0]?.checks.length ?? 0}개 항목 = ${totalPass}건 ALL PASS`);
  } else {
    console.log(`✓ PASS: ${totalPass}건 / ✗ FAIL: ${totalFail}건\n`);
    console.log("실패 항목:");
    for (const r of failedCities) {
      const fails = r.checks.filter((c) => !c.pass);
      for (const f of fails) {
        console.log(`  [${r.nameKo}] ${f.name}: ${f.detail}`);
      }
    }
  }

  console.log("\n" + "═".repeat(64));
  console.log("도시별 상세 결과\n");

  console.log("| 도시 | 항공 | 숙소 | POI | 국가 | 대륙 | 비용 |");
  console.log("|------|------|------|-----|------|------|------|");

  for (const r of results) {
    const row = r.checks.map((c) => c.pass ? "✓" : "✗").join(" | ");
    const flag = getCountryFlag(r.countryKo);
    console.log(`| ${flag} ${r.nameKo} | ${row} |`);
  }
}

main().catch(console.error);
