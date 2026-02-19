import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My TripSignal — 출발일별 총 여행 비용을 한눈에",
  description:
    "향후 3개월간 출발일별 총 여행 비용(왕복 항공 + 숙소)을 캘린더 히트맵으로 보여주고, 최적 출발일을 탐색할 수 있는 서비스",
  keywords: [
    "여행 최저가",
    "출발일별 여행 비용",
    "항공권 최저가",
    "숙소 최저가",
    "여행 캘린더",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  openGraph: {
    title: "My TripSignal — 출발일별 총 여행 비용을 한눈에",
    description:
      "3개월 캘린더 히트맵으로 최적의 여행 출발일을 찾아보세요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
