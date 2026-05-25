import { useMemo, useState } from "react";
import { getRankColor, cn } from "../../utils";

/**
 * ── RankingChart: Biểu đồ đường thể hiện lịch sử xếp hạng series ──
 *
 * Props:
 *   - history   : Mảng lịch sử xếp hạng theo kỳ, mỗi phần tử có { periodLabel, entries: [{ seriesId, seriesTitle, rank }] }
 *   - maxSeries : Số lượng series tối đa hiển thị (mặc định 5)
 *
 * State:
 *   - highlighted: SeriesId đang được hover (làm nổi bật)
 *
 * Kích thước SVG (cố định):
 *   - W = 600, H = 280
 *   - PAD: lề trên 20, phải 16, dưới 32, trái 36
 *
 * Cách hoạt động:
 *   1. Tính toán dữ liệu bằng useMemo: periods (nhãn trục X), lines (đường vẽ), scales (hàm tỉ lệ)
 *   2. Trục X: các kỳ (periods), phân bố đều theo chiều ngang
 *   3. Trục Y: thứ hạng (rank), rank 1 ở trên cùng
 *   4. Mỗi series là một đường gấp khúc nối các điểm rank qua các kỳ
 *   5. Hover → đường và điểm được làm nổi bật (to hơn), các đường khác mờ dần
 *
 * Các trạng thái:
 *   - history không đủ dữ liệu (< 2 kỳ) → thông báo "Not enough history data"
 *   - Có dữ liệu → render SVG chart + legend
 */

const COLORS = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626"];
const W = 600;
const H = 280;
const PAD = { top: 20, right: 16, bottom: 32, left: 36 };

export function RankingChart({ history, maxSeries = 5 }) {
  const [highlighted, setHighlighted] = useState(null);

  // Tính toán dữ liệu biểu đồ (chỉ tính lại khi history hoặc maxSeries thay đổi)
  const { periods, lines, yScale, xScale } = useMemo(() => {
    if (!history || history.length < 2)
      return { periods: [], lines: [], yScale: () => 0, xScale: () => 0 };

    // Nhãn các kỳ (trục X)
    const periods = history.map((h) => h.periodLabel);

    // Lấy danh sách seriesId duy nhất, giới hạn theo maxSeries
    const seriesIds = [
      ...new Set(history.flatMap((h) => h.entries.map((e) => e.seriesId))),
    ].slice(0, maxSeries);

    // Tìm rank cao nhất (số lớn nhất) để xác định miền giá trị trục Y
    const maxRank = Math.max(
      ...history.flatMap((h) => h.entries.map((e) => e.rank)),
      10,
    );
    const minRank = 0;

    // Hàm tỉ lệ: chuyển rank → toạ độ Y (rank 1 ở gần đỉnh)
    const yScale = (rank) =>
      PAD.top + ((rank - 1) / (maxRank - 1)) * (H - PAD.top - PAD.bottom);

    // Hàm tỉ lệ: chuyển index kỳ → toạ độ X
    const xScale = (i) =>
      PAD.left + (i / (periods.length - 1)) * (W - PAD.left - PAD.right);

    // Tạo đường cho mỗi series
    const lines = seriesIds.map((sid, idx) => {
      // Lấy điểm dữ liệu qua các kỳ
      const points = periods.map((_, pi) => {
        const entry = history[pi].entries.find((e) => e.seriesId === sid);
        return entry ? { x: xScale(pi), y: yScale(entry.rank) } : null;
      });

      // Lấy thông tin series từ kỳ gần nhất
      const entry = history[history.length - 1]?.entries.find(
        (e) => e.seriesId === sid,
      );

      return {
        seriesId: sid,
        seriesTitle: entry?.seriesTitle || `Series #${sid}`,
        color: COLORS[idx % COLORS.length],
        points,
        // Tạo path SVG từ các điểm (M = move, L = line)
        path: points
          .filter(Boolean)
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          )
          .join(" "),
      };
    });

    return { periods, lines, yScale, xScale };
  }, [history, maxSeries]);

  // Trạng thái không đủ dữ liệu
  if (lines.length === 0) {
    return (
      <div className="text-xs text-on-surface-variant/50 italic text-center py-8">
        Not enough history data to display a chart.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[600px]"
        style={{ minHeight: H }}
      >
        {/* Trục X: nhãn các kỳ */}
        {periods.map((label, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={H - 4}
            textAnchor="middle"
            className="fill-on-surface-variant/40 text-[9px]"
          >
            {label}
          </text>
        ))}

        {/* Trục Y: các mốc rank + đường kẻ ngang */}
        {[1, 3, 5, 10]
          .filter(
            (r) =>
              r <=
              Math.max(
                ...history.flatMap((h) => h.entries.map((e) => e.rank)),
                10,
              ),
          )
          .map((r) => (
            <g key={r}>
              <text
                x={PAD.left - 6}
                y={yScale(r) + 3}
                textAnchor="end"
                className="fill-on-surface-variant/30 text-[9px]"
              >
                #{r}
              </text>
              <line
                x1={PAD.left}
                y1={yScale(r)}
                x2={W - PAD.right}
                y2={yScale(r)}
                className="stroke-black/[0.04]"
                strokeDasharray="3 3"
              />
            </g>
          ))}

        {/* Các đường dữ liệu series */}
        {lines.map((line) => (
          <g
            key={line.seriesId}
            onMouseEnter={() => setHighlighted(line.seriesId)}
            onMouseLeave={() => setHighlighted(null)}
            className="cursor-pointer"
          >
            {/* Đường gấp khúc */}
            <path
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={highlighted === line.seriesId ? 2.5 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="transition-all"
            />
            {/* Các điểm dữ liệu trên đường */}
            {line.points.filter(Boolean).map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={highlighted === line.seriesId ? 4 : 2.5}
                fill={line.color}
                stroke="white"
                strokeWidth={1.5}
                className="transition-all"
              />
            ))}
          </g>
        ))}
      </svg>

      {/* Legend: danh sách series bên dưới biểu đồ */}
      <div className="flex flex-wrap gap-3 mt-2">
        {lines.map((line) => (
          <button
            key={line.seriesId}
            onMouseEnter={() => setHighlighted(line.seriesId)}
            onMouseLeave={() => setHighlighted(null)}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-opacity",
              // Làm mờ các series không được highlight
              highlighted && highlighted !== line.seriesId
                ? "opacity-40"
                : "opacity-100",
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: line.color }}
            />
            <span className="text-on-surface-variant/70">
              {line.seriesTitle}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
