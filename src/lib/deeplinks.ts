import type { City } from "@/types";
import { ADULTS_COUNT } from "@/types";

const MRT_FLIGHT_KSESID = "air:b2c:SELK138RB:SELK138RB::00";

export function buildFlightUrl(city: City, departureDate: string, returnDate: string): string {
  const dep = encodeURIComponent("인천");
  const arr = encodeURIComponent(city.airportNameKo);
  const code = city.airportCode;

  const params = new URLSearchParams();
  params.set("initform", "RT");
  params.set("domintgubun", "I");
  params.set("depdomintgbn", "I");
  params.set("tasktype", "B2C");
  params.set("servicecacheyn", "Y");
  params.set("adtcount", String(ADULTS_COUNT));
  params.set("chdcount", "0");
  params.set("infcount", "0");
  params.set("cabinclass", "Y");
  params.set("cabinsepflag", "Y");
  params.set("secrchType", "FARE");
  params.set("nonstop", "Y");
  params.set("availcount", "250");
  params.set("KSESID", MRT_FLIGHT_KSESID);

  const base = "https://flights.myrealtrip.com/air/b2c/AIR/INT/AIRINTSCH0100100010.k1";
  const multi = [
    `depctycd=ICN&depctycd=${code}&depctycd=&depctycd=`,
    `depctynm=${dep}&depctynm=${arr}&depctynm=&depctynm=`,
    `arrctycd=${code}&arrctycd=ICN&arrctycd=&arrctycd=`,
    `arrctynm=${arr}&arrctynm=${dep}&arrctynm=&arrctynm=`,
    `depdt=${departureDate}&depdt=${returnDate}&depdt=&depdt=`,
    `opencase=N&opencase=N&opencase=N&openday=&openday=&openday=`,
  ].join("&");

  return `${base}?${multi}&${params.toString()}`;
}

export function buildHotelUrl(city: City, checkIn: string, checkOut: string): string {
  const params = new URLSearchParams({
    checkIn,
    checkOut,
    adultCount: String(ADULTS_COUNT),
    childCount: "0",
    childAges: "",
    regionId: String(city.regionId),
    keyword: city.nameKo,
    roomCount: "1",
    isDomestic: "false",
    mrtKeyName: "",
  });
  return `https://accommodation.myrealtrip.com/union/products?${params.toString()}`;
}
