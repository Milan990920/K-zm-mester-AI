"use client";

import { useState } from "react";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  valuesByMonth: Record<string, number>;
}

interface MonthlyBarChartProps {
  months: string[];
  series: ChartSeries[];
  valueFormatter: (value: number) => string;
  emptyLabel: string;
}

const CHART_HEIGHT = 200;
const CHART_PADDING_LEFT = 8;
const CHART_PADDING_BOTTOM = 24;
const TICK_COUNT = 4;

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  const shortMonths = [
    "jan",
    "feb",
    "márc",
    "ápr",
    "máj",
    "jún",
    "júl",
    "aug",
    "szept",
    "okt",
    "nov",
    "dec",
  ];
  return `${shortMonths[Number(monthNumber) - 1]} ${year.slice(2)}`;
}

export function MonthlyBarChart({
  months,
  series,
  valueFormatter,
  emptyLabel,
}: MonthlyBarChartProps) {
  const [hovered, setHovered] = useState<{ month: string; seriesKey: string } | null>(null);

  const hasData = series.some((s) => Object.values(s.valuesByMonth).some((v) => v > 0));
  if (!hasData) {
    return <p className="text-sm text-faint">{emptyLabel}</p>;
  }

  const maxValue = Math.max(
    1,
    ...months.flatMap((month) => series.map((s) => s.valuesByMonth[month] ?? 0)),
  );
  const plotHeight = CHART_HEIGHT - CHART_PADDING_BOTTOM;
  const groupWidth = 100 / months.length;
  const barWidth = Math.min(14, (groupWidth * 0.7) / series.length);

  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (maxValue / TICK_COUNT) * i);

  return (
    <div className="relative">
      <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="w-full">
        {ticks.map((tick) => {
          const y = CHART_PADDING_LEFT + plotHeight - (tick / maxValue) * plotHeight;
          return (
            <line
              key={tick}
              x1={0}
              x2={100}
              y1={y}
              y2={y}
              stroke="var(--card-border)"
              strokeWidth={0.3}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {months.map((month, monthIndex) => {
          const groupStart = monthIndex * groupWidth;
          const groupCenter = groupStart + groupWidth / 2;
          const seriesTotalWidth = barWidth * series.length;

          return (
            <g key={month}>
              {series.map((s, seriesIndex) => {
                const value = s.valuesByMonth[month] ?? 0;
                const barHeight = (value / maxValue) * plotHeight;
                const x = groupCenter - seriesTotalWidth / 2 + seriesIndex * barWidth;
                const y = CHART_PADDING_LEFT + plotHeight - barHeight;
                const isHovered = hovered?.month === month && hovered?.seriesKey === s.key;

                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barWidth - 1}
                    height={Math.max(barHeight, value > 0 ? 1 : 0)}
                    rx={1.5}
                    fill={s.color}
                    opacity={isHovered ? 1 : 0.9}
                    onMouseEnter={() => setHovered({ month, seriesKey: s.key })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>
                      {formatMonthLabel(month)} — {s.label}: {valueFormatter(value)}
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-faint">
        {months.map((month, index) => (
          <span key={month} className={index % 2 === 1 && months.length > 8 ? "invisible" : ""}>
            {formatMonthLabel(month)}
          </span>
        ))}
      </div>

      {series.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
