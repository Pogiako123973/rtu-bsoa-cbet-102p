/**
 * Convert a Postgres `time` string ("HH:MM:SS" or "HH:MM") into a friendly
 * 12-hour label like "3:30 PM" or "12:00 PM" (no leading zero, no seconds,
 * no military time). Falls back to the input if the format is unexpected.
 */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(value);
  if (!match) return value;
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) return value;

  // 0 -> "12:XX AM", 1-11 -> "1-11:XX AM", 12 -> "12:XX PM", 13-23 -> "1-11 PM"
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}

/** "3:30 PM – 5:00 PM" with an en-dash. Empty room or missing times are handled. */
export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const a = formatTime(start);
  const b = formatTime(end);
  if (!a && !b) return "";
  if (!b) return a;
  if (!a) return b;
  return `${a} – ${b}`;
}