import "dotenv/config";
import { requireEnv } from "../lib/utils";

async function run(scriptName: string) {
  const { execSync } = await import("child_process");
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[collect-all] ${scriptName} 실행 중...`);
  console.log("=".repeat(60));

  execSync(`npx tsx src/scripts/${scriptName}`, {
    stdio: "inherit",
    env: process.env,
  });
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const startTime = Date.now();
  console.log("[collect-all] 전체 수집 시작");

  await run("collect-flights.ts");
  await run("collect-hotels.ts");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[collect-all] 전체 수집 완료 — 소요: ${elapsed}초`);
}

main().catch(console.error);
