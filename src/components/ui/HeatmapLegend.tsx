export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 justify-center mt-4 mb-1">
      <span className="text-[10px] text-gray-400">저렴</span>
      <div className="flex h-2 rounded-full overflow-hidden w-32">
        <div className="flex-1 bg-blue-400" />
        <div className="flex-1 bg-blue-100" />
        <div className="flex-1 bg-gray-100" />
        <div className="flex-1 bg-orange-100" />
        <div className="flex-1 bg-red-100" />
      </div>
      <span className="text-[10px] text-gray-400">비쌈</span>
    </div>
  );
}
