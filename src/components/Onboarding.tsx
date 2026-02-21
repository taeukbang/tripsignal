"use client";

import { useState, useEffect } from "react";
import { analytics } from "@/lib/analytics";

const STORAGE_KEY = "tsj_onboarding_done";

const STEPS = [
  {
    icon: "🌏",
    title: "여행지를 선택하세요",
    description: "대륙별로 필터하거나, 도시를 직접 선택할 수 있어요",
  },
  {
    icon: "📅",
    title: "여정 길이를 조절해보세요",
    description: "3~7일 슬라이더를 움직이면 비용이 즉시 바뀌어요",
  },
  {
    icon: "💰",
    title: "날짜를 눌러 상세 비용 확인",
    description:
      "캘린더에서 날짜를 누르면 항공/숙소 상세 비용과\n예약 링크를 확인할 수 있어요",
  },
];

export function Onboarding() {
  const [step, setStep] = useState(-1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => {
        setStep(0);
        setVisible(true);
        analytics.onboardingStep(0);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      analytics.onboardingStep(next);
    } else {
      analytics.onboardingComplete();
      complete();
    }
  };

  const handleSkip = () => {
    analytics.onboardingSkip(step);
    complete();
  };

  if (!visible || step < 0) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={handleSkip}
      />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-5 animate-slide-up">
          <div className="text-center mb-3">
            <span className="text-2xl">{current.icon}</span>
          </div>
          <h4 className="text-sm font-bold text-gray-900 text-center mb-1.5">
            {current.title}
          </h4>
          <p className="text-xs text-gray-500 text-center whitespace-pre-line leading-relaxed mb-4">
            {current.description}
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-500 px-2 py-1"
            >
              건너뛰기
            </button>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === step ? "bg-blue-600 w-4" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                {step < STEPS.length - 1 ? "다음" : "시작하기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
