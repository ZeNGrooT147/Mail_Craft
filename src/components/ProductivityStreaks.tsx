import { useMemo } from "react";
import { Flame, Calendar, Trophy } from "lucide-react";
import { startOfDay, subDays, differenceInCalendarDays } from "date-fns";

interface ProductivityStreaksProps {
  eventDates: string[]; // ISO date strings
}

const ProductivityStreaks = ({ eventDates }: ProductivityStreaksProps) => {
  const { currentStreak, longestStreak, activeDays } = useMemo(() => {
    if (eventDates.length === 0) return { currentStreak: 0, longestStreak: 0, activeDays: 0 };

    const uniqueDays = new Set(
      eventDates.map((d) => startOfDay(new Date(d)).toISOString())
    );
    const activeDays = uniqueDays.size;

    const sortedDays = Array.from(uniqueDays)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    // Current streak
    let currentStreak = 0;
    const today = startOfDay(new Date());
    for (let i = 0; i < sortedDays.length; i++) {
      const expected = startOfDay(subDays(today, i));
      if (differenceInCalendarDays(sortedDays[i], expected) === 0) {
        currentStreak++;
      } else if (i === 0 && differenceInCalendarDays(expected, sortedDays[0]) === 1) {
        // Allow yesterday as start
        const expectedYesterday = startOfDay(subDays(today, 1));
        if (differenceInCalendarDays(sortedDays[0], expectedYesterday) === 0) {
          currentStreak = 1;
          continue;
        }
        break;
      } else {
        break;
      }
    }

    // Longest streak
    let longest = 1;
    let current = 1;
    const ascending = [...sortedDays].reverse();
    for (let i = 1; i < ascending.length; i++) {
      if (differenceInCalendarDays(ascending[i], ascending[i - 1]) === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }

    return { currentStreak, longestStreak: Math.max(longest, currentStreak), activeDays };
  }, [eventDates]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
        <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl ${currentStreak > 0 ? "bg-orange-500/10" : "bg-secondary"} flex items-center justify-center mx-auto mb-2`}>
          <Flame className={`h-4 w-4 ${currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        </div>
        <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{currentStreak}</div>
        <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Day Streak 🔥</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
          <Trophy className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{longestStreak}</div>
        <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Best Streak</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center hover:border-primary/20 hover:shadow-md transition-all duration-200">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div className="text-xl sm:text-2xl font-display font-bold text-foreground">{activeDays}</div>
        <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Active Days</div>
      </div>
    </div>
  );
};

export default ProductivityStreaks;
