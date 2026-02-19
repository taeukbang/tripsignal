export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatPrice(price: number): string {
  return `${Math.round(price / 10000)}만`;
}

export function formatPriceWon(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function getDayOfWeek(dateStr: string): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const d = new Date(dateStr);
  return days[d.getDay()];
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${getDayOfWeek(dateStr)})`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const AIRLINE_NAMES: Record<string, string> = {
  KE: "대한항공",
  OZ: "아시아나항공",
  "7C": "제주항공",
  LJ: "진에어",
  TW: "티웨이항공",
  BX: "에어부산",
  ZE: "이스타항공",
  RS: "에어서울",
  SQ: "싱가포르항공",
  TG: "타이항공",
  NH: "전일본공수(ANA)",
  JL: "일본항공(JAL)",
  CX: "캐세이퍼시픽",
  AF: "에어프랑스",
  VN: "베트남항공",
  SL: "타이라이온에어",
  FD: "타이에어아시아",
  QR: "카타르항공",
  EK: "에미레이트항공",
  EY: "에티하드항공",
  MM: "피치항공",
};

export function getAirlineName(code: string): string {
  return AIRLINE_NAMES[code] ?? code;
}
