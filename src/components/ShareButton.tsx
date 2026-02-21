"use client";

import { useState } from "react";
import type { City, Duration } from "@/types";
import { analytics } from "@/lib/analytics";

interface ShareButtonProps {
  city: City;
  duration: Duration;
  selectedDate?: string | null;
}

export function ShareButton({ city, duration, selectedDate }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const buildShareUrl = () => {
    const url = new URL(window.location.origin);
    url.searchParams.set("city", city.id);
    url.searchParams.set("duration", String(duration));
    if (selectedDate) url.searchParams.set("date", selectedDate);
    return url.toString();
  };

  const shareText = selectedDate
    ? `${city.nameKo} ${duration}일 여행 최저가를 확인해보세요!`
    : `${city.nameKo} 여행 비용을 한눈에 확인해보세요!`;

  const handleShare = async () => {
    const url = buildShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title: "MyTripSignal", text: shareText, url });
        analytics.shareClick("native_share", city.id);
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      analytics.shareClick("clipboard", city.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
      title="공유하기"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
      {copied ? "복사됨!" : "공유"}
    </button>
  );
}
