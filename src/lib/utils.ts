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
  // 한국 항공사
  KE: "대한항공",
  OZ: "아시아나항공",
  "7C": "제주항공",
  LJ: "진에어",
  TW: "티웨이항공",
  BX: "에어부산",
  ZE: "이스타항공",
  RS: "에어서울",
  // 일본
  NH: "전일본공수(ANA)",
  JL: "일본항공(JAL)",
  MM: "피치항공",
  IJ: "스프링재팬",
  // 동남아시아
  SQ: "싱가포르항공",
  TR: "스쿠트",
  TG: "타이항공",
  WE: "타이스마일",
  SL: "타이라이온에어",
  FD: "타이에어아시아",
  VZ: "타이비엣젯",
  VN: "베트남항공",
  VJ: "비엣젯",
  PR: "필리핀항공",
  "5J": "세부퍼시픽",
  GA: "가루다인도네시아",
  ID: "바틱에어",
  // 동아시아
  CI: "중화항공",
  BR: "에바항공",
  IT: "타이거에어대만",
  CX: "캐세이퍼시픽",
  HX: "홍콩항공",
  UO: "홍콩익스프레스",
  // 중국
  CA: "중국국제항공",
  MU: "중국동방항공",
  CZ: "중국남방항공",
  HU: "하이난항공",
  "9C": "스프링항공",
  SC: "산둥항공",
  // 말레이시아
  MH: "말레이시아항공",
  AK: "에어아시아",
  D7: "에어아시아X",
  // 유럽
  AF: "에어프랑스",
  BA: "브리티시항공",
  AZ: "ITA항공",
  LH: "루프트한자",
  TK: "터키항공",
  KL: "KLM네덜란드항공",
  IB: "이베리아항공",
  VY: "부엘링항공",
  // 미주
  DL: "델타항공",
  UA: "유나이티드항공",
  AA: "아메리칸항공",
  HA: "하와이안항공",
  // 대양주
  QF: "콴타스항공",
  // 중동/아프리카
  QR: "카타르항공",
  EK: "에미레이트항공",
  EY: "에티하드항공",
  ET: "에티오피아항공",
};

export function getAirlineName(code: string): string {
  return AIRLINE_NAMES[code] ?? code;
}
