import "dotenv/config";
import { createServiceClient } from "../lib/supabase";
import { fetchHotelSearch } from "../lib/mrt-api";
import { sleep, formatDate, addDays, requireEnv } from "../lib/utils";
import { CITIES } from "../data/cities";
import { DURATIONS } from "../types";
import { DEFAULT_DURATION } from "../types";

const COLLECTION_INTERVAL_DAYS = 3;
const COLLECTION_PERIOD_DAYS = 90;
const DELAY_BETWEEN_CALLS_MS = 800;
const NIGHTS = DEFAULT_DURATION - 1;

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createServiceClient();
  const today = formatDate(new Date());

  console.log(`[collect-hotels] 시작 — ${today}`);
  console.log(`[collect-hotels] 대상 도시: ${CITIES.map((c) => c.nameKo).join(", ")}`);
  console.log(`[collect-hotels] 수집 간격: ${COLLECTION_INTERVAL_DAYS}일, 기간: ${COLLECTION_PERIOD_DAYS}일`);
  console.log(`[collect-hotels] 숙박 기준: ${NIGHTS}박 (${DEFAULT_DURATION}일 여정) — 실제 체류 기간으로 검색`);

  let totalSaved = 0;
  let totalFail = 0;
  let totalCalls = 0;
  const startTime = Date.now();

  for (const city of CITIES) {
    console.log(`\n[${city.nameKo}] 숙소 가격 수집 시작 (regionId: ${city.regionId})`);
    const rows: Array<{
      city_id: string;
      check_in_date: string;
      duration: number;
      min_price_per_night: number;
      hotel_name: string | null;
      hotel_count: number;
      collected_at: string;
    }> = [];

    for (let dayOffset = 1; dayOffset < COLLECTION_PERIOD_DAYS; dayOffset += COLLECTION_INTERVAL_DAYS) {
      const checkIn = addDays(today, dayOffset);
      const checkOut = addDays(checkIn, NIGHTS);
      totalCalls++;

      try {
        const hotels = await fetchHotelSearch(
          city.regionId,
          city.nameKo,
          checkIn,
          checkOut,
          city.downtownPoiId,
        );

        if (hotels.length === 0) {
          console.warn(`  [${checkIn}] 데이터 없음`);
          continue;
        }

        const cheapest = hotels.reduce((min, h) =>
          h.salePrice < min.salePrice ? h : min,
        );

        for (const duration of DURATIONS) {
          rows.push({
            city_id: city.id,
            check_in_date: checkIn,
            duration,
            min_price_per_night: cheapest.salePrice,
            hotel_name: cheapest.name || null,
            hotel_count: hotels.length,
            collected_at: new Date().toISOString(),
          });
        }

        if (dayOffset === 1) {
          console.log(`  첫 데이터: ${checkIn} ${cheapest.name} ${cheapest.salePrice.toLocaleString()}원/박 (세금포함)`);
        }
      } catch (err) {
        console.warn(`  [${checkIn}] 실패:`, err instanceof Error ? err.message : err);
        totalFail++;
      }

      await sleep(DELAY_BETWEEN_CALLS_MS);
    }

    if (rows.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from("hotel_prices")
          .upsert(chunk, { onConflict: "city_id,check_in_date,duration" });

        if (error) {
          console.error(`  [${city.nameKo}] Supabase upsert 실패:`, error.message);
          totalFail++;
        } else {
          totalSaved += chunk.length;
        }
      }
      console.log(`  [${city.nameKo}] ${rows.length}건 저장 (${rows.length / 5}일 x 5여정)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[collect-hotels] 완료 — 저장: ${totalSaved}건, 실패: ${totalFail}, API호출: ${totalCalls}회, 소요: ${elapsed}초`);
}

main().catch(console.error);
