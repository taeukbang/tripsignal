import "dotenv/config";
import { createServiceClient } from "../lib/supabase";
import { fetchFlightWindow } from "../lib/mrt-api";
import { sleep, formatDate, requireEnv } from "../lib/utils";
import { CITIES } from "../data/cities";
import { DURATIONS } from "../types";

const DELAY_BETWEEN_CALLS_MS = 500;

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createServiceClient();
  const today = formatDate(new Date());

  console.log(`[collect-flights] 시작 — ${today}`);
  console.log(`[collect-flights] 대상 도시: ${CITIES.map((c) => c.nameKo).join(", ")}`);
  console.log(`[collect-flights] 엔드포인트: /calendar/window (직항, transfer=0)`);
  console.log(`[collect-flights] 여정: ${DURATIONS.join(",")}일 × 전체 period`);

  let totalSaved = 0;
  let totalFail = 0;
  const startTime = Date.now();

  for (const city of CITIES) {
    console.log(`\n[${city.nameKo}] 수집 중... (ICN → ${city.airportCode})`);

    for (const period of DURATIONS) {
      try {
        const items = await fetchFlightWindow("ICN", city.airportCode, today, period);
        console.log(`  period=${period}: ${items.length}일`);

        if (items.length === 0) continue;

        const rows = items.map((item) => ({
          city_id: city.id,
          departure_date: item.departureDate,
          duration: period,
          price: item.price,
          airline_code: item.airlineCode || null,
          airline_name: null,
          collected_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("flight_prices")
          .upsert(rows, { onConflict: "city_id,departure_date,duration" });

        if (error) {
          console.error(`  upsert 실패:`, error.message);
          totalFail++;
        } else {
          totalSaved += rows.length;
        }
      } catch (err) {
        console.error(`  period=${period} 실패:`, err instanceof Error ? err.message : err);
        totalFail++;
      }

      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[collect-flights] 완료 — 저장: ${totalSaved}건, 실패: ${totalFail}, 소요: ${elapsed}초`);
}

main().catch(console.error);
