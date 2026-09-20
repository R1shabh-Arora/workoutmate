const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 0 (Sunday) .. 6 (Saturday) "today" as seen in the given IANA timezone. Falls back to server-local time if the timezone string is invalid. */
export function getDayOfWeekInTimezone(timezone: string, date: Date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(date);
    return WEEKDAY_INDEX[formatted] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

/** YYYY-MM-DD as seen in the given IANA timezone. */
export function getDateStringInTimezone(timezone: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
  } catch {
    return date.toISOString().split("T")[0]!;
  }
}

/** Start of the current week (Sunday 00:00) as an ISO string, for filtering "this week" queries. */
export function getStartOfWeekIso(timezone: string, date: Date = new Date()): string {
  const dow = getDayOfWeekInTimezone(timezone, date);
  const start = new Date(date);
  start.setDate(start.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}
