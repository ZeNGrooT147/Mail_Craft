import { useMemo } from "react";

interface PeakHoursHeatmapProps {
  eventDates: string[];
}

const DAYS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const PeakHoursHeatmap = ({ eventDates }: PeakHoursHeatmapProps) => {
  const { grid, maxCount } = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    eventDates.forEach((d) => {
      const date = new Date(d);
      const day = (date.getDay() + 6) % 7;
      const hour = date.getHours();
      grid[day][hour]++;
    });
    const maxCount = Math.max(1, ...grid.flat());
    return { grid, maxCount };
  }, [eventDates]);

  const getOpacity = (count: number) => {
    if (count === 0) return 0;
    return 0.15 + (count / maxCount) * 0.85;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Peak Activity Hours</h3>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[320px]">
          {/* Hour labels */}
          <div className="flex ml-6 sm:ml-10 mb-1">
            {HOURS.filter((h) => h % 4 === 0).map((h) => (
              <div
                key={h}
                className="text-[8px] sm:text-[9px] text-muted-foreground"
                style={{ width: `${(4 / 24) * 100}%` }}
              >
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </div>
            ))}
          </div>
          {/* Grid */}
          {DAYS_FULL.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-0.5 sm:gap-1 mb-[2px]">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground w-5 sm:w-9 text-right shrink-0">
                <span className="hidden sm:inline">{DAYS_FULL[dayIdx]}</span>
                <span className="sm:hidden">{DAYS_SHORT[dayIdx]}</span>
              </span>
              <div className="flex flex-1 gap-[1px]">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 h-3 sm:h-4 rounded-[2px] transition-colors"
                    style={{
                      backgroundColor: grid[dayIdx][hour] === 0
                        ? "hsl(var(--secondary))"
                        : `hsl(var(--primary) / ${getOpacity(grid[dayIdx][hour])})`,
                    }}
                    title={`${day} ${hour}:00 — ${grid[dayIdx][hour]} events`}
                  />
                ))}
              </div>
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 justify-end">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((opacity, i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-[2px]"
                style={{
                  backgroundColor: opacity === 0
                    ? "hsl(var(--secondary))"
                    : `hsl(var(--primary) / ${0.15 + opacity * 0.85})`,
                }}
              />
            ))}
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeakHoursHeatmap;
