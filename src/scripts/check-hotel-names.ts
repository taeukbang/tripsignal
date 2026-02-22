import "dotenv/config";
import { createServiceClient } from "../lib/supabase";

async function main() {
  const supabase = createServiceClient();

  const cities = ["singapore", "tokyo"];

  for (const cityId of cities) {
    const { data } = await supabase
      .from("hotel_prices")
      .select("check_in_date, duration, min_price_per_night, hotel_name")
      .eq("city_id", cityId)
      .eq("duration", 5)
      .gte("check_in_date", "2026-05-15")
      .lte("check_in_date", "2026-05-22")
      .order("check_in_date");

    console.log(`\n=== ${cityId} (5/15~5/22, dur=5) ===`);
    for (const r of data ?? []) {
      console.log(`  ${r.check_in_date} | ${r.min_price_per_night}원 | ${r.hotel_name}`);
    }
  }

  console.log("\n=== 신주쿠가 포함된 호텔 전체 검색 ===");
  const { data: shinjuku } = await supabase
    .from("hotel_prices")
    .select("city_id, check_in_date, hotel_name, min_price_per_night")
    .like("hotel_name", "%신주쿠%")
    .limit(10);

  for (const r of shinjuku ?? []) {
    console.log(`  ${r.city_id} | ${r.check_in_date} | ${r.min_price_per_night}원 | ${r.hotel_name}`);
  }
}

main().catch(console.error);
