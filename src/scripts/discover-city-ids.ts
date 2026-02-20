import { sleep } from "../lib/utils";

const MRT_BASE_URL = "https://api3.myrealtrip.com";
const DELAY_MS = 1000;

interface CityCandidate {
  keyword: string;
  nameEn: string;
  airportCode: string;
  airportNameKo: string;
  continentId: string;
}

interface PoiItem {
  value: string;
  title: string;
  count: number | null;
}

interface DiscoveryResult {
  keyword: string;
  nameEn: string;
  airportCode: string;
  airportNameKo: string;
  continentId: string;
  selectedPoi: PoiItem | null;
  topPois: PoiItem[];
  totalHotels: number;
  regionId: number | null;
}

const CITIES: CityCandidate[] = [
  { keyword: "도쿄", nameEn: "Tokyo", airportCode: "NRT", airportNameKo: "나리타", continentId: "east-asia" },
  { keyword: "오사카", nameEn: "Osaka", airportCode: "KIX", airportNameKo: "간사이", continentId: "east-asia" },
  { keyword: "후쿠오카", nameEn: "Fukuoka", airportCode: "FUK", airportNameKo: "후쿠오카", continentId: "east-asia" },
  { keyword: "삿포로", nameEn: "Sapporo", airportCode: "CTS", airportNameKo: "신치토세", continentId: "east-asia" },
  { keyword: "타이베이", nameEn: "Taipei", airportCode: "TPE", airportNameKo: "타오위안", continentId: "east-asia" },
  { keyword: "홍콩", nameEn: "Hong Kong", airportCode: "HKG", airportNameKo: "홍콩", continentId: "east-asia" },
  { keyword: "방콕", nameEn: "Bangkok", airportCode: "BKK", airportNameKo: "수완나품", continentId: "southeast-asia" },
  { keyword: "다낭", nameEn: "Da Nang", airportCode: "DAD", airportNameKo: "다낭", continentId: "southeast-asia" },
  { keyword: "호치민", nameEn: "Ho Chi Minh", airportCode: "SGN", airportNameKo: "떤선녓", continentId: "southeast-asia" },
  { keyword: "하노이", nameEn: "Hanoi", airportCode: "HAN", airportNameKo: "노이바이", continentId: "southeast-asia" },
  { keyword: "싱가포르", nameEn: "Singapore", airportCode: "SIN", airportNameKo: "창이", continentId: "southeast-asia" },
  { keyword: "세부", nameEn: "Cebu", airportCode: "CEB", airportNameKo: "막탄세부", continentId: "southeast-asia" },
  { keyword: "발리", nameEn: "Bali", airportCode: "DPS", airportNameKo: "응우라라이", continentId: "southeast-asia" },
  { keyword: "나트랑", nameEn: "Nha Trang", airportCode: "CXR", airportNameKo: "깜라인", continentId: "southeast-asia" },
  { keyword: "파리", nameEn: "Paris", airportCode: "CDG", airportNameKo: "샤를드 골", continentId: "europe" },
  { keyword: "런던", nameEn: "London", airportCode: "LHR", airportNameKo: "히드로", continentId: "europe" },
  { keyword: "로마", nameEn: "Rome", airportCode: "FCO", airportNameKo: "피우미치노", continentId: "europe" },
  { keyword: "괌", nameEn: "Guam", airportCode: "GUM", airportNameKo: "괌", continentId: "americas" },
  { keyword: "호놀룰루", nameEn: "Honolulu", airportCode: "HNL", airportNameKo: "호놀룰루", continentId: "americas" },
  { keyword: "뉴욕", nameEn: "New York", airportCode: "JFK", airportNameKo: "존 F. 케네디", continentId: "americas" },
];

async function discoverCity(city: CityCandidate): Promise<DiscoveryResult> {
  const checkIn = "2026-03-15";
  const checkOut = "2026-03-19";

  const params = new URLSearchParams({
    keyword: city.keyword,
    checkIn,
    checkOut,
    adultCount: "2",
    childCount: "0",
    isDomestic: "false",
    mrtKeyName: "",
    selected: "starRating:fourstar",
  });

  const url = `${MRT_BASE_URL}/unionstay/v2/front/search?${params}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://accommodation.myrealtrip.com",
      Referer: "https://accommodation.myrealtrip.com/",
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${city.keyword}`);
  }

  const json = await res.json();

  const filters = json.data?.staticArea?.selectOption?.filterInfo?.filters ?? [];
  const stayPoiFilter = filters.find((f: { key: string }) => f.key === "stayPoi");
  const poiItems: PoiItem[] = (stayPoiFilter?.items ?? [])
    .filter((item: PoiItem) => item.value !== "all")
    .map((item: { value: string; title: string; count: number | null }) => ({
      value: item.value,
      title: item.title,
      count: item.count ?? 0,
    }));

  const topPois = poiItems
    .sort((a: PoiItem, b: PoiItem) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 5);

  const selectedPoi = topPois.length > 0 ? topPois[0] : null;

  const totalCount = json.data?.dynamicArea?.pageMeta?.totalCount ?? 0;

  const regionId = json.data?.staticArea?.staySearchParam?.regionId ?? null;

  return {
    ...city,
    selectedPoi,
    topPois,
    totalHotels: totalCount,
    regionId,
  };
}

async function main() {
  console.log("=== MRT 도시 ID 탐색 시작 ===\n");
  console.log(`대상: ${CITIES.length}개 도시`);
  console.log(`기준: stayPoi 필터에서 숙소 수 최다 지역 = 도심\n`);

  const results: DiscoveryResult[] = [];

  for (const city of CITIES) {
    try {
      const result = await discoverCity(city);
      results.push(result);

      const poi = result.selectedPoi;
      const poiInfo = poi ? `${poi.title} (${poi.value}) — ${poi.count}개` : "POI 없음";
      console.log(`  [${city.keyword}] 4성급 ${result.totalHotels}개 | 도심: ${poiInfo}`);
    } catch (err) {
      console.error(`  [${city.keyword}] 실패:`, err instanceof Error ? err.message : err);
      results.push({
        ...city,
        selectedPoi: null,
        topPois: [],
        totalHotels: 0,
        regionId: null,
      });
    }

    await sleep(DELAY_MS);
  }

  console.log("\n\n=== 탐색 결과 요약 ===\n");
  console.log("| 도시 | 코드 | 4성급 | 도심 지역 | POI ID | 숙소수 | regionId |");
  console.log("|------|------|-------|----------|--------|--------|----------|");

  for (const r of results) {
    const poi = r.selectedPoi;
    console.log(
      `| ${r.keyword.padEnd(6)} | ${r.airportCode} | ${String(r.totalHotels).padStart(5)} | ${(poi?.title ?? "-").padEnd(8)} | ${(poi?.value ?? "-").padEnd(6)} | ${String(poi?.count ?? 0).padStart(6)} | ${String(r.regionId ?? "null").padStart(8)} |`,
    );
  }

  console.log("\n\n=== 도시별 상위 5개 POI 후보 ===\n");
  for (const r of results) {
    console.log(`[${r.keyword}] (${r.nameEn})`);
    if (r.topPois.length === 0) {
      console.log("  POI 데이터 없음");
    } else {
      for (const poi of r.topPois) {
        const marker = poi.value === r.selectedPoi?.value ? " ★" : "";
        console.log(`  ${poi.value.padEnd(8)} ${poi.title.padEnd(12)} ${String(poi.count).padStart(6)}개${marker}`);
      }
    }
    console.log();
  }

  console.log("\n=== cities.ts용 JSON 출력 ===\n");
  const citiesData = results.map((r) => ({
    id: r.nameEn.toLowerCase().replace(/\s+/g, "-"),
    nameKo: r.keyword,
    nameEn: r.nameEn,
    airportCode: r.airportCode,
    airportNameKo: r.airportNameKo,
    regionId: r.regionId ?? 0,
    downtownPoiId: r.selectedPoi?.value ?? "",
    downtownNameKo: r.selectedPoi?.title ?? "",
    continentId: r.continentId,
  }));

  console.log(JSON.stringify(citiesData, null, 2));
}

main().catch(console.error);
