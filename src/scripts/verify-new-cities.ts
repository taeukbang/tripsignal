import { sleep } from "../lib/utils";

const MRT_BASE_URL = "https://api3.myrealtrip.com";
const DELAY_MS = 800;

interface CityCandidate {
  keyword: string;
  nameEn: string;
  airportCode: string;
  countryKo: string;
  continentId: string;
}

const CANDIDATES: CityCandidate[] = [
  { keyword: "푸꾸옥", nameEn: "Phu Quoc", airportCode: "PQC", countryKo: "베트남", continentId: "southeast-asia" },
  { keyword: "치앙마이", nameEn: "Chiang Mai", airportCode: "CNX", countryKo: "태국", continentId: "southeast-asia" },
  { keyword: "코타키나발루", nameEn: "Kota Kinabalu", airportCode: "BKI", countryKo: "말레이시아", continentId: "southeast-asia" },
  { keyword: "샌프란시스코", nameEn: "San Francisco", airportCode: "SFO", countryKo: "미국", continentId: "americas" },
  { keyword: "마카오", nameEn: "Macau", airportCode: "MFM", countryKo: "마카오", continentId: "east-asia" },
  { keyword: "암스테르담", nameEn: "Amsterdam", airportCode: "AMS", countryKo: "네덜란드", continentId: "europe" },
  { keyword: "바르셀로나", nameEn: "Barcelona", airportCode: "BCN", countryKo: "스페인", continentId: "europe" },
  { keyword: "뮌헨", nameEn: "Munich", airportCode: "MUC", countryKo: "독일", continentId: "europe" },
  { keyword: "밀라노", nameEn: "Milan", airportCode: "MXP", countryKo: "이탈리아", continentId: "europe" },
  { keyword: "이스탄불", nameEn: "Istanbul", airportCode: "IST", countryKo: "튀르키예", continentId: "europe" },
];

async function checkFlightCoverage(airportCode: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const body = {
    airlines: ["ALL"],
    departureCity: "ICN",
    arrivalCity: airportCode,
    departureDate: today,
    period: 5,
    transfer: 0,
  };

  try {
    const res = await fetch(`${MRT_BASE_URL}/flight/api/price/calendar/window`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return (json.flightWindowInfoResults ?? []).length;
  } catch {
    return 0;
  }
}

async function checkHotelCoverage(keyword: string): Promise<{ hotelCount: number; topPoi: string; topPoiId: string; regionId: number }> {
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
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://accommodation.myrealtrip.com",
        Referer: "https://accommodation.myrealtrip.com/",
      },
    });
    if (!res.ok) return { hotelCount: 0, topPoi: "-", topPoiId: "", regionId: 0 };
    const json = await res.json();

    const totalCount = json.data?.dynamicArea?.pageMeta?.totalCount ?? 0;
    const regionId = json.data?.staticArea?.staySearchParam?.regionId ?? 0;

    const filters = json.data?.staticArea?.selectOption?.filterInfo?.filters ?? [];
    const stayPoiFilter = filters.find((f: { key: string }) => f.key === "stayPoi");
    const poiItems = (stayPoiFilter?.items ?? [])
      .filter((item: { value: string }) => item.value !== "all")
      .sort((a: { count: number }, b: { count: number }) => (b.count ?? 0) - (a.count ?? 0));

    const topPoi = poiItems[0];

    return {
      hotelCount: totalCount,
      topPoi: topPoi?.title ?? "-",
      topPoiId: topPoi?.value ?? "",
      regionId,
    };
  } catch {
    return { hotelCount: 0, topPoi: "-", topPoiId: "", regionId: 0 };
  }
}

async function main() {
  console.log("=== 후보 도시 검증 시작 (10개) ===\n");

  const results: Array<CityCandidate & { flightDays: number; hotelCount: number; topPoi: string; topPoiId: string; regionId: number; pass: boolean }> = [];

  for (const city of CANDIDATES) {
    process.stdout.write(`  [${city.keyword}] (${city.airportCode}) 검증 중...`);

    const flightDays = await checkFlightCoverage(city.airportCode);
    await sleep(DELAY_MS);

    const hotel = await checkHotelCoverage(city.keyword);
    await sleep(DELAY_MS);

    const pass = flightDays >= 10 && hotel.hotelCount >= 3;

    results.push({ ...city, flightDays, ...hotel, pass });
    console.log(` 직항 ${flightDays}일 | 3성급 ${hotel.hotelCount}개 | 도심: ${hotel.topPoi} (${hotel.topPoiId}) | ${pass ? "PASS" : "FAIL"}`);
  }

  console.log("\n=== 검증 결과 요약 ===\n");
  console.log("| 도시 | 공항 | 나라 | 직항일수 | 3성급 | 도심지역 | POI ID | regionId | 판정 |");
  console.log("|------|------|------|---------|-------|---------|--------|----------|------|");

  for (const r of results) {
    console.log(
      `| ${r.keyword} | ${r.airportCode} | ${r.countryKo} | ${r.flightDays} | ${r.hotelCount} | ${r.topPoi} | ${r.topPoiId} | ${r.regionId} | ${r.pass ? "PASS" : "FAIL"} |`
    );
  }

  const passed = results.filter((r) => r.pass);
  console.log(`\n통과: ${passed.length}개 / ${results.length}개`);

  if (passed.length > 0) {
    console.log("\n=== cities.ts 추가용 데이터 ===\n");
    for (const r of passed) {
      const id = r.nameEn.toLowerCase().replace(/\s+/g, "");
      console.log(`  {
    id: "${id}",
    nameKo: "${r.keyword}",
    nameEn: "${r.nameEn}",
    countryKo: "${r.countryKo}",
    airportCode: "${r.airportCode}",
    airportNameKo: "TODO",
    regionId: ${r.regionId},
    downtownPoiId: "${r.topPoiId}",
    continentId: "${r.continentId}",
  },`);
    }
  }
}

main().catch(console.error);
