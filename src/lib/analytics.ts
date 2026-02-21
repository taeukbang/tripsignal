declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

export const analytics = {
  cityChange: (cityId: string, cityName: string) =>
    sendEvent("city_change", { city_id: cityId, city_name: cityName }),

  durationChange: (duration: number) =>
    sendEvent("duration_change", { duration }),

  dateSelect: (date: string, price: number, cityId: string) =>
    sendEvent("date_select", {
      departure_date: date,
      per_person_cost: price,
      city_id: cityId,
    }),

  breakdownView: (date: string, cityId: string) =>
    sendEvent("breakdown_view", { departure_date: date, city_id: cityId }),

  deeplinkClick: (type: "flight" | "hotel", cityId: string, date: string) =>
    sendEvent("deeplink_click", {
      link_type: type,
      city_id: cityId,
      departure_date: date,
    }),

  chartInteract: (date: string, price: number) =>
    sendEvent("chart_interact", { departure_date: date, per_person_cost: price }),

  shareClick: (method: string, cityId: string) =>
    sendEvent("share_click", { method, city_id: cityId }),

  priceAlertSet: (cityId: string, date: string, price: number) =>
    sendEvent("price_alert_set", {
      city_id: cityId,
      departure_date: date,
      price,
    }),

  priceAlertRemove: (cityId: string, date: string) =>
    sendEvent("price_alert_remove", { city_id: cityId, departure_date: date }),

  onboardingStep: (step: number) => sendEvent("onboarding_step", { step }),
  onboardingComplete: () => sendEvent("onboarding_complete"),
  onboardingSkip: (step: number) => sendEvent("onboarding_skip", { step }),

  pricingInfoToggle: (open: boolean) =>
    sendEvent("pricing_info_toggle", { open }),
};
